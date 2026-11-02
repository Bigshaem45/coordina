import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    city: v.optional(v.string()),
    type: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let spaces = await ctx.db.query('spaces').collect();

    if (args.city) {
      spaces = spaces.filter((s) => s.city.toLowerCase() === args.city!.toLowerCase());
    }

    if (args.type) {
      spaces = spaces.filter((s) => s.type.toLowerCase() === args.type!.toLowerCase());
    }

    if (args.verifiedOnly) {
      spaces = spaces.filter((s) => s.verified);
    }

    return spaces;
  },
});

export const getById = query({
  args: { id: v.id('spaces') },
  handler: async (ctx, args) => {
    const space = await ctx.db.get(args.id);
    if (!space) return null;

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect();

    const matching = allEvents.filter(
      (e) =>
        String(e.spaceId) === String(args.id) ||
        e.venueName.toLowerCase() === space.name.toLowerCase()
    );

    const upcomingEvents = await Promise.all(
      matching.map(async (e) => {
        const org = await ctx.db.get(e.organizerId);
        return {
          ...e,
          organizerName: org?.businessName ?? 'Event Host',
        };
      })
    );

    return {
      ...space,
      upcomingEvents: upcomingEvents.sort((a, b) => a.start.localeCompare(b.start)),
    };
  },
});

export const create = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    type: v.string(),
    city: v.string(),
    area: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    capacity: v.number(),
    amenities: v.array(v.string()),
    crowd: v.string(),
    contactPhone: v.string(),
    contactEmail: v.optional(v.string()),
    hours: v.optional(v.string()),
    about: v.optional(v.string()),
    bookingFrom: v.optional(v.number()),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email before registering a social space.');
    }
    if (user.role !== 'venue_manager' && user.role !== 'admin') {
      throw new Error('Only Venue Manager or Admin accounts can register spaces.');
    }

    const { userId, ...spaceFields } = args;
    const spaceId = await ctx.db.insert('spaces', {
      ...spaceFields,
      managerUserId: user._id,
      contactEmail: args.contactEmail ?? user.email,
      rating: 0,
      reviewCount: 0,
      verified: user.role === 'admin',
      verificationDate: user.role === 'admin' ? new Date().toISOString().split('T')[0] : undefined,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'CREATE_SPACE',
      targetEntity: 'spaces',
      targetId: spaceId,
      details: `Registered space "${args.name}" in ${args.area}, ${args.city}`,
      timestamp: Date.now(),
    });

    return spaceId;
  },
});

export const createBooking = mutation({
  args: {
    userId: v.id('users'),
    spaceId: v.id('spaces'),
    date: v.string(),
    guests: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Please sign in to request a space reservation.');
    if (!user.emailVerified) {
      throw new Error('Verify your email address before requesting venue reservations.');
    }

    const space = await ctx.db.get(args.spaceId);
    if (!space) throw new Error('Venue not found.');

    const baseRate = space.bookingFrom ?? 25000;
    const estimatedSpend = baseRate * Math.ceil(Math.max(1, args.guests) / 4);

    const bookingId = await ctx.db.insert('space_bookings', {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      spaceId: space._id,
      spaceName: space.name,
      date: args.date,
      guests: Math.max(1, args.guests),
      notes: args.notes,
      estimatedSpend,
      status: 'Requested',
      createdAt: Date.now(),
    });

    await ctx.db.insert('notifications', {
      userId: user._id,
      title: 'Reservation Requested',
      message: `Your table/section inquiry at ${space.name} for ${args.date} (${args.guests} guests) has been sent to the venue desk.`,
      type: 'system',
      actionUrl: '/profile',
      read: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'CREATE_SPACE_BOOKING',
      targetEntity: 'space_bookings',
      targetId: bookingId,
      details: `Requested reservation at ${space.name} on ${args.date} for ${args.guests} guests`,
      timestamp: Date.now(),
    });

    return { bookingId, spaceName: space.name, estimatedSpend };
  },
});

export const getMyBookings = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const rows = await ctx.db
      .query('space_bookings')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getVenueDeskData = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || (user.role !== 'venue_manager' && user.role !== 'admin')) {
      return null;
    }

    const allSpaces = await ctx.db.query('spaces').collect();
    const managedSpaces =
      user.role === 'admin'
        ? allSpaces
        : allSpaces.filter(
            (s) =>
              String(s.managerUserId) === String(user._id) ||
              (s.contactEmail && s.contactEmail.toLowerCase() === user.email.toLowerCase()) ||
              (user.phone && s.contactPhone === user.phone)
          );

    const managedSpaceIds = new Set(managedSpaces.map((s) => String(s._id)));
    const managedNames = new Set(managedSpaces.map((s) => s.name.toLowerCase()));

    const allConfirmations = await ctx.db.query('venue_confirmations').collect();
    const confirmations = allConfirmations.filter(
      (vc) =>
        user.role === 'admin' ||
        (vc.spaceId && managedSpaceIds.has(String(vc.spaceId))) ||
        managedNames.has(vc.venueName.toLowerCase()) ||
        (vc.contactEmail && vc.contactEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.phone && vc.contactPhone === user.phone)
    );

    const populatedConfirmations = await Promise.all(
      confirmations.map(async (vc) => {
        const event = await ctx.db.get(vc.eventId);
        return { ...vc, event };
      })
    );

    const allBookings = await ctx.db.query('space_bookings').collect();
    const bookings =
      user.role === 'admin'
        ? allBookings
        : allBookings.filter((b) => managedSpaceIds.has(String(b.spaceId)));

    return {
      spaces: managedSpaces,
      confirmations: populatedConfirmations.sort((a, b) => b.createdAt - a.createdAt),
      bookings: bookings.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const respondToBooking = mutation({
  args: {
    userId: v.id('users'),
    bookingId: v.id('space_bookings'),
    status: v.union(v.literal('Confirmed'), v.literal('Declined')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || (user.role !== 'venue_manager' && user.role !== 'admin')) {
      throw new Error('Unauthorized');
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error('Booking not found');

    await ctx.db.patch(args.bookingId, { status: args.status });

    await ctx.db.insert('notifications', {
      userId: booking.userId,
      title: `Reservation ${args.status}`,
      message: `${booking.spaceName} marked your reservation for ${booking.date} (${booking.guests} guests) as ${args.status}.`,
      type: 'system',
      actionUrl: '/profile',
      read: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
