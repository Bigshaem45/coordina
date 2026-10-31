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

    // Fetch upcoming events hosted at this space
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect();

    const upcomingEvents = allEvents.filter((e) => e.spaceId === args.id);

    return {
      ...space,
      upcomingEvents,
    };
  },
});

export const create = mutation({
  args: {
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
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const spaceId = await ctx.db.insert('spaces', {
      ...args,
      rating: 4.8,
      reviewCount: 1,
      verified: true,
      verificationDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: 'System / Admin',
      actorRole: 'admin',
      action: 'CREATE_SPACE',
      targetEntity: 'spaces',
      targetId: spaceId,
      details: `Created verified space: ${args.name} in ${args.area}, ${args.city}`,
      timestamp: Date.now(),
    });

    return spaceId;
  },
});

