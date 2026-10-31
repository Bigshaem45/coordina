import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// 1. Submit Organizer Verification
export const submitOrganizerVerification = mutation({
  args: {
    organizerId: v.id('organizers'),
    cacNumber: v.string(),
    cacDocumentStorageId: v.optional(v.string()),
    directorIdStorageId: v.optional(v.string()),
    proofOfAddressStorageId: v.optional(v.string()),
    phoneOtpVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizerId);
    if (!org) throw new Error('Organizer not found');

    // Update organizer CAC
    await ctx.db.patch(args.organizerId, {
      cacNumber: args.cacNumber,
      status: 'pending',
    });

    const verificationId = await ctx.db.insert('organizer_verifications', {
      organizerId: args.organizerId,
      userId: org.userId,
      cacDocumentStorageId: args.cacDocumentStorageId,
      directorIdStorageId: args.directorIdStorageId,
      proofOfAddressStorageId: args.proofOfAddressStorageId,
      phoneOtpVerified: args.phoneOtpVerified,
      otpVerifiedAt: args.phoneOtpVerified ? Date.now() : undefined,
      status: 'pending',
      submittedAt: Date.now(),
    });

    // Compute automatic risk assessment score
    let calculatedRisk = 20; // base score
    if (!args.phoneOtpVerified) calculatedRisk += 30;
    if (!args.cacNumber || args.cacNumber.length < 6) calculatedRisk += 25;
    if (!args.directorIdStorageId) calculatedRisk += 15;

    await ctx.db.patch(args.organizerId, { riskScore: Math.min(100, calculatedRisk) });

    await ctx.db.insert('audit_logs', {
      actorName: org.businessName,
      actorRole: 'organiser',
      actorId: args.organizerId,
      action: 'SUBMIT_ORGANIZER_VERIFICATION',
      targetEntity: 'organizer_verifications',
      targetId: verificationId,
      details: `Submitted KYC documents with CAC ${args.cacNumber}. Initial risk score: ${calculatedRisk}`,
      timestamp: Date.now(),
    });

    return verificationId;
  },
});

// 2. Request Venue Remote Confirmation Token
export const requestVenueConfirmation = mutation({
  args: {
    eventId: v.id('events'),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    contactPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate clean token
    const token = `tok_${Math.random().toString(36).substring(2, 8)}_${Date.now().toString(36).substring(4)}`;

    const confirmationId = await ctx.db.insert('venue_confirmations', {
      eventId: args.eventId,
      spaceId: args.spaceId,
      venueName: args.venueName,
      token,
      contactPhone: args.contactPhone,
      status: 'pending',
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: 'System / Organizer',
      actorRole: 'organiser',
      action: 'REQUEST_VENUE_CONFIRMATION',
      targetEntity: 'venue_confirmations',
      targetId: confirmationId,
      details: `Issued remote confirmation token ${token} for venue: ${args.venueName}`,
      timestamp: Date.now(),
    });

    return { confirmationId, token, url: `https://coordina-beta.vercel.app/venue-portal/${token}` };
  },
});

// 3. Look up Venue Confirmation by Token (Venue Portal)
export const getVenueConfirmationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const confirmation = await ctx.db
      .query('venue_confirmations')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();

    if (!confirmation) return null;

    const event = await ctx.db.get(confirmation.eventId);
    let space = null;
    if (confirmation.spaceId) {
      space = await ctx.db.get(confirmation.spaceId);
    }

    return {
      ...confirmation,
      event,
      space,
    };
  },
});

// 4. Venue Manager Confirms or Disputes the Booking
export const confirmVenueBooking = mutation({
  args: {
    token: v.string(),
    status: v.union(v.literal('confirmed'), v.literal('disputed')),
    notes: v.optional(v.string()),
    confirmedByPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const confirmation = await ctx.db
      .query('venue_confirmations')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();

    if (!confirmation) throw new Error('Invalid verification token');

    await ctx.db.patch(confirmation._id, {
      status: args.status,
      notes: args.notes,
      confirmedAt: Date.now(),
      confirmedByPhone: args.confirmedByPhone,
    });

    // If confirmed, update the event trust level!
    const event = await ctx.db.get(confirmation.eventId);
    if (event && args.status === 'confirmed') {
      const currentTrust = event.verificationStatus;
      let nextTrust: typeof currentTrust = 'Event Verified';
      if (currentTrust === 'Organizer Verified') {
        nextTrust = 'Coordina Trusted';
      }
      await ctx.db.patch(confirmation.eventId, { verificationStatus: nextTrust });
    }

    await ctx.db.insert('audit_logs', {
      actorName: args.confirmedByPhone ?? 'Venue Manager',
      actorRole: 'venue_manager',
      action: `VENUE_${args.status.toUpperCase()}`,
      targetEntity: 'venue_confirmations',
      targetId: confirmation._id,
      details: `Venue ${confirmation.venueName} marked booking as ${args.status}. Notes: ${args.notes ?? 'None'}`,
      timestamp: Date.now(),
    });

    return { success: true, status: args.status };
  },
});

// 5. Admin Dashboard Review Queue
export const listPendingReviews = query({
  handler: async (ctx) => {
    const pendingOrganizers = await ctx.db
      .query('organizer_verifications')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();

    const pendingEvents = await ctx.db
      .query('event_verifications')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();

    const populatedOrganizers = await Promise.all(
      pendingOrganizers.map(async (v) => {
        const organizer = await ctx.db.get(v.organizerId);
        return { ...v, organizer };
      })
    );

    const populatedEvents = await Promise.all(
      pendingEvents.map(async (v) => {
        const event = await ctx.db.get(v.eventId);
        const organizer = await ctx.db.get(v.organizerId);
        return { ...v, event, organizer };
      })
    );

    return {
      organizers: populatedOrganizers,
      events: populatedEvents,
    };
  },
});

// 6. Admin Action: Review Organizer
export const reviewOrganizer = mutation({
  args: {
    verificationId: v.id('organizer_verifications'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    reviewerNotes: v.string(),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db.get(args.verificationId);
    if (!verification) throw new Error('Verification submission not found');

    const nextStatus = args.decision === 'approved' ? 'verified' : 'rejected';

    await ctx.db.patch(args.verificationId, {
      status: args.decision,
      reviewerNotes: args.reviewerNotes,
      reviewedAt: Date.now(),
    });

    await ctx.db.patch(verification.organizerId, {
      status: nextStatus,
      riskScore: args.decision === 'approved' ? 5 : 85,
    });

    // Notify organizer
    await ctx.db.insert('notifications', {
      userId: verification.userId,
      title: args.decision === 'approved' ? 'Organization Verified!' : 'Verification Update',
      message: args.decision === 'approved'
        ? 'Your organizer KYC verification was approved. You can now post verified events.'
        : `Verification not approved: ${args.reviewerNotes}`,
      type: 'verification',
      actionUrl: '/organiser',
      read: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: args.reviewerName,
      actorRole: 'admin',
      action: `REVIEW_ORGANIZER_${args.decision.toUpperCase()}`,
      targetEntity: 'organizers',
      targetId: verification.organizerId,
      details: `Admin ${args.reviewerName} set organizer status to ${nextStatus}. Notes: ${args.reviewerNotes}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// 7. Admin Action: Review Event & Assign Trust Badge
export const reviewEvent = mutation({
  args: {
    verificationId: v.id('event_verifications'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    trustLevel: v.union(
      v.literal('Unverified'),
      v.literal('Event Verified'),
      v.literal('Organizer Verified'),
      v.literal('Coordina Trusted')
    ),
    reviewerNotes: v.string(),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db.get(args.verificationId);
    if (!verification) throw new Error('Event verification submission not found');

    await ctx.db.patch(args.verificationId, {
      status: args.decision,
      trustLevelAssigned: args.trustLevel,
      reviewerNotes: args.reviewerNotes,
      reviewedAt: Date.now(),
    });

    // Apply trust level to event
    await ctx.db.patch(verification.eventId, {
      verificationStatus: args.trustLevel,
      status: args.decision === 'approved' ? 'published' : 'draft',
    });

    await ctx.db.insert('audit_logs', {
      actorName: args.reviewerName,
      actorRole: 'admin',
      action: `REVIEW_EVENT_${args.decision.toUpperCase()}`,
      targetEntity: 'events',
      targetId: verification.eventId,
      details: `Set trust badge to "${args.trustLevel}". Status: ${args.decision}. Notes: ${args.reviewerNotes}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

