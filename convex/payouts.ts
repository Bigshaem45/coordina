import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getFinanceSummary = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .first();
    if (!organizer) return null;

    const myEvents = await ctx.db
      .query('events')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();
    const myEventIds = new Set(myEvents.map((e) => String(e._id)));

    const paidOrders = await ctx.db
      .query('orders')
      .withIndex('by_paymentStatus', (q) => q.eq('paymentStatus', 'paid'))
      .collect();

    let grossEarned = 0;
    let paidOrderCount = 0;
    for (const order of paidOrders) {
      let touched = false;
      for (const item of order.items) {
        if (myEventIds.has(String(item.eventId))) {
          grossEarned += item.price * item.qty;
          touched = true;
        }
      }
      if (touched) paidOrderCount += 1;
    }

    const payouts = await ctx.db
      .query('payouts')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();

    const totalDisbursed = payouts
      .filter((p) => p.status !== 'failed')
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, grossEarned - totalDisbursed);

    return {
      organizerId: organizer._id,
      organizerStatus: organizer.status,
      bankDetails: organizer.bankDetails ?? null,
      grossEarned,
      totalDisbursed,
      availableBalance,
      paidOrderCount,
      payouts: payouts.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const saveBankAccount = mutation({
  args: {
    userId: v.id('users'),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    recipientCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email before updating settlement bank details.');
    }

    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (!organizer) throw new Error('Organizer profile not found.');

    await ctx.db.patch(organizer._id, {
      bankDetails: {
        bankName: args.bankName,
        bankCode: args.bankCode,
        accountNumber: args.accountNumber,
        accountName: args.accountName,
        recipientCode: args.recipientCode,
      },
    });

    await ctx.db.insert('audit_logs', {
      actorName: organizer.businessName,
      actorRole: user.role,
      actorId: user._id,
      action: 'SAVE_SETTLEMENT_BANK',
      targetEntity: 'organizers',
      targetId: organizer._id,
      details: `Updated settlement bank to ${args.bankName} (${args.accountName})`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const recordPayout = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    reference: v.string(),
    status: v.union(v.literal('pending'), v.literal('paid'), v.literal('failed')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Email verification is required for payouts.');
    }

    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (!organizer) throw new Error('Organizer profile not found.');

    if (organizer.status !== 'verified') {
      throw new Error('Your organizer KYC must be verified before withdrawing funds.');
    }

    // Recompute real balance on server so client cannot spoof payout amount
    const myEvents = await ctx.db
      .query('events')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();
    const myEventIds = new Set(myEvents.map((e) => String(e._id)));

    const paidOrders = await ctx.db
      .query('orders')
      .withIndex('by_paymentStatus', (q) => q.eq('paymentStatus', 'paid'))
      .collect();

    let grossEarned = 0;
    for (const order of paidOrders) {
      for (const item of order.items) {
        if (myEventIds.has(String(item.eventId))) {
          grossEarned += item.price * item.qty;
        }
      }
    }

    const existingPayouts = await ctx.db
      .query('payouts')
      .withIndex('by_organizerId', (q) => q.eq('organizerId', organizer._id))
      .collect();
    const totalDisbursed = existingPayouts
      .filter((p) => p.status !== 'failed')
      .reduce((sum, p) => sum + p.amount, 0);

    const available = Math.max(0, grossEarned - totalDisbursed);
    if (args.amount <= 0 || args.amount > available) {
      throw new Error(`Requested payout exceeds available balance (₦${available.toLocaleString()}).`);
    }

    const payoutId = await ctx.db.insert('payouts', {
      organizerId: organizer._id,
      userId: args.userId,
      amount: args.amount,
      bankName: args.bankName,
      bankCode: args.bankCode,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      reference: args.reference,
      status: args.status,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: organizer.businessName,
      actorRole: 'organiser',
      actorId: user._id,
      action: 'ORGANIZER_PAYOUT',
      targetEntity: 'payouts',
      targetId: payoutId,
      details: `Disbursed ₦${args.amount.toLocaleString()} to ${args.bankName} (${args.accountName}) · Ref: ${args.reference}`,
      timestamp: Date.now(),
    });

    return { payoutId };
  },
});

