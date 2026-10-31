import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createSquad = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    creatorName: v.string(),
    creatorPhone: v.optional(v.string()),
    creatorUserId: v.optional(v.id('users')),
    initialEventIds: v.optional(v.array(v.id('events'))),
  },
  handler: async (ctx, args) => {
    const inviteCode = `SQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const squadId = await ctx.db.insert('squads', {
      name: args.name,
      city: args.city,
      inviteCode,
      creatorUserId: args.creatorUserId,
      creatorName: args.creatorName,
      members: [
        {
          name: args.creatorName,
          phone: args.creatorPhone,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(args.creatorName)}`,
          isHost: true,
          joinedAt: Date.now(),
        },
      ],
      shortlistEventIds: args.initialEventIds ?? [],
      status: 'voting',
      createdAt: Date.now(),
    });

    return { squadId, inviteCode };
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const squad = await ctx.db
      .query('squads')
      .withIndex('by_inviteCode', (q) => q.eq('inviteCode', args.inviteCode))
      .first();

    if (!squad) return null;

    // Populate shortlisted events
    const events = await Promise.all(
      squad.shortlistEventIds.map(async (id) => await ctx.db.get(id))
    );

    // Fetch votes for this squad
    const votes = await ctx.db
      .query('squad_votes')
      .withIndex('by_squadId', (q) => q.eq('squadId', squad._id))
      .collect();

    return {
      ...squad,
      events: events.filter(Boolean),
      votes,
    };
  },
});

export const addEvent = mutation({
  args: {
    squadId: v.id('squads'),
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error('Squad not found');

    if (!squad.shortlistEventIds.includes(args.eventId)) {
      await ctx.db.patch(args.squadId, {
        shortlistEventIds: [...squad.shortlistEventIds, args.eventId],
      });
    }

    return true;
  },
});

export const vote = mutation({
  args: {
    squadId: v.id('squads'),
    eventId: v.id('events'),
    voterName: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    // Check if voter already voted
    const existing = await ctx.db
      .query('squad_votes')
      .withIndex('by_squad_and_event', (q) =>
        q.eq('squadId', args.squadId).eq('eventId', args.eventId)
      )
      .filter((q) => q.eq(q.field('voterName'), args.voterName))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { vote: args.vote, timestamp: Date.now() });
    } else {
      await ctx.db.insert('squad_votes', {
        squadId: args.squadId,
        eventId: args.eventId,
        voterName: args.voterName,
        vote: args.vote,
        timestamp: Date.now(),
      });
    }

    return true;
  },
});

export const joinSquad = mutation({
  args: {
    inviteCode: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const squad = await ctx.db
      .query('squads')
      .withIndex('by_inviteCode', (q) => q.eq('inviteCode', args.inviteCode))
      .first();

    if (!squad) throw new Error('Squad not found');

    const alreadyMember = squad.members.some(
      (m) => m.name.toLowerCase() === args.name.toLowerCase()
    );

    if (!alreadyMember) {
      const newMember = {
        name: args.name,
        phone: args.phone,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(args.name)}`,
        isHost: false,
        joinedAt: Date.now(),
      };

      await ctx.db.patch(squad._id, {
        members: [...squad.members, newMember],
      });
    }

    return squad._id;
  },
});

