import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createOrder = mutation({
  args: {
    userId: v.id('users'),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    promoCode: v.optional(v.string()),
    items: v.array(
      v.object({
        eventId: v.id('events'),
        eventTitle: v.string(),
        tierId: v.string(),
        tierName: v.string(),
        price: v.number(),
        qty: v.number(),
      })
    ),
    paymentMethod: v.union(v.literal('card'), v.literal('transfer'), v.literal('ussd')),
    transactionRef: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('Please sign in to complete your booking.');
    if (!user.emailVerified) {
      throw new Error('Please verify your email address before purchasing tickets.');
    }
    if (args.items.length === 0) {
      throw new Error('Your plan has no items to book.');
    }

    // Check optional promo code
    let promoDoc: any = null;
    if (args.promoCode && args.promoCode.trim()) {
      const cleanCode = args.promoCode.trim().toUpperCase();
      const found = await ctx.db
        .query('promo_codes')
        .withIndex('by_code', (q) => q.eq('code', cleanCode))
        .first();
      if (found && found.active) {
        promoDoc = found;
      }
    }

    // 1. Validate inventory & compute subtotal + promo discount
    let rawSubtotal = 0;
    let discountAmount = 0;
    const verifiedItems: typeof args.items = [];

    for (const item of args.items) {
      const event = await ctx.db.get(item.eventId);
      if (!event || event.status !== 'published') {
        throw new Error(`Event "${item.eventTitle}" is no longer available.`);
      }
      const tier = event.tiers.find((t) => t.id === item.tierId);
      if (!tier) {
        throw new Error(`Ticket tier "${item.tierName}" was not found.`);
      }
      if (tier.remaining < item.qty) {
        throw new Error(
          `Only ${tier.remaining} ticket(s) left for "${tier.name}" on ${event.title}.`
        );
      }

      const unitPrice = tier.price;
      const lineTotal = unitPrice * item.qty;
      rawSubtotal += lineTotal;

      if (
        promoDoc &&
        String(event.organizerId) === String(promoDoc.organizerId) &&
        (!promoDoc.eventId || String(promoDoc.eventId) === String(event._id))
      ) {
        discountAmount += Math.round((lineTotal * promoDoc.discountPct) / 100);
      }

      const updatedTiers = event.tiers.map((t) =>
        t.id === tier.id ? { ...t, remaining: Math.max(0, t.remaining - item.qty) } : t
      );
      await ctx.db.patch(event._id, { tiers: updatedTiers });

      verifiedItems.push({
        eventId: event._id,
        eventTitle: event.title,
        tierId: tier.id,
        tierName: tier.name,
        price: unitPrice,
        qty: item.qty,
      });
    }

    if (promoDoc && discountAmount > 0) {
      await ctx.db.patch(promoDoc._id, { uses: promoDoc.uses + 1 });
    }

    const subtotal = Math.max(0, rawSubtotal - discountAmount);
    const isFreeOrder = subtotal === 0;

    // Consistent with computeFees in src/lib/format.ts:
    // Service fee: 3.5% + ₦100 capped at ₦2,500; Gateway fee: 1.5%
    const platformFee = isFreeOrder ? 0 : Math.min(2500, Math.round(subtotal * 0.035) + 100);
    const gatewayFee = isFreeOrder ? 0 : Math.round(subtotal * 0.015);
    const freeEventOrgFee = isFreeOrder ? 2500 : 0;
    const totalFees = platformFee + gatewayFee;
    const grandTotal = subtotal + totalFees;

    const orderIdCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const orderDocId = await ctx.db.insert('orders', {
      orderId: orderIdCode,
      userId: user._id,
      customerName: args.customerName.trim() || user.name,
      customerEmail: user.email,
      customerPhone: args.customerPhone?.trim() || user.phone,
      items: verifiedItems,
      subtotal,
      promoCode: promoDoc && discountAmount > 0 ? promoDoc.code : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      fees: {
        platformFee,
        freeEventOrgFee,
        gatewayFee,
        total: totalFees,
      },
      total: grandTotal,
      paymentMethod: args.paymentMethod,
      paymentStatus: 'paid',
      transactionRef: args.transactionRef,
      paidAt: Date.now(),
      createdAt: Date.now(),
    });

    // Issue individual cryptographic tickets
    const issuedTickets = [];
    const holderName = args.customerName.trim() || user.name;
    for (const item of verifiedItems) {
      for (let i = 0; i < item.qty; i++) {
        const ticketCode = `CD-${Math.floor(1000 + Math.random() * 9000)}-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`;
        const qrPayload = JSON.stringify({
          app: 'COORDINA',
          v: 1,
          ticketCode,
          orderId: orderIdCode,
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          attendeeName: holderName,
          tierName: item.tierName,
          sig: `${ticketCode}_${Date.now()}`,
        });

        const ticketDocId = await ctx.db.insert('tickets', {
          ticketCode,
          orderId: orderDocId,
          eventId: item.eventId,
          userId: user._id,
          attendeeName: holderName,
          attendeeEmail: user.email,
          tierId: item.tierId,
          tierName: item.tierName,
          price: item.price,
          qrHash: qrPayload,
          status: 'valid',
          createdAt: Date.now(),
        });

        issuedTickets.push({
          id: ticketDocId,
          ticketCode,
          eventId: String(item.eventId),
          eventTitle: item.eventTitle,
          tierName: item.tierName,
          price: item.price,
          qrHash: qrPayload,
        });
      }
    }

    // Clear purchased items from user's Convex plan cart
    const userCart = await ctx.db
      .query('cart_items')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect();
    for (const ci of userCart) {
      await ctx.db.delete(ci._id);
    }

    await ctx.db.insert('notifications', {
      userId: user._id,
      title: 'Tickets Confirmed!',
      message: `Your booking for ${verifiedItems[0]?.eventTitle} (${issuedTickets.length} pass${
        issuedTickets.length > 1 ? 'es' : ''
      }) is ready in your Wallet.`,
      type: 'ticket',
      actionUrl: '/tickets',
      read: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: holderName,
      actorRole: user.role,
      actorId: user._id,
      action: 'ORDER_COMPLETED',
      targetEntity: 'orders',
      targetId: orderDocId,
      details: `Completed order ${orderIdCode} for ₦${grandTotal.toLocaleString()} (${issuedTickets.length} tickets, ref ${args.transactionRef})`,
      timestamp: Date.now(),
    });

    return {
      orderId: orderIdCode,
      orderDocId,
      tickets: issuedTickets,
      subtotal,
      discountAmount,
      fees: totalFees,
      total: grandTotal,
    };
  },
});

export const getMyOrders = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getOrderByOrderId = query({
  args: {
    orderId: v.string(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const caller = await ctx.db.get(args.userId);
    if (!caller) return null;

    const order = await ctx.db
      .query('orders')
      .withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
      .first();

    if (!order) return null;
    if (caller.role !== 'admin' && String(order.userId) !== String(caller._id)) {
      return null;
    }

    const tickets = await ctx.db
      .query('tickets')
      .withIndex('by_orderId', (q) => q.eq('orderId', order._id))
      .collect();

    const populatedEvents = await Promise.all(
      order.items.map(async (item) => {
        const ev = await ctx.db.get(item.eventId);
        return ev ? { ...ev, tierName: item.tierName, qty: item.qty, unitPrice: item.price } : null;
      })
    );

    return {
      ...order,
      tickets,
      events: populatedEvents.filter((e): e is NonNullable<typeof e> => e !== null),
    };
  },
});

export const getUserTickets = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return { active: [], history: [] };

    const owned = await ctx.db
      .query('tickets')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    const transferredAway = await ctx.db
      .query('tickets')
      .withIndex('by_transferredFromUserId', (q) => q.eq('transferredFromUserId', args.userId))
      .collect();

    const populateTicket = async (t: any) => {
      const event: any = await ctx.db.get(t.eventId);
      let space: any = null;
      let organizerName = 'Event Host';
      if (event) {
        if (event.spaceId) space = await ctx.db.get(event.spaceId);
        const org: any = await ctx.db.get(event.organizerId);
        if (org) organizerName = org.businessName;
      }
      return {
        ...t,
        event: event ? { ...event, organizerName } : null,
        space,
      };
    };

    const populatedOwned = await Promise.all(owned.map(populateTicket));
    const populatedTransferred = await Promise.all(transferredAway.map(populateTicket));

    const active = populatedOwned
      .filter((t) => t.event && !t.refundRequested && t.status !== 'cancelled')
      .sort((a, b) => a.event.start.localeCompare(b.event.start));

    const historyMap = new Map<string, any>();
    for (const t of populatedOwned) {
      if (t.refundRequested || t.status === 'cancelled' || t.status === 'used') {
        historyMap.set(String(t._id), t);
      }
    }
    for (const t of populatedTransferred) {
      if (String(t.userId) !== String(args.userId)) {
        historyMap.set(String(t._id), { ...t, wasTransferredAway: true });
      }
    }

    return {
      active,
      history: Array.from(historyMap.values()).sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const transferTicket = mutation({
  args: {
    ticketId: v.id('tickets'),
    fromUserId: v.id('users'),
    recipient: v.string(),
  },
  handler: async (ctx, args) => {
    const sender = await ctx.db.get(args.fromUserId);
    if (!sender || !sender.emailVerified) {
      throw new Error('Verify your email address before transferring tickets.');
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || String(ticket.userId) !== String(args.fromUserId)) {
      throw new Error('You do not own this ticket.');
    }
    if (ticket.status !== 'valid' || ticket.refundRequested) {
      throw new Error('Only active, unused passes can be transferred.');
    }

    const cleanRecipient = args.recipient.trim();
    if (!cleanRecipient) {
      throw new Error('Enter the recipient email address.');
    }

    const isEmail = cleanRecipient.includes('@');
    const recipientUser = isEmail
      ? await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', cleanRecipient.toLowerCase()))
          .first()
      : null;

    if (recipientUser && String(recipientUser._id) === String(sender._id)) {
      throw new Error('You cannot transfer a ticket to yourself.');
    }

    const event = await ctx.db.get(ticket.eventId);
    const order = await ctx.db.get(ticket.orderId);
    const newCode = `CD-${Math.floor(1000 + Math.random() * 9000)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    const nextHolderName = recipientUser ? recipientUser.name : cleanRecipient;
    const nextHolderEmail = recipientUser
      ? recipientUser.email
      : isEmail
      ? cleanRecipient.toLowerCase()
      : ticket.attendeeEmail;

    const newQr = JSON.stringify({
      app: 'COORDINA',
      v: 1,
      ticketCode: newCode,
      orderId: order?.orderId ?? '',
      eventId: ticket.eventId,
      eventTitle: event?.title ?? 'COORDINA Event',
      attendeeName: nextHolderName,
      tierName: ticket.tierName,
      sig: `${newCode}_${Date.now()}`,
    });

    await ctx.db.patch(ticket._id, {
      ticketCode: newCode,
      qrHash: newQr,
      userId: recipientUser ? recipientUser._id : undefined,
      attendeeName: nextHolderName,
      attendeeEmail: nextHolderEmail,
      transferredFromUserId: sender._id,
      transferredToName: nextHolderName,
      transferredToEmail: isEmail ? cleanRecipient.toLowerCase() : undefined,
      transferredAt: Date.now(),
    });

    if (recipientUser) {
      await ctx.db.insert('notifications', {
        userId: recipientUser._id,
        title: 'Ticket Transferred to You!',
        message: `${sender.name} sent you a ${ticket.tierName} pass for ${event?.title ?? 'an upcoming event'}.`,
        type: 'ticket',
        actionUrl: '/tickets',
        read: false,
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert('audit_logs', {
      actorName: sender.name,
      actorRole: sender.role,
      actorId: sender._id,
      action: 'TICKET_TRANSFERRED',
      targetEntity: 'tickets',
      targetId: ticket._id,
      details: `Transferred pass for ${event?.title ?? ticket.eventId} to ${nextHolderName} (new code ${newCode})`,
      timestamp: Date.now(),
    });

    return {
      newCode,
      recipientName: nextHolderName,
      deliveredInApp: Boolean(recipientUser),
    };
  },
});

export const requestRefund = mutation({
  args: {
    ticketId: v.id('tickets'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.emailVerified) {
      throw new Error('Verify your email before submitting a refund request.');
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || String(ticket.userId) !== String(args.userId)) {
      throw new Error('Ticket not found in your wallet.');
    }
    if (ticket.status === 'used') {
      throw new Error('Used tickets are not eligible for refund.');
    }

    await ctx.db.patch(ticket._id, {
      refundRequested: true,
      refundRequestedAt: Date.now(),
    });

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'TICKET_REFUND_REQUESTED',
      targetEntity: 'tickets',
      targetId: ticket._id,
      details: `Refund requested on ticket ${ticket.ticketCode} (₦${ticket.price.toLocaleString()})`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const checkInTicket = mutation({
  args: {
    ticketCode: v.string(),
    scannerUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const scanner = await ctx.db.get(args.scannerUserId);
    if (!scanner || !scanner.emailVerified) {
      return { success: false, message: 'Authorized verified staff account required to scan passes.' };
    }
    if (
      scanner.role !== 'organiser' &&
      scanner.role !== 'venue_manager' &&
      scanner.role !== 'admin'
    ) {
      return {
        success: false,
        message: 'Access denied: Attendee accounts cannot operate Gate Check-In.',
      };
    }

    let lookupCode = args.ticketCode.trim();
    try {
      const parsed = JSON.parse(lookupCode);
      if (parsed && typeof parsed.ticketCode === 'string') {
        lookupCode = parsed.ticketCode.trim();
      }
    } catch {
      // Raw ticket code entered manually
    }

    const ticket = await ctx.db
      .query('tickets')
      .withIndex('by_ticketCode', (q) => q.eq('ticketCode', lookupCode))
      .first();

    if (!ticket) {
      return { success: false, message: `Invalid pass "${lookupCode}". Not found in COORDINA registry.` };
    }

    const event = await ctx.db.get(ticket.eventId);
    if (!event) {
      return { success: false, message: 'Associated event no longer exists.' };
    }

    // Enforce organizer ownership scoping!
    if (scanner.role === 'organiser') {
      const scannerOrg = await ctx.db
        .query('organizers')
        .withIndex('by_userId', (q) => q.eq('userId', scanner._id))
        .first();
      if (!scannerOrg || String(scannerOrg._id) !== String(event.organizerId)) {
        return {
          success: false,
          message: `Unauthorized gate scan: "${event.title}" belongs to another Event Planner.`,
        };
      }
    }

    if (ticket.refundRequested || ticket.status === 'cancelled') {
      return {
        success: false,
        message: 'Ticket has been cancelled or flagged for refund.',
        ticket: { ...ticket, eventTitle: event.title },
      };
    }

    if (ticket.status === 'used') {
      return {
        success: false,
        message: `Ticket ALREADY CHECKED IN at ${
          ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'earlier'
        }.`,
        ticket: { ...ticket, eventTitle: event.title },
      };
    }

    await ctx.db.patch(ticket._id, {
      status: 'used',
      checkedInAt: Date.now(),
      checkedInBy: scanner.name,
    });

    await ctx.db.insert('audit_logs', {
      actorName: scanner.name,
      actorRole: scanner.role,
      actorId: scanner._id,
      action: 'TICKET_CHECKIN',
      targetEntity: 'tickets',
      targetId: ticket._id,
      details: `Checked in ${ticket.ticketCode} (${ticket.attendeeName}) for ${event.title}`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: 'Access Granted! Cryptographic pass verified.',
      ticket: {
        ...ticket,
        status: 'used' as const,
        eventTitle: event.title,
      },
    };
  },
});
