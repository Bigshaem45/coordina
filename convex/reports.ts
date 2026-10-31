import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// -------------------------------------------------------------
// EVENT REPORTING & COMMUNITY FRAUD PREVENTION
// -------------------------------------------------------------

export const submitReport = mutation({
  args: {
    eventId: v.id('events'),
    eventTitle: v.string(),
    reporterName: v.string(),
    reporterEmail: v.optional(v.string()),
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
    const reportId = await ctx.db.insert('event_reports', {
      eventId: args.eventId,
      eventTitle: args.eventTitle,
      reporterName: args.reporterName,
      reporterEmail: args.reporterEmail,
      reason: args.reason,
      details: args.details,
      status: 'pending',
      createdAt: Date.now(),
    });

    // Increment report count on event
    const event = await ctx.db.get(args.eventId);
    if (event) {
      const currentReports = (event.reportCount ?? 0) + 1;
      await ctx.db.patch(args.eventId, { reportCount: currentReports });

      // Auto-escalate if 3 or more community fraud reports
      if (currentReports >= 3 && event.verificationStatus !== 'Event Suspended') {
        await ctx.db.patch(args.eventId, {
          verificationStatus: 'Unverified',
        });
      }
    }

    // Log to immutable compliance audit logs
    await ctx.db.insert('audit_logs', {
      actorName: args.reporterName,
      actorRole: 'attendee',
      action: 'EVENT_REPORTED',
      targetEntity: 'events',
      targetId: args.eventId,
      details: `Report submitted for reason: ${args.reason}. Details: ${args.details.slice(0, 100)}`,
      timestamp: Date.now(),
    });

    return { success: true, reportId };
  },
});

export const getReports = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let reports = await ctx.db.query('event_reports').collect();
    if (args.status && args.status !== 'all') {
      reports = reports.filter((r) => r.status === args.status);
    }
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const resolveReport = mutation({
  args: {
    reportId: v.id('event_reports'),
    status: v.union(v.literal('reviewed'), v.literal('dismissed'), v.literal('action_taken')),
    actionTaken: v.optional(v.string()),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error('Report not found');

    await ctx.db.patch(args.reportId, {
      status: args.status,
      actionTaken: args.actionTaken,
      reviewedBy: args.reviewerName,
      reviewedAt: Date.now(),
    });

    // If action taken is to suspend the event
    if (args.actionTaken === 'suspend_event') {
      await ctx.db.patch(report.eventId, {
        verificationStatus: 'Event Suspended',
        status: 'cancelled',
      });
    }

    await ctx.db.insert('audit_logs', {
      actorName: args.reviewerName,
      actorRole: 'compliance_officer',
      action: 'RESOLVE_REPORT',
      targetEntity: 'event_reports',
      targetId: args.reportId,
      details: `Resolved report for ${report.eventTitle} with status: ${args.status}. Action: ${args.actionTaken || 'None'}`,
      timestamp: Date.now(),
    });

    return true;
  },
});

// -------------------------------------------------------------
// EVENT RATINGS & VERIFIED REVIEWS
// -------------------------------------------------------------

export const submitRating = mutation({
  args: {
    eventId: v.id('events'),
    userId: v.optional(v.id('users')),
    userName: v.string(),
    rating: v.number(), // 1 to 5
    tags: v.array(v.string()),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user owns a ticket for this event to mark verified attendee
    let ticketVerified = false;
    if (args.userId) {
      const t = await ctx.db
        .query('tickets')
        .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
        .filter((q) => q.eq(q.field('userId'), args.userId))
        .first();
      if (t) ticketVerified = true;
    }

    // Insert review record
    await ctx.db.insert('event_ratings', {
      eventId: args.eventId,
      userId: args.userId,
      userName: args.userName,
      rating: args.rating,
      tags: args.tags,
      review: args.review,
      ticketVerified,
      createdAt: Date.now(),
    });

    // Recompute event average rating and reviewCount
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

    return { success: true, avgRating, count: allRatings.length };
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
    const average = ratings.length ? Number((total / ratings.length).toFixed(1)) : 5.0;

    return {
      average,
      count: ratings.length,
      ratings: ratings.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

// -------------------------------------------------------------
// ORGANIZER BLACKLIST & IDENTITY FRAUD REGISTRY
// (Email, Phone Number, and NIN Enforcement)
// -------------------------------------------------------------

export const flagAndBlacklistOrganizer = mutation({
  args: {
    organizerName: v.string(),
    email: v.string(),
    phone: v.string(),
    nin: v.string(),
    cacNumber: v.optional(v.string()),
    reason: v.string(),
    eventId: v.optional(v.string()),
    eventTitle: v.optional(v.string()),
    adminName: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanPhone = args.phone.trim();
    const cleanNin = args.nin.trim().toUpperCase();

    // 1. Insert into blacklisted identities registry
    const blacklistId = await ctx.db.insert('blacklisted_identities', {
      organizerName: args.organizerName,
      email: cleanEmail,
      phone: cleanPhone,
      nin: cleanNin,
      cacNumber: args.cacNumber?.trim(),
      reason: args.reason,
      eventId: args.eventId,
      eventTitle: args.eventTitle,
      flaggedBy: args.adminName,
      status: 'active_blacklist',
      createdAt: Date.now(),
    });

    // 2. Suspend related event if provided
    if (args.eventId) {
      try {
        await ctx.db.patch(args.eventId as any, {
          verificationStatus: 'Event Suspended',
          status: 'cancelled',
        });
      } catch {
        // Event might be string ID
      }
    }

    // 3. Mark any matching organizer account as restricted
    const orgs = await ctx.db.query('organizers').collect();
    for (const org of orgs) {
      if (
        org.contactEmail.toLowerCase() === cleanEmail ||
        org.contactPhone === cleanPhone ||
        (args.cacNumber && org.cacNumber === args.cacNumber)
      ) {
        await ctx.db.patch(org._id, {
          status: 'restricted',
          riskScore: 100,
        });
      }
    }

    // 4. Log immutable compliance record
    await ctx.db.insert('audit_logs', {
      actorName: args.adminName,
      actorRole: 'compliance_officer',
      action: 'ORGANIZER_BLACKLISTED',
      targetEntity: 'blacklisted_identities',
      targetId: blacklistId,
      details: `Organizer ${args.organizerName} blacklisted for "${args.reason}". Flagged Email: ${cleanEmail}, Phone: ${cleanPhone}, NIN: ${cleanNin}`,
      timestamp: Date.now(),
    });

    return { success: true, blacklistId };
  },
});

export const getBlacklistedIdentities = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query('blacklisted_identities').collect();
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const pardonBlacklistedIdentity = mutation({
  args: {
    blacklistId: v.id('blacklisted_identities'),
    adminName: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.blacklistId);
    if (!record) throw new Error('Blacklist record not found');

    await ctx.db.patch(args.blacklistId, {
      status: 'pardoned',
    });

    await ctx.db.insert('audit_logs', {
      actorName: args.adminName,
      actorRole: 'compliance_officer',
      action: 'ORGANIZER_PARDONED',
      targetEntity: 'blacklisted_identities',
      targetId: args.blacklistId,
      details: `Pardoned organizer ${record.organizerName} from blacklist. Reason: ${args.reason}`,
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


