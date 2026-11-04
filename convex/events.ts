import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { isOrganizerCoordinaPlus, regionRestrictionValidator } from './geo';

async function hydrateEvent(ctx: any, event: any) {
  const org = await ctx.db.get(event.organizerId);
  let space = null;
  if (event.spaceId) {
    space = await ctx.db.get(event.spaceId);
  }
  return {
    ...event,
    organizerName: org?.businessName ?? 'Event Host',
    organizerVerified: org?.status === 'verified',
    organizerCoordinaPlus: isOrganizerCoordinaPlus(org),
    lat: event.lat ?? space?.lat ?? (event.city === 'Abuja' ? 9.0765 : 6.4281),
    lng: event.lng ?? space?.lng ?? (event.city === 'Abuja' ? 7.4698 : 3.4219),
  };
}

export const list = query({
  args: {
    city: v.optional(v.string()),
    category: v.optional(v.string()),
    vibe: v.optional(v.string()),
    status: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db.query('events').collect();

    if (args.status) {
      events = events.filter((e) => e.status === args.status);
    } else {
      events = events.filter((e) => e.status === 'published');
    }

    if (args.city) {
      events = events.filter((e) => e.city.toLowerCase() === args.city!.toLowerCase());
    }

    if (args.category) {
      events = events.filter((e) => e.category.toLowerCase() === args.category!.toLowerCase());
    }

    if (args.vibe) {
      events = events.filter((e) => e.vibe.toLowerCase() === args.vibe!.toLowerCase());
    }

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.area.toLowerCase().includes(q) ||
          e.venueName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    const hydrated = await Promise.all(events.map((e) => hydrateEvent(ctx, e)));
    return hydrated.sort((a, b) => a.start.localeCompare(b.start));
  },
});

export const getById = query({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    let space = null;
    if (event.spaceId) {
      space = await ctx.db.get(event.spaceId);
    }

    const organizer = await ctx.db.get(event.organizerId);
    let orgEventsHosted = 0;
    let orgTotalRatings = 0;
    let orgRatingSum = 0;

    if (organizer) {
      const orgEvents = await ctx.db
        .query('events')
        .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
        .collect();
      orgEventsHosted = orgEvents.filter((e) => e.status === 'published').length;

      for (const oe of orgEvents) {
        const er = await ctx.db
          .query('event_ratings')
          .withIndex('by_eventId', (q) => q.eq('eventId', oe._id))
          .collect();
        orgTotalRatings += er.length;
        orgRatingSum += er.reduce((s, r) => s + r.rating, 0);
      }
    }

    const venueConf = await ctx.db
      .query('venue_confirmations')
      .withIndex('by_eventId', (q) => q.eq('eventId', event._id))
      .first();

    return {
      ...event,
      organizerName: organizer?.businessName ?? 'Event Host',
      organizerVerified: organizer?.status === 'verified',
      organizerCoordinaPlus: isOrganizerCoordinaPlus(organizer),
      lat: event.lat ?? space?.lat ?? (event.city === 'Abuja' ? 9.0765 : 6.4281),
      lng: event.lng ?? space?.lng ?? (event.city === 'Abuja' ? 7.4698 : 3.4219),
      space,
      venueConfirmationStatus: venueConf?.status ?? null,
      organizer: organizer
        ? {
            ...organizer,
            isCoordinaPlus: isOrganizerCoordinaPlus(organizer),
            eventsHosted: orgEventsHosted,
            avgRating: orgTotalRatings > 0 ? Number((orgRatingSum / orgTotalRatings).toFixed(1)) : 0,
            totalReviews: orgTotalRatings,
          }
        : null,
    };
  },
});

export const getOrganizerDashboard = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .first();

    if (!organizer) {
      return {
        organizer: null,
        isCoordinaPlus: user.role === 'admin',
        events: [],
        ticketsSold: 0,
        grossRevenue: 0,
        checkedInCount: 0,
        totalIssuedTickets: 0,
        salesByDay: Array.from({ length: 14 }, (_, idx) => {
          const d = new Date(Date.now() - (13 - idx) * 86400000);
          const iso = d.toISOString().slice(0, 10);
          return {
            date: iso,
            label: d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
            revenue: 0,
            tickets: 0,
          };
        }),
        promoCodes: [],
      };
    }

    const myEventsRaw = await ctx.db
      .query('events')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();

    const myEvents = await Promise.all(myEventsRaw.map((e) => hydrateEvent(ctx, e)));
    myEvents.sort((a, b) => b.createdAt - a.createdAt);

    const myEventIds = new Set(myEventsRaw.map((e) => String(e._id)));

    // Compute real tickets & check-ins from tickets table
    let checkedInCount = 0;
    let totalIssuedTickets = 0;
    for (const ev of myEventsRaw) {
      const evTickets = await ctx.db
        .query('tickets')
        .withIndex('by_eventId', (q) => q.eq('eventId', ev._id))
        .collect();
      const validOrUsed = evTickets.filter((t) => t.status !== 'cancelled' && !t.refundRequested);
      totalIssuedTickets += validOrUsed.length;
      checkedInCount += evTickets.filter((t) => t.status === 'used').length;
    }

    // Compute real gross revenue & 14-day sales series from paid orders
    const paidOrders = await ctx.db
      .query('orders')
      .withIndex('by_paymentStatus', (q) => q.eq('paymentStatus', 'paid'))
      .collect();

    const dayBuckets = new Map<string, { revenue: number; tickets: number }>();
    for (let idx = 0; idx < 14; idx++) {
      const d = new Date(Date.now() - (13 - idx) * 86400000);
      dayBuckets.set(d.toISOString().slice(0, 10), { revenue: 0, tickets: 0 });
    }

    let grossRevenue = 0;
    let orderTicketsSold = 0;

    for (const order of paidOrders) {
      const orderDay = new Date(order.paidAt ?? order.createdAt).toISOString().slice(0, 10);
      for (const item of order.items) {
        if (myEventIds.has(String(item.eventId))) {
          const lineRev = item.price * item.qty;
          grossRevenue += lineRev;
          orderTicketsSold += item.qty;
          const bucket = dayBuckets.get(orderDay);
          if (bucket) {
            bucket.revenue += lineRev;
            bucket.tickets += item.qty;
          }
        }
      }
    }

    const salesByDay = Array.from(dayBuckets.entries()).map(([date, vals]) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
      }),
      revenue: vals.revenue,
      tickets: vals.tickets,
    }));

    const promoCodes = await ctx.db
      .query('promo_codes')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();

    return {
      organizer,
      isCoordinaPlus: isOrganizerCoordinaPlus(organizer) || user.role === 'admin',
      events: myEvents,
      ticketsSold: orderTicketsSold,
      grossRevenue,
      checkedInCount,
      totalIssuedTickets,
      salesByDay,
      promoCodes: promoCodes.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const create = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    city: v.string(),
    area: v.string(),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    address: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    start: v.string(),
    end: v.string(),
    image: v.string(),
    coverStorageId: v.optional(v.string()),
    tags: v.array(v.string()),
    clashTags: v.array(v.string()),
    vibe: v.string(),
    tiers: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        price: v.number(),
        total: v.number(),
        remaining: v.number(),
      })
    ),
    isFree: v.boolean(),
    expectedAttendance: v.number(),
    regionRestriction: v.optional(regionRestrictionValidator),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User account not found.');
    if (!user.emailVerified) {
      throw new Error('Verify your email address before publishing events.');
    }
    if (user.role !== 'organiser' && user.role !== 'admin') {
      throw new Error('Only Event Planner accounts can publish events.');
    }

    // Check blacklist
    const blacklist = await ctx.db
      .query('blacklisted_identities')
      .withIndex('by_status', (q) => q.eq('status', 'active_blacklist'))
      .collect();
    let org = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first();

    const isBlocked = blacklist.some(
      (b) =>
        b.email.toLowerCase() === user.email.toLowerCase() ||
        (user.phone && b.phone === user.phone) ||
        (org?.nin && b.nin.toUpperCase() === org.nin.toUpperCase())
    );
    if (isBlocked || org?.status === 'restricted') {
      throw new Error('Your organizer identity is restricted by COORDINA Compliance.');
    }

    if (!org) {
      const orgId = await ctx.db.insert('organizers', {
        userId: user._id,
        businessName: user.name,
        contactEmail: user.email,
        contactPhone: user.phone ?? '',
        status: 'pending',
        riskScore: 35,
        tier: 'basic',
        createdAt: Date.now(),
      });
      org = await ctx.db.get(orgId);
    }

    const initialTrust =
      org?.status === 'verified' ? ('Organizer Verified' as const) : ('Unverified' as const);

    if (args.regionRestriction?.enabled) {
      const hasPlus = isOrganizerCoordinaPlus(org) || user.role === 'admin';
      if (!hasPlus) {
        throw new Error(
          'IP Region Lock requires an active COORDINA Plus organizer subscription.'
        );
      }
    }

    let resolvedLat = args.lat;
    let resolvedLng = args.lng;
    if (args.spaceId) {
      const space = await ctx.db.get(args.spaceId);
      if (space) {
        resolvedLat = space.lat;
        resolvedLng = space.lng;
      }
    }

    const { userId, ...eventData } = args;
    const eventId = await ctx.db.insert('events', {
      ...eventData,
      lat: resolvedLat,
      lng: resolvedLng,
      organizerId: org!._id,
      status: 'published',
      verificationStatus: initialTrust,
      featured: false,
      rating: 0,
      reviewCount: 0,
      reportCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: org!.businessName,
      actorRole: user.role,
      actorId: user._id,
      action: 'CREATE_EVENT',
      targetEntity: 'events',
      targetId: eventId,
      details: `Published event "${args.title}" in ${args.city} (${initialTrust})${
        args.regionRestriction?.enabled
          ? ` [IP Region Lock: ${args.regionRestriction.label}]`
          : ''
      }`,
      timestamp: Date.now(),
    });

    return eventId;
  },
});

export const updateEventRegionRestriction = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    regionRestriction: regionRestrictionValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your organizer email before updating event settings.');
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error('Event not found.');
    }

    const org = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first();

    if (user.role !== 'admin') {
      if (!org || String(org._id) !== String(event.organizerId)) {
        throw new Error('You can only configure IP region locks on your own events.');
      }
      if (!isOrganizerCoordinaPlus(org)) {
        throw new Error(
          'IP Region Lock is an exclusive COORDINA Plus feature. Upgrade your studio to enable regional IP gating.'
        );
      }
    }

    await ctx.db.patch(event._id, {
      regionRestriction: args.regionRestriction,
    });

    await ctx.db.insert('audit_logs', {
      actorName: org?.businessName ?? user.name,
      actorRole: user.role,
      actorId: user._id,
      action: args.regionRestriction.enabled ? 'ENABLE_REGION_LOCK' : 'DISABLE_REGION_LOCK',
      targetEntity: 'events',
      targetId: event._id,
      details: args.regionRestriction.enabled
        ? `Enabled IP Region Lock on "${event.title}" -> ${args.regionRestriction.label}`
        : `Disabled IP Region Lock on "${event.title}" (open globally)`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      regionRestriction: args.regionRestriction,
    };
  },
});

export const activateCoordinaPlus = mutation({
  args: {
    userId: v.id('users'),
    plan: v.union(v.literal('monthly'), v.literal('annual')),
    transactionRef: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Account not found.');
    if (!user.emailVerified) {
      throw new Error('Please verify your email address before subscribing to COORDINA Plus.');
    }
    if (user.role !== 'organiser' && user.role !== 'admin') {
      throw new Error('Only Event Organizer accounts can subscribe to COORDINA Plus.');
    }

    let org = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first();

    const now = Date.now();
    const durationMs =
      args.plan === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const baseExpiry =
      org?.coordinaPlusExpiresAt && org.coordinaPlusExpiresAt > now
        ? org.coordinaPlusExpiresAt
        : now;
    const expiresAt = baseExpiry + durationMs;

    if (!org) {
      const orgId = await ctx.db.insert('organizers', {
        userId: user._id,
        businessName: user.name,
        contactEmail: user.email,
        contactPhone: user.phone ?? '',
        status: 'pending',
        riskScore: 30,
        tier: 'coordina_plus',
        coordinaPlus: true,
        coordinaPlusPlan: args.plan,
        coordinaPlusSince: now,
        coordinaPlusExpiresAt: expiresAt,
        coordinaPlusRef: args.transactionRef,
        createdAt: now,
      });
      org = await ctx.db.get(orgId);
    } else {
      await ctx.db.patch(org._id, {
        tier: 'coordina_plus',
        coordinaPlus: true,
        coordinaPlusPlan: args.plan,
        coordinaPlusSince: org.coordinaPlusSince ?? now,
        coordinaPlusExpiresAt: expiresAt,
        coordinaPlusRef: args.transactionRef,
      });
      org = await ctx.db.get(org._id);
    }

    await ctx.db.insert('notifications', {
      userId: user._id,
      title: 'COORDINA Plus Activated!',
      message: `Your ${args.plan} COORDINA Plus membership is live. You can now lock ticket sales to specific IP regions on new and published events.`,
      type: 'system',
      actionUrl: '/organiser',
      read: false,
      createdAt: now,
    });

    await ctx.db.insert('audit_logs', {
      actorName: org?.businessName ?? user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'ACTIVATE_COORDINA_PLUS',
      targetEntity: 'organizers',
      targetId: String(org?._id ?? user._id),
      details: `Activated COORDINA Plus (${args.plan}) · Ref: ${args.transactionRef}`,
      timestamp: now,
    });

    return {
      success: true,
      expiresAt,
      plan: args.plan,
    };
  },
});

export const update = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('events'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    area: v.optional(v.string()),
    venueName: v.optional(v.string()),
    address: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    vibe: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('pending_verification'),
        v.literal('published'),
        v.literal('cancelled')
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Unauthorized');

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error('Event not found');

    if (user.role !== 'admin') {
      const org = await ctx.db
        .query('organizers')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .first();
      if (!org || String(org._id) !== String(event.organizerId)) {
        throw new Error('You do not have permission to modify this event.');
      }
    }

    const { userId, id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const createPromoCode = mutation({
  args: {
    userId: v.id('users'),
    code: v.string(),
    discountPct: v.number(),
    eventId: v.optional(v.id('events')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email before creating promo codes.');
    }

    const org = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (!org) throw new Error('Organizer profile not found.');

    const cleanCode = args.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 3) {
      throw new Error('Promo code must be at least 3 characters.');
    }

    const clampedPct = Math.max(1, Math.min(100, Math.round(args.discountPct)));

    const existing = await ctx.db
      .query('promo_codes')
      .withIndex('by_code', (q) => q.eq('code', cleanCode))
      .first();
    if (existing) {
      throw new Error(`Promo code "${cleanCode}" already exists.`);
    }

    const promoId = await ctx.db.insert('promo_codes', {
      organizerId: org._id,
      eventId: args.eventId,
      code: cleanCode,
      discountPct: clampedPct,
      uses: 0,
      active: true,
      createdAt: Date.now(),
    });

    return { promoId, code: cleanCode, discountPct: clampedPct };
  },
});

export const togglePromoCode = mutation({
  args: {
    userId: v.id('users'),
    promoId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    const promo = await ctx.db.get(args.promoId);
    if (!org || !promo || String(promo.organizerId) !== String(org._id)) {
      throw new Error('Unauthorized');
    }
    await ctx.db.patch(args.promoId, { active: !promo.active });
    return { active: !promo.active };
  },
});

export const validatePromoCode = query({
  args: {
    code: v.string(),
    eventIds: v.array(v.id('events')),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.code.trim().toUpperCase();
    if (!cleanCode) return null;

    const promo = await ctx.db
      .query('promo_codes')
      .withIndex('by_code', (q) => q.eq('code', cleanCode))
      .first();

    if (!promo || !promo.active) {
      return { valid: false, message: 'Invalid or inactive promo code.' };
    }

    const events = await Promise.all(args.eventIds.map((id) => ctx.db.get(id)));
    const matchingEvents = events.filter(
      (ev) =>
        ev &&
        String(ev.organizerId) === String(promo.organizerId) &&
        (!promo.eventId || String(promo.eventId) === String(ev._id))
    );

    if (matchingEvents.length === 0) {
      return {
        valid: false,
        message: 'This promo code does not apply to the events in your plan.',
      };
    }

    return {
      valid: true,
      code: promo.code,
      discountPct: promo.discountPct,
      applicableEventIds: matchingEvents.map((e) => String(e!._id)),
    };
  },
});
