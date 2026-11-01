import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getMyCart = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    const items = await ctx.db
      .query('cart_items')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .collect();

    const populated = await Promise.all(
      items.map(async (item) => {
        const event = await ctx.db.get(item.eventId);
        if (!event || event.status !== 'published') return null;

        let organizerName = 'Event Host';
        const org = await ctx.db.get(event.organizerId);
        if (org) organizerName = org.businessName;

        const tier =
          event.tiers.find((t) => t.id === item.tierId) ?? event.tiers[0];
        if (!tier) return null;

        return {
          _id: item._id,
          eventId: String(event._id),
          tierId: tier.id,
          qty: item.qty,
          updatedAt: item.updatedAt,
          event: {
            ...event,
            id: String(event._id),
            venue: event.venueName,
            organiserId: String(event.organizerId),
            organiserName: organizerName,
            verified:
              event.verificationStatus === 'Event Verified' ||
              event.verificationStatus === 'Organizer Verified' ||
              event.verificationStatus === 'Coordina Trusted',
            rating: event.rating ?? 0,
            reviews: event.reviewCount ?? 0,
            lat: event.lat ?? (event.city === 'Abuja' ? 9.0765 : 6.4281),
            lng: event.lng ?? (event.city === 'Abuja' ? 7.4698 : 3.4219),
          },
          tier,
        };
      })
    );

    return populated
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.event.start.localeCompare(b.event.start));
  },
});

export const addOrUpdateItem = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    tierId: v.string(),
    qty: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Please sign in to save events to your plan.');

    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== 'published') {
      throw new Error('This event is not currently available.');
    }

    const tier = event.tiers.find((t) => t.id === args.tierId) ?? event.tiers[0];
    if (!tier || tier.remaining <= 0) {
      throw new Error('Selected ticket tier is sold out.');
    }

    const existing = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();

    const addQty = Math.max(1, args.qty ?? 1);

    if (existing) {
      const nextQty =
        existing.tierId === tier.id
          ? Math.min(tier.remaining, Math.min(10, existing.qty + addQty))
          : Math.min(tier.remaining, addQty);
      await ctx.db.patch(existing._id, {
        tierId: tier.id,
        qty: nextQty,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('cart_items', {
      userId: args.userId,
      eventId: args.eventId,
      tierId: tier.id,
      qty: Math.min(tier.remaining, addQty),
      updatedAt: Date.now(),
    });
  },
});

export const setItemQty = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    qty: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();

    if (!existing) return false;

    const event = await ctx.db.get(args.eventId);
    const tier = event?.tiers.find((t) => t.id === existing.tierId);
    const maxAllowed = tier ? Math.min(10, Math.max(1, tier.remaining)) : 10;

    await ctx.db.patch(existing._id, {
      qty: Math.max(1, Math.min(maxAllowed, args.qty)),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const removeItem = mutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return true;
  },
});

export const swapItem = mutation({
  args: {
    userId: v.id('users'),
    oldEventId: v.id('events'),
    newEventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const newEvent = await ctx.db.get(args.newEventId);
    if (!newEvent || newEvent.status !== 'published') {
      throw new Error('Replacement event is unavailable.');
    }
    const availableTier =
      newEvent.tiers.find((t) => t.remaining > 0) ?? newEvent.tiers[0];
    if (!availableTier) {
      throw new Error('No tickets remaining on replacement event.');
    }

    const oldRow = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.oldEventId)
      )
      .first();
    if (oldRow) {
      await ctx.db.delete(oldRow._id);
    }

    const existingNew = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.newEventId)
      )
      .first();

    if (!existingNew) {
      await ctx.db.insert('cart_items', {
        userId: args.userId,
        eventId: args.newEventId,
        tierId: availableTier.id,
        qty: 1,
        updatedAt: Date.now(),
      });
    }

    return { title: newEvent.title };
  },
});

export const clearCart = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('cart_items')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return true;
  },
});
