import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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

    // Default to published events unless querying specific status
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

    return events;
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

    return {
      ...event,
      space,
      organizer,
    };
  },
});

export const getByOrganizer = query({
  args: { organizerId: v.id('organizers') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', args.organizerId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    city: v.string(),
    area: v.string(),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    address: v.string(),
    start: v.string(),
    end: v.string(),
    organizerId: v.id('organizers'),
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
  },
  handler: async (ctx, args) => {
    // Check if organizer is verified
    const org = await ctx.db.get(args.organizerId);
    const initialTrust = org?.status === 'verified' ? 'Organizer Verified' : 'Unverified';

    const eventId = await ctx.db.insert('events', {
      ...args,
      status: 'pending_verification',
      verificationStatus: initialTrust,
      featured: false,
      createdAt: Date.now(),
    });

    // Automatically create an event verification entry
    await ctx.db.insert('event_verifications', {
      eventId,
      organizerId: args.organizerId,
      status: 'pending',
      trustLevelAssigned: initialTrust,
      submittedAt: Date.now(),
    });

    // Record audit log
    await ctx.db.insert('audit_logs', {
      actorName: org?.businessName ?? 'Organizer',
      actorRole: 'organiser',
      actorId: args.organizerId,
      action: 'CREATE_EVENT',
      targetEntity: 'events',
      targetId: eventId,
      details: `Created event: ${args.title} (${args.city}) with ${args.tiers.length} tiers`,
      timestamp: Date.now(),
    });

    return eventId;
  },
});

export const update = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const publish = mutation({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: 'published' });
    return await ctx.db.get(args.id);
  },
});

