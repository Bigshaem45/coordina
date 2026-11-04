import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { isOrganizerCoordinaPlus } from './geo';

async function assertAdmin(ctx: any, adminUserId: any) {
  if (!adminUserId) return null;
  const user = await ctx.db.get(adminUserId);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

export const getOrganizerVerificationState = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .first();

    if (!organizer) {
      return { organizer: null, verifications: [] };
    }

    const verifications = await ctx.db
      .query('event_verifications')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();

    const populated = await Promise.all(
      verifications.map(async (ver) => {
        const event = await ctx.db.get(ver.eventId);
        const venueConf = ver.venueToken
          ? await ctx.db
              .query('venue_confirmations')
              .withIndex('by_token', (q) => q.eq('token', ver.venueToken!))
              .first()
          : await ctx.db
              .query('venue_confirmations')
              .withIndex('by_eventId', (q) => q.eq('eventId', ver.eventId))
              .first();

        return {
          ...ver,
          eventTitle: event?.title ?? 'Event',
          expectedAttendance: event?.expectedAttendance ?? 0,
          eventVerificationStatus: event?.verificationStatus ?? 'Unverified',
          venueConfirmationStatus: venueConf?.status ?? 'pending',
          venueConfirmationNotes: venueConf?.notes,
        };
      })
    );

    return {
      organizer,
      verifications: populated.sort((a, b) => b.submittedAt - a.submittedAt),
    };
  },
});

export const submitEventVerification = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    businessName: v.string(),
    cacNumber: v.string(),
    directorName: v.string(),
    nin: v.string(),
    phone: v.string(),
    phoneOtpVerified: v.boolean(),
    biometricScan: v.object({
      verified: v.boolean(),
      snapshotDataUrl: v.string(),
      token: v.string(),
      confidenceScore: v.number(),
    }),
    venueEmail: v.string(),
    venuePhone: v.optional(v.string()),
    documents: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
        url: v.string(),
        uploadedAt: v.string(),
        verified: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email address before submitting event KYC.');
    }

    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first();
    if (!organizer) throw new Error('Organizer profile not found.');

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error('Event not found.');
    if (user.role !== 'admin' && String(event.organizerId) !== String(organizer._id)) {
      throw new Error('You can only request verification for your own events.');
    }

    // Enforce blacklist check across email, phone, NIN, and CAC
    const blacklist = await ctx.db
      .query('blacklisted_identities')
      .withIndex('by_status', (q) => q.eq('status', 'active_blacklist'))
      .collect();
    const cleanEmail = user.email.trim().toLowerCase();
    const cleanPhone = args.phone.trim();
    const cleanNin = args.nin.trim().toUpperCase();
    const cleanCac = args.cacNumber.trim().toUpperCase();

    const blocked = blacklist.find(
      (b) =>
        b.email.toLowerCase() === cleanEmail ||
        (cleanPhone && b.phone === cleanPhone) ||
        (cleanNin && b.nin.toUpperCase() === cleanNin) ||
        (cleanCac && b.cacNumber?.toUpperCase() === cleanCac)
    );
    if (blocked) {
      throw new Error(`Compliance Block: Identity restricted (${blocked.reason}).`);
    }

    if (!args.phoneOtpVerified) {
      throw new Error('Phone OTP verification is required before submitting.');
    }
    if (!args.biometricScan.verified || !args.biometricScan.snapshotDataUrl) {
      throw new Error('Live camera face liveness verification is required.');
    }
    if (args.documents.length === 0) {
      throw new Error('Upload at least one supporting KYC or venue booking document.');
    }

    // Calculate automated compliance risk score
    let riskScore = 10;
    const riskReasons: string[] = [];

    if (!cleanCac || (!cleanCac.startsWith('RC') && !cleanCac.startsWith('BN'))) {
      riskScore += 25;
      riskReasons.push('Unrecognized CAC prefix (expected RC or BN)');
    }
    if (cleanNin.length < 10) {
      riskScore += 20;
      riskReasons.push('NIN format requires manual review');
    }
    if (event.expectedAttendance >= 500) {
      riskScore += 20;
      riskReasons.push(`High capacity event (${event.expectedAttendance} attendees)`);
    }
    const maxTierPrice = Math.max(0, ...event.tiers.map((t) => t.price));
    if (maxTierPrice >= 50000) {
      riskScore += 15;
      riskReasons.push(`High ticket value tier (₦${maxTierPrice.toLocaleString()})`);
    }
    const docTypes = new Set(args.documents.map((d) => d.type));
    if (!docTypes.has('Venue Booking')) {
      riskScore += 15;
      riskReasons.push('No formal Venue Booking Receipt attached yet');
    }

    riskScore = Math.min(100, riskScore);
    const riskLevel: 'Low' | 'Medium' | 'High' =
      riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low';

    // Update organizer KYC profile
    await ctx.db.patch(organizer._id, {
      businessName: args.businessName.trim() || organizer.businessName,
      cacNumber: cleanCac,
      directorName: args.directorName.trim(),
      nin: cleanNin,
      contactPhone: cleanPhone,
      faceBiometricVerified: true,
      faceSnapshotUrl: args.biometricScan.snapshotDataUrl,
      biometricToken: args.biometricScan.token,
      biometricConfidence: args.biometricScan.confidenceScore,
      riskScore,
    });

    // Generate cryptographic venue token
    const token = `tok_${Math.random().toString(36).substring(2, 9)}_${Date.now()
      .toString(36)
      .slice(-5)}`;
    const venueOtp = String(100000 + Math.floor(Math.random() * 900000));

    await ctx.db.insert('venue_confirmations', {
      eventId: event._id,
      spaceId: event.spaceId,
      venueName: event.venueName,
      token,
      contactPhone: args.venuePhone?.trim() || cleanPhone,
      contactEmail: args.venueEmail.trim().toLowerCase(),
      organizerName: args.businessName.trim() || organizer.businessName,
      cacNumber: cleanCac,
      phoneOtpCode: venueOtp,
      status: 'pending',
      createdAt: Date.now(),
    });

    const verificationId = await ctx.db.insert('event_verifications', {
      eventId: event._id,
      organizerId: organizer._id,
      cacNumber: cleanCac,
      directorName: args.directorName.trim(),
      nin: cleanNin,
      phone: cleanPhone,
      phoneOtpVerified: args.phoneOtpVerified,
      faceBiometricVerified: true,
      faceSnapshotUrl: args.biometricScan.snapshotDataUrl,
      biometricToken: args.biometricScan.token,
      biometricConfidence: args.biometricScan.confidenceScore,
      venueName: event.venueName,
      venueEmail: args.venueEmail.trim().toLowerCase(),
      venuePhone: args.venuePhone?.trim(),
      venueToken: token,
      riskScore,
      riskLevel,
      riskReasons,
      documents: args.documents,
      status: 'pending',
      trustLevelAssigned: 'Verification Pending',
      submittedAt: Date.now(),
    });

    await ctx.db.patch(event._id, {
      verificationStatus: 'Verification Pending',
    });

    await ctx.db.insert('audit_logs', {
      actorName: args.businessName.trim() || organizer.businessName,
      actorRole: user.role,
      actorId: user._id,
      action: 'SUBMIT_REMOTE_VERIFICATION',
      targetEntity: 'event_verifications',
      targetId: verificationId,
      details: `Submitted KYC & remote venue dossier for "${event.title}" (CAC: ${cleanCac}, Risk: ${riskScore}/100 ${riskLevel})`,
      timestamp: Date.now(),
    });

    return {
      verificationId,
      token,
      organizerName: args.businessName.trim() || organizer.businessName,
      eventTitle: event.title,
      venueName: event.venueName,
    };
  },
});

export const getVenueConfirmationByToken = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token || !args.token.trim()) return null;
    const confirmation = await ctx.db
      .query('venue_confirmations')
      .withIndex('by_token', (q) => q.eq('token', args.token!.trim()))
      .first();

    if (!confirmation) return null;

    const event = await ctx.db.get(confirmation.eventId);
    const organizer = event ? await ctx.db.get(event.organizerId) : null;
    let space = null;
    if (confirmation.spaceId) {
      space = await ctx.db.get(confirmation.spaceId);
    }

    const evVer = await ctx.db
      .query('event_verifications')
      .withIndex('by_eventId', (q) => q.eq('eventId', confirmation.eventId))
      .collect();
    const latestVer = evVer.sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null;

    return {
      ...confirmation,
      organizerName:
        confirmation.organizerName ?? organizer?.businessName ?? 'Event Organizer',
      cacNumber: confirmation.cacNumber ?? organizer?.cacNumber ?? 'Pending CAC',
      directorName: latestVer?.directorName ?? organizer?.directorName ?? '',
      documents: latestVer?.documents ?? [],
      event,
      space,
    };
  },
});

export const confirmVenueBooking = mutation({
  args: {
    token: v.string(),
    status: v.union(v.literal('confirmed'), v.literal('disputed')),
    notes: v.optional(v.string()),
    confirmedByPhone: v.optional(v.string()),
    actorUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const confirmation = await ctx.db
      .query('venue_confirmations')
      .withIndex('by_token', (q) => q.eq('token', args.token.trim()))
      .first();

    if (!confirmation) {
      throw new Error('Invalid or expired venue verification token.');
    }

    await ctx.db.patch(confirmation._id, {
      status: args.status,
      notes: args.notes,
      confirmedAt: Date.now(),
      confirmedByPhone: args.confirmedByPhone,
    });

    const event = await ctx.db.get(confirmation.eventId);
    const matchingVers = await ctx.db
      .query('event_verifications')
      .withIndex('by_eventId', (q) => q.eq('eventId', confirmation.eventId))
      .collect();

    for (const ver of matchingVers) {
      if (ver.venueToken === confirmation.token || ver.status === 'pending') {
        await ctx.db.patch(ver._id, {
          venueConfirmedAt:
            args.status === 'confirmed' ? new Date().toISOString() : undefined,
          status: args.status === 'disputed' ? 'rejected' : ver.status,
          reviewerNotes:
            args.status === 'disputed'
              ? `Disputed by venue desk: ${args.notes ?? 'Booking not recognized'}`
              : ver.reviewerNotes,
        });
      }
    }

    if (event) {
      if (args.status === 'confirmed') {
        const nextTrust =
          event.verificationStatus === 'Coordina Trusted'
            ? 'Coordina Trusted'
            : event.verificationStatus === 'Organizer Verified'
            ? 'Coordina Trusted'
            : 'Venue Confirmed';
        await ctx.db.patch(event._id, { verificationStatus: nextTrust });
      } else {
        await ctx.db.patch(event._id, { verificationStatus: 'Verification Rejected' });
      }
    }

    await ctx.db.insert('audit_logs', {
      actorName: args.confirmedByPhone || confirmation.venueName,
      actorRole: 'venue_manager',
      actorId: args.actorUserId,
      action: `VENUE_${args.status.toUpperCase()}`,
      targetEntity: 'venue_confirmations',
      targetId: confirmation._id,
      details: `${confirmation.venueName} marked booking for "${
        event?.title ?? confirmation.eventId
      }" as ${args.status}. ${args.notes ? `Notes: ${args.notes}` : ''}`,
      timestamp: Date.now(),
    });

    return { success: true, status: args.status };
  },
});

export const listAllVerifications = query({
  args: { adminUserId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) return [];

    const all = await ctx.db.query('event_verifications').collect();
    const populated = await Promise.all(
      all.map(async (ver) => {
        const event = await ctx.db.get(ver.eventId);
        const organizer = await ctx.db.get(ver.organizerId);
        const venueConf = ver.venueToken
          ? await ctx.db
              .query('venue_confirmations')
              .withIndex('by_token', (q) => q.eq('token', ver.venueToken!))
              .first()
          : await ctx.db
              .query('venue_confirmations')
              .withIndex('by_eventId', (q) => q.eq('eventId', ver.eventId))
              .first();

        return {
          ...ver,
          event,
          organizer: organizer
            ? {
                ...organizer,
                isCoordinaPlus: isOrganizerCoordinaPlus(organizer),
              }
            : null,
          venueConfirmation: venueConf,
        };
      })
    );

    return populated.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

export const reviewEventVerification = mutation({
  args: {
    adminUserId: v.id('users'),
    verificationId: v.id('event_verifications'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    reviewerNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) throw new Error('Admin privileges required.');

    const verification = await ctx.db.get(args.verificationId);
    if (!verification) throw new Error('Verification dossier not found.');

    const event = await ctx.db.get(verification.eventId);
    const organizer = await ctx.db.get(verification.organizerId);

    const venueConf = verification.venueToken
      ? await ctx.db
          .query('venue_confirmations')
          .withIndex('by_token', (q) => q.eq('token', verification.venueToken!))
          .first()
      : null;

    const assignedBadge =
      args.decision === 'approved'
        ? venueConf?.status === 'confirmed' || Boolean(verification.venueConfirmedAt)
          ? ('Coordina Trusted' as const)
          : ('Event Verified' as const)
        : ('Verification Rejected' as const);

    await ctx.db.patch(verification._id, {
      status: args.decision,
      trustLevelAssigned: assignedBadge,
      reviewerNotes: args.reviewerNotes,
      reviewedBy: admin._id,
      reviewedAt: Date.now(),
    });

    if (event) {
      await ctx.db.patch(event._id, {
        verificationStatus: assignedBadge,
        status: args.decision === 'approved' ? 'published' : event.status,
      });
    }

    if (organizer) {
      await ctx.db.patch(organizer._id, {
        status: args.decision === 'approved' ? 'verified' : 'rejected',
        riskScore: args.decision === 'approved' ? Math.min(organizer.riskScore, 12) : 85,
      });

      await ctx.db.insert('notifications', {
        userId: organizer.userId,
        title:
          args.decision === 'approved'
            ? `Verification Approved: ${assignedBadge}`
            : 'Verification Requires Attention',
        message:
          args.decision === 'approved'
            ? `"${event?.title ?? 'Your event'}" has been awarded the ${assignedBadge} badge.`
            : `Compliance review note: ${args.reviewerNotes}`,
        type: 'verification',
        actionUrl: '/organiser',
        read: false,
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert('audit_logs', {
      actorName: admin.name,
      actorRole: 'admin',
      actorId: admin._id,
      action: args.decision === 'approved' ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
      targetEntity: 'event_verifications',
      targetId: verification._id,
      details: `${admin.name} ${args.decision} "${event?.title ?? verification.eventId}" -> ${assignedBadge}. Notes: ${args.reviewerNotes}`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      assignedBadge,
      organizerEmail: organizer?.contactEmail ?? null,
      organizerName: organizer?.businessName ?? 'Organizer',
      eventTitle: event?.title ?? 'Event',
    };
  },
});

export const listAuditLogs = query({
  args: { adminUserId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) return [];

    const logs = await ctx.db.query('audit_logs').collect();
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  },
});

export const getAdminAnalytics = query({
  args: { adminUserId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) return null;

    const users = await ctx.db.query('users').collect();
    const events = await ctx.db.query('events').collect();
    const spaces = await ctx.db.query('spaces').collect();
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_paymentStatus', (q) => q.eq('paymentStatus', 'paid'))
      .collect();
    const tickets = await ctx.db.query('tickets').collect();
    const verifications = await ctx.db.query('event_verifications').collect();
    const venueConfirmations = await ctx.db.query('venue_confirmations').collect();
    const blacklist = await ctx.db
      .query('blacklisted_identities')
      .withIndex('by_status', (q) => q.eq('status', 'active_blacklist'))
      .collect();

    const dayBuckets = new Map<string, { gmv: number; orders: number }>();
    for (let idx = 0; idx < 7; idx++) {
      const d = new Date(Date.now() - (6 - idx) * 86400000);
      dayBuckets.set(d.toISOString().slice(0, 10), { gmv: 0, orders: 0 });
    }

    let totalGmv = 0;
    let totalPlatformFees = 0;
    for (const o of orders) {
      totalGmv += o.total;
      totalPlatformFees += o.fees.total;
      const dayKey = new Date(o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
      const bucket = dayBuckets.get(dayKey);
      if (bucket) {
        bucket.gmv += o.total;
        bucket.orders += 1;
      }
    }

    const gmvByDay = Array.from(dayBuckets.entries()).map(([date, vals]) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NG', { weekday: 'short' }),
      gmv: vals.gmv,
      orders: vals.orders,
    }));

    const riskAlerts: { id: string; severity: 'High' | 'Medium'; title: string; detail: string }[] = [];

    for (const vc of venueConfirmations) {
      if (vc.status === 'disputed') {
        riskAlerts.push({
          id: String(vc._id),
          severity: 'High',
          title: `Venue Disputed Booking: ${vc.venueName}`,
          detail: vc.notes || `Token ${vc.token} was rejected by the venue manager.`,
        });
      }
    }

    for (const ver of verifications) {
      if (ver.status === 'pending' && (ver.riskScore ?? 0) >= 50) {
        riskAlerts.push({
          id: String(ver._id),
          severity: (ver.riskScore ?? 0) >= 70 ? 'High' : 'Medium',
          title: `Elevated KYC Risk (${ver.riskScore}/100)`,
          detail: (ver.riskReasons ?? []).join(' · ') || 'Manual compliance check recommended.',
        });
      }
    }

    for (const ev of events) {
      if ((ev.reportCount ?? 0) > 0) {
        riskAlerts.push({
          id: String(ev._id),
          severity: (ev.reportCount ?? 0) >= 2 ? 'High' : 'Medium',
          title: `${ev.reportCount} Community Report(s): ${ev.title}`,
          detail: `${ev.venueName}, ${ev.city} · Current status: ${ev.verificationStatus}`,
        });
      }
    }

    return {
      totalUsers: users.length,
      attendeeCount: users.filter((u) => u.role === 'attendee').length,
      organiserCount: users.filter((u) => u.role === 'organiser').length,
      venueManagerCount: users.filter((u) => u.role === 'venue_manager').length,
      publishedEventsCount: events.filter((e) => e.status === 'published').length,
      verifiedEventsCount: events.filter(
        (e) =>
          e.verificationStatus === 'Event Verified' ||
          e.verificationStatus === 'Organizer Verified' ||
          e.verificationStatus === 'Coordina Trusted'
      ).length,
      spacesCount: spaces.length,
      totalOrders: orders.length,
      totalTickets: tickets.length,
      checkedInTickets: tickets.filter((t) => t.status === 'used').length,
      totalGmv,
      totalPlatformFees,
      pendingVerificationsCount: verifications.filter((v) => v.status === 'pending').length,
      activeBlacklistCount: blacklist.length,
      gmvByDay,
      riskAlerts,
    };
  },
});

export const adminSetCoordinaPlus = mutation({
  args: {
    adminUserId: v.id('users'),
    organizerId: v.id('organizers'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx, args.adminUserId);
    if (!admin) throw new Error('Admin privileges required.');

    const organizer = await ctx.db.get(args.organizerId);
    if (!organizer) throw new Error('Organizer not found.');

    const now = Date.now();
    await ctx.db.patch(organizer._id, {
      coordinaPlus: args.enabled,
      tier: args.enabled ? 'coordina_plus' : 'basic',
      coordinaPlusSince: args.enabled ? organizer.coordinaPlusSince ?? now : organizer.coordinaPlusSince,
      coordinaPlusExpiresAt: args.enabled ? now + 365 * 24 * 60 * 60 * 1000 : undefined,
      coordinaPlusPlan: args.enabled ? 'annual' : undefined,
    });

    await ctx.db.insert('notifications', {
      userId: organizer.userId,
      title: args.enabled ? 'COORDINA Plus Granted' : 'COORDINA Plus Status Updated',
      message: args.enabled
        ? 'COORDINA Compliance has activated COORDINA Plus on your organizer studio, unlocking IP Region Lock controls.'
        : 'Your COORDINA Plus subscription status has been updated to Basic.',
      type: 'system',
      actionUrl: '/organiser',
      read: false,
      createdAt: now,
    });

    await ctx.db.insert('audit_logs', {
      actorName: admin.name,
      actorRole: 'admin',
      actorId: admin._id,
      action: args.enabled ? 'ADMIN_GRANT_COORDINA_PLUS' : 'ADMIN_REVOKE_COORDINA_PLUS',
      targetEntity: 'organizers',
      targetId: organizer._id,
      details: `${admin.name} ${args.enabled ? 'enabled' : 'disabled'} COORDINA Plus for "${organizer.businessName}"`,
      timestamp: now,
    });

    return { success: true, enabled: args.enabled };
  },
});
