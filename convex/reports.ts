import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

async function assertAdmin(ctx: any, adminUserId: any) {
  if (!adminUserId) return null;
  const user = await ctx.db.get(adminUserId);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export const submitReport = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    eventTitle: v.string(),
    reason: v.union(
      v.literal('fake_event'),
      v.literal('venue_mismatch'),
      v.literal('scalping'),
      v.literal('inappropriate'),
      v.literal('cancelled'),
      v.literal('other')
    ),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Please sign in to submit a trust report.');
    if (!user.emailVerified) {
      throw new Error('Please verify your email address before filing a compliance report.');
    }

    const cleanDetails = args.details.trim();
    if (!cleanDetails) {
      throw new Error('Please describe the issue so Compliance can investigate.');
    }

    const reportId = await ctx.db.insert('event_reports', {
      eventId: args.eventId,
      eventTitle: args.eventTitle,
      reporterName: user.name,
      reporterEmail: user.email,
      reason: args.reason,
      details: cleanDetails,
      status: 'pending',
      createdAt: Date.now(),
    });

    const event = await ctx.db.get(args.eventId);
    if (event) {
      const currentReports = (event.reportCount ?? 0) + 1;
      await ctx.db.patch(args.eventId, { reportCount: currentReports });

      if (currentReports >= 3 && event.verificationStatus !== 'Event Suspended') {
        await ctx.db.patch(args.eventId, {
          verificationStatus: 'Unverified',
        });
      }
    }

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'EVENT_REPORTED',
      targetEntity: 'events',
      targetId: args.eventId,
      details: `Report submitted for reason: ${args.reason}. Details: ${cleanDetails.slice(0, 120)}`,
      timestamp: Date.now(),
    });

    return { success: true, reportId };
  },
});

export const getReports = query({
  args: {
    adminUserId: v.optional(v.id('users')),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) return [];

    let reports = await ctx.db.query('event_reports').collect();
    if (args.status && args.status !== 'all') {
      reports = reports.filter((r) => r.status === args.status);
    }

    const populated = await Promise.all(
      reports.map(async (rep) => {
        const event = await ctx.db.get(rep.eventId);
        const organizer = event ? await ctx.db.get(event.organizerId) : null;
        return {
          ...rep,
          organizer: organizer
            ? {
                _id: organizer._id,
                businessName: organizer.businessName,
                contactEmail: organizer.contactEmail,
                contactPhone: organizer.contactPhone,
                nin: organizer.nin ?? '',
                cacNumber: organizer.cacNumber ?? '',
              }
            : null,
        };
      })
    );

    return populated.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const resolveReport = mutation({
  args: {
    adminUserId: v.id('users'),
    reportId: v.id('event_reports'),
    status: v.union(v.literal('reviewed'), v.literal('dismissed'), v.literal('action_taken')),
    actionTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) throw new Error('Admin privileges required.');

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error('Report not found');

    await ctx.db.patch(args.reportId, {
      status: args.status,
      actionTaken: args.actionTaken,
      reviewedBy: admin.name,
      reviewedAt: Date.now(),
    });

    if (args.actionTaken === 'suspend_event') {
      await ctx.db.patch(report.eventId, {
        verificationStatus: 'Event Suspended',
        status: 'cancelled',
      });
    }

    await ctx.db.insert('audit_logs', {
      actorName: admin.name,
      actorRole: 'admin',
      actorId: admin._id,
      action: 'RESOLVE_REPORT',
      targetEntity: 'event_reports',
      targetId: args.reportId,
      details: `Resolved report for "${report.eventTitle}" -> ${args.status} (${args.actionTaken || 'No suspension'})`,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const submitRating = mutation({
  args: {
    eventId: v.id('events'),
    userId: v.id('users'),
    rating: v.number(),
    tags: v.array(v.string()),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Sign in to rate an event.');
    if (!user.emailVerified) {
      throw new Error('Verify your email address before posting a rating.');
    }

    if (args.rating < 1 || args.rating > 5) {
      throw new Error('Rating must be between 1 and 5.');
    }

    const ownedTicket = await ctx.db
      .query('tickets')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first();

    const ticketVerified = Boolean(ownedTicket);

    const existingRatings = await ctx.db
      .query('event_ratings')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .collect();

    const myExisting = existingRatings.find(
      (r) => r.userId && String(r.userId) === String(user._id)
    );

    if (myExisting) {
      await ctx.db.patch(myExisting._id, {
        userName: user.name,
        rating: args.rating,
        tags: args.tags,
        review: args.review?.trim() || undefined,
        ticketVerified,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert('event_ratings', {
        eventId: args.eventId,
        userId: user._id,
        userName: user.name,
        rating: args.rating,
        tags: args.tags,
        review: args.review?.trim() || undefined,
        ticketVerified,
        createdAt: Date.now(),
      });
    }

    const allRatings = await ctx.db
      .query('event_ratings')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .collect();

    const totalScore = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalScore / allRatings.length).toFixed(1));

    await ctx.db.patch(args.eventId, {
      rating: avgRating,
      reviewCount: allRatings.length,
    });

    return { success: true, avgRating, count: allRatings.length, ticketVerified };
  },
});

export const getEventRatings = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('event_ratings')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .collect();

    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = ratings.length > 0 ? Number((total / ratings.length).toFixed(1)) : 0;

    const tagCounts: Record<string, number> = {};
    for (const r of ratings) {
      for (const tag of r.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }

    return {
      average,
      count: ratings.length,
      tagCounts,
      ratings: ratings.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const flagAndBlacklistOrganizer = mutation({
  args: {
    adminUserId: v.id('users'),
    organizerName: v.string(),
    email: v.string(),
    phone: v.string(),
    nin: v.string(),
    cacNumber: v.optional(v.string()),
    reason: v.string(),
    eventId: v.optional(v.string()),
    eventTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) throw new Error('Admin privileges required.');

    const cleanEmail = args.email.trim().toLowerCase();
    const cleanPhone = args.phone.trim();
    const cleanNin = args.nin.trim().toUpperCase();

    const blacklistId = await ctx.db.insert('blacklisted_identities', {
      organizerName: args.organizerName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      nin: cleanNin,
      cacNumber: args.cacNumber?.trim(),
      reason: args.reason.trim(),
      eventId: args.eventId,
      eventTitle: args.eventTitle,
      flaggedBy: admin.name,
      status: 'active_blacklist',
      createdAt: Date.now(),
    });

    if (args.eventId) {
      try {
        await ctx.db.patch(args.eventId as any, {
          verificationStatus: 'Event Suspended',
          status: 'cancelled',
        });
      } catch {
        // Ignore if non-Convex ID
      }
    }

    const orgs = await ctx.db.query('organizers').collect();
    for (const org of orgs) {
      if (
        (cleanEmail && org.contactEmail.toLowerCase() === cleanEmail) ||
        (cleanPhone && org.contactPhone === cleanPhone) ||
        (cleanNin && org.nin?.toUpperCase() === cleanNin) ||
        (args.cacNumber && org.cacNumber === args.cacNumber)
      ) {
        await ctx.db.patch(org._id, {
          status: 'restricted',
          riskScore: 100,
        });
      }
    }

    await ctx.db.insert('audit_logs', {
      actorName: admin.name,
      actorRole: 'admin',
      actorId: admin._id,
      action: 'ORGANIZER_BLACKLISTED',
      targetEntity: 'blacklisted_identities',
      targetId: blacklistId,
      details: `Blacklisted "${args.organizerName}" (${cleanEmail} / ${cleanPhone} / NIN ${cleanNin}). Reason: ${args.reason}`,
      timestamp: Date.now(),
    });

    return { success: true, blacklistId };
  },
});

export const getBlacklistedIdentities = query({
  args: { adminUserId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) return [];

    const list = await ctx.db.query('blacklisted_identities').collect();
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const pardonBlacklistedIdentity = mutation({
  args: {
    adminUserId: v.id('users'),
    blacklistId: v.id('blacklisted_identities'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) throw new Error('Admin privileges required.');

    const record = await ctx.db.get(args.blacklistId);
    if (!record) throw new Error('Blacklist record not found');

    await ctx.db.patch(args.blacklistId, {
      status: 'pardoned',
    });

    await ctx.db.insert('audit_logs', {
      actorName: admin.name,
      actorRole: 'admin',
      actorId: admin._id,
      action: 'ORGANIZER_PARDONED',
      targetEntity: 'blacklisted_identities',
      targetId: args.blacklistId,
      details: `Pardoned "${record.organizerName}" from blacklist. Reason: ${args.reason}`,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const checkIdentityIsBlacklisted = query({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    nin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query('blacklisted_identities')
      .withIndex('by_status', (q) => q.eq('status', 'active_blacklist'))
      .collect();

    const cleanEmail = args.email?.trim().toLowerCase();
    const cleanPhone = args.phone?.trim();
    const cleanNin = args.nin?.trim().toUpperCase();

    const matched = list.find(
      (b) =>
        (cleanEmail && b.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && b.phone === cleanPhone) ||
        (cleanNin && b.nin.toUpperCase() === cleanNin)
    );

    if (matched) {
      return {
        blacklisted: true,
        reason: matched.reason,
        matchedField:
          cleanNin && matched.nin.toUpperCase() === cleanNin
            ? 'NIN'
            : cleanEmail && matched.email.toLowerCase() === cleanEmail
            ? 'Email'
            : 'Phone Number',
      };
    }

    return { blacklisted: false };
  },
});
