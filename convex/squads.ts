import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const ARRIVAL_STATES = ['Ready', 'On the way', '5 mins away', 'Arrived'] as const;

async function populateSquad(ctx: any, squad: any) {
  const eventsRaw = await Promise.all(
    squad.shortlistEventIds.map(async (id: any) => {
      const ev = await ctx.db.get(id);
      if (!ev) return null;
      const org: any = await ctx.db.get(ev.organizerId);
      return {
        ...ev,
        organizerName: org?.businessName ?? 'Event Host',
      };
    })
  );

  const votes = await ctx.db
    .query('squad_votes')
    .withIndex('by_squadId', (q: any) => q.eq('squadId', squad._id))
    .collect();

  const messages = await ctx.db
    .query('squad_messages')
    .withIndex('by_squadId', (q: any) => q.eq('squadId', squad._id))
    .collect();

  return {
    ...squad,
    events: eventsRaw.filter(Boolean),
    votes,
    messages: messages.sort((a: any, b: any) => a.createdAt - b.createdAt),
  };
}

export const listMySquads = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const allSquads = await ctx.db.query('squads').collect();
    const mySquads = allSquads.filter(
      (s) =>
        String(s.creatorUserId) === String(user._id) ||
        s.members.some(
          (m) =>
            (m.userId && String(m.userId) === String(user._id)) ||
            (m.email && m.email.toLowerCase() === user.email.toLowerCase())
        )
    );

    const populated = await Promise.all(mySquads.map((s) => populateSquad(ctx, s)));
    return populated.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getSquadDetail = query({
  args: { squadId: v.id('squads') },
  handler: async (ctx, args) => {
    const squad = await ctx.db.get(args.squadId);
    if (!squad) return null;
    return await populateSquad(ctx, squad);
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const squad = await ctx.db
      .query('squads')
      .withIndex('by_inviteCode', (q) => q.eq('inviteCode', args.inviteCode.trim().toUpperCase()))
      .first();

    if (!squad) return null;
    return await populateSquad(ctx, squad);
  },
});

export const createSquad = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    city: v.string(),
    initialEventIds: v.array(v.id('events')),
    invitedFriends: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Sign in to create a Squad.');
    if (!user.emailVerified) {
      throw new Error('Verify your email address before creating a Squad.');
    }

    const cleanName = args.name.trim();
    if (!cleanName) throw new Error('Please give your squad a name.');
    if (args.initialEventIds.length === 0) {
      throw new Error('Select at least one event to shortlist for your squad.');
    }

    const inviteCode = `SQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const members: any[] = [
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
        isHost: true,
        arrivalStatus: 'Ready',
        joinedAt: Date.now(),
      },
    ];

    for (const rawFriend of args.invitedFriends ?? []) {
      const token = rawFriend.trim();
      if (!token) continue;
      const isEmail = token.includes('@');
      const matchedUser = isEmail
        ? await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', token.toLowerCase()))
            .first()
        : null;

      if (matchedUser && String(matchedUser._id) === String(user._id)) continue;

      const displayName = matchedUser ? matchedUser.name : token;
      if (
        members.some(
          (m) =>
            (matchedUser && String(m.userId) === String(matchedUser._id)) ||
            m.name.toLowerCase() === displayName.toLowerCase()
        )
      ) {
        continue;
      }

      members.push({
        userId: matchedUser?._id,
        email: matchedUser?.email ?? (isEmail ? token.toLowerCase() : undefined),
        name: displayName,
        phone: matchedUser?.phone,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        isHost: false,
        arrivalStatus: 'Invited',
        joinedAt: Date.now(),
      });

      if (matchedUser) {
        await ctx.db.insert('notifications', {
          userId: matchedUser._id,
          title: 'Added to a Squad!',
          message: `${user.name} invited you to vote on "${cleanName}".`,
          type: 'squad',
          actionUrl: `/squad`,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    const squadId = await ctx.db.insert('squads', {
      name: cleanName,
      city: args.city,
      inviteCode,
      creatorUserId: user._id,
      creatorName: user.name,
      members,
      shortlistEventIds: args.initialEventIds,
      status: 'voting',
      createdAt: Date.now(),
    });

    await ctx.db.insert('squad_messages', {
      squadId,
      senderUserId: user._id,
      senderName: user.name,
      text: `Created "${cleanName}" with ${args.initialEventIds.length} shortlisted event${
        args.initialEventIds.length === 1 ? '' : 's'
      }. Vote on your top pick!`,
      createdAt: Date.now(),
    });

    return { squadId, inviteCode };
  },
});

export const joinByInviteOrId = mutation({
  args: {
    userId: v.id('users'),
    squadId: v.optional(v.id('squads')),
    inviteCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email address to join a Squad.');
    }

    let squad = args.squadId ? await ctx.db.get(args.squadId) : null;
    if (!squad && args.inviteCode) {
      const code = args.inviteCode.trim().toUpperCase();
      squad = await ctx.db
        .query('squads')
        .withIndex('by_inviteCode', (q) => q.eq('inviteCode', code))
        .first();
    }
    if (!squad) throw new Error('Squad not found. Check your invite code or link.');

    const existingIdx = squad.members.findIndex(
      (m) =>
        (m.userId && String(m.userId) === String(user._id)) ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );

    if (existingIdx >= 0) {
      const nextMembers = [...squad.members];
      nextMembers[existingIdx] = {
        ...nextMembers[existingIdx],
        userId: user._id,
        email: user.email,
        name: user.name,
        arrivalStatus:
          nextMembers[existingIdx].arrivalStatus === 'Invited'
            ? 'Ready'
            : nextMembers[existingIdx].arrivalStatus ?? 'Ready',
      };
      await ctx.db.patch(squad._id, { members: nextMembers });
    } else {
      await ctx.db.patch(squad._id, {
        members: [
          ...squad.members,
          {
            userId: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
            isHost: false,
            arrivalStatus: 'Ready',
            joinedAt: Date.now(),
          },
        ],
      });
    }

    return { squadId: squad._id };
  },
});

export const inviteMember = mutation({
  args: {
    squadId: v.id('squads'),
    userId: v.id('users'),
    friendEmailOrName: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller || !caller.emailVerified) {
      throw new Error('Verify your email to invite friends.');
    }
    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error('Squad not found.');

    const token = args.friendEmailOrName.trim();
    if (!token) throw new Error('Enter a friend name or email.');

    const isEmail = token.includes('@');
    const matchedUser = isEmail
      ? await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', token.toLowerCase()))
          .first()
      : null;

    const displayName = matchedUser ? matchedUser.name : token;
    const already = squad.members.some(
      (m) =>
        (matchedUser && m.userId && String(m.userId) === String(matchedUser._id)) ||
        (isEmail && m.email?.toLowerCase() === token.toLowerCase()) ||
        m.name.toLowerCase() === displayName.toLowerCase()
    );
    if (already) {
      throw new Error(`${displayName} is already in this squad.`);
    }

    await ctx.db.patch(squad._id, {
      members: [
        ...squad.members,
        {
          userId: matchedUser?._id,
          email: matchedUser?.email ?? (isEmail ? token.toLowerCase() : undefined),
          name: displayName,
          phone: matchedUser?.phone,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
          isHost: false,
          arrivalStatus: 'Invited',
          joinedAt: Date.now(),
        },
      ],
    });

    if (matchedUser) {
      await ctx.db.insert('notifications', {
        userId: matchedUser._id,
        title: 'Squad Invite',
        message: `${caller.name} added you to "${squad.name}".`,
        type: 'squad',
        actionUrl: `/squad/${squad._id}`,
        read: false,
        createdAt: Date.now(),
      });
    }

    return { addedName: displayName };
  },
});

export const addEvent = mutation({
  args: {
    squadId: v.id('squads'),
    userId: v.id('users'),
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email to edit squad events.');
    }
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
    userId: v.id('users'),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email address to vote in Squad Mode.');
    }

    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error('Squad not found.');

    // Ensure voter is a registered member of the squad
    const inSquad = squad.members.some(
      (m) =>
        (m.userId && String(m.userId) === String(user._id)) ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
    if (!inSquad) {
      await ctx.db.patch(squad._id, {
        members: [
          ...squad.members,
          {
            userId: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
            isHost: false,
            arrivalStatus: 'Ready',
            joinedAt: Date.now(),
          },
        ],
      });
    }

    const votesForEvent = await ctx.db
      .query('squad_votes')
      .withIndex('by_squad_and_event', (q) =>
        q.eq('squadId', args.squadId).eq('eventId', args.eventId)
      )
      .collect();

    const existing = votesForEvent.find(
      (vRow) =>
        (vRow.voterUserId && String(vRow.voterUserId) === String(user._id)) ||
        vRow.voterName === user.name
    );

    if (existing) {
      if (existing.vote === args.vote) {
        await ctx.db.delete(existing._id);
        return { removed: true };
      }
      await ctx.db.patch(existing._id, {
        voterUserId: user._id,
        voterName: user.name,
        vote: args.vote,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert('squad_votes', {
        squadId: args.squadId,
        eventId: args.eventId,
        voterUserId: user._id,
        voterName: user.name,
        vote: args.vote,
        timestamp: Date.now(),
      });
    }

    return { removed: false };
  },
});

export const sendMessage = mutation({
  args: {
    squadId: v.id('squads'),
    userId: v.id('users'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email to post in Squad chat.');
    }
    const cleanText = args.text.trim();
    if (!cleanText) return false;

    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error('Squad not found.');

    await ctx.db.insert('squad_messages', {
      squadId: args.squadId,
      senderUserId: user._id,
      senderName: user.name,
      text: cleanText,
      createdAt: Date.now(),
    });

    return true;
  },
});

export const cycleArrivalStatus = mutation({
  args: {
    squadId: v.id('squads'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Unauthorized');

    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error('Squad not found');

    let nextState = 'Ready';
    const updatedMembers = squad.members.map((m) => {
      const isMe =
        (m.userId && String(m.userId) === String(user._id)) ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase());
      if (!isMe) return m;
      const curIdx = ARRIVAL_STATES.indexOf((m.arrivalStatus as any) ?? 'Ready');
      nextState = ARRIVAL_STATES[(curIdx + 1) % ARRIVAL_STATES.length];
      return { ...m, userId: user._id, email: user.email, arrivalStatus: nextState };
    });

    await ctx.db.patch(squad._id, { members: updatedMembers });
    return { arrivalStatus: nextState };
  },
});
