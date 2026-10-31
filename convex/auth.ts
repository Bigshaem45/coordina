import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getMe = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.email) return null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email!))
      .first();
    return user;
  },
});

export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal('attendee'),
        v.literal('organiser'),
        v.literal('venue_manager'),
        v.literal('admin')
      )
    ),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    const userId = await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role ?? 'attendee',
      city: args.city ?? 'Lagos',
      interests: ['Concerts', 'Nightlife', 'Food'],
      vibe: 'Energetic',
      budget: 50000,
      phoneVerified: false,
      createdAt: Date.now(),
    });

    // If signing up as organiser, auto-create organiser profile
    if (args.role === 'organiser') {
      await ctx.db.insert('organizers', {
        userId,
        businessName: args.name,
        contactEmail: args.email,
        contactPhone: args.phone ?? '',
        status: 'pending',
        riskScore: 20,
        tier: 'basic',
        createdAt: Date.now(),
      });
    }

    // Record audit log
    await ctx.db.insert('audit_logs', {
      actorName: args.name,
      actorRole: args.role ?? 'attendee',
      actorId: userId,
      action: 'USER_REGISTERED',
      targetEntity: 'users',
      targetId: userId,
      details: `User registered with email ${args.email} as ${args.role ?? 'attendee'}`,
      timestamp: Date.now(),
    });

    return userId;
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert('users', {
        name: args.name ?? args.email.split('@')[0],
        email: args.email,
        role: 'attendee',
        city: 'Lagos',
        interests: ['Concerts', 'Food'],
        phoneVerified: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    return user;
  },
});

export const updateProfile = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    phone: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    vibe: v.optional(v.string()),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

