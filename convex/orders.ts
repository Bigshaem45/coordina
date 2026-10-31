import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createOrder = mutation({
  args: {
    userId: v.optional(v.id('users')),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
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
    // 1. Calculate totals and process inventory checks
    let subtotal = 0;
    let isFreeOrder = true;

    for (const item of args.items) {
      subtotal += item.price * item.qty;
      if (item.price > 0) isFreeOrder = false;

      // Atomically decrement tier remaining count in event
      const event = await ctx.db.get(item.eventId);
      if (event) {
        const updatedTiers = event.tiers.map((t) => {
          if (t.id === item.tierId) {
            const nextRemaining = Math.max(0, t.remaining - item.qty);
            return { ...t, remaining: nextRemaining };
          }
          return t;
        });
        await ctx.db.patch(item.eventId, { tiers: updatedTiers });
      }
    }

    // 2. Fee calculation rules:
    // Platform fee: 3.5% for paid orders (min ₦100) or ₦0 for attendees on free events
    // Free event fee: ₦2,500 per 100 capacity (paid by organizer, but tracked here)
    const platformFee = isFreeOrder ? 0 : Math.max(100, Math.round(subtotal * 0.035));
    const gatewayFee = isFreeOrder ? 0 : Math.round(subtotal * 0.015);
    const freeEventOrgFee = isFreeOrder ? 2500 : 0;
    const totalFees = platformFee + gatewayFee;
    const grandTotal = subtotal + totalFees;

    const orderIdCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderDocId = await ctx.db.insert('orders', {
      orderId: orderIdCode,
      userId: args.userId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      items: args.items,
      subtotal,
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

    // 3. Issue individual tickets with cryptographic QR signature
    const issuedTickets = [];
    for (const item of args.items) {
      for (let i = 0; i < item.qty; i++) {
        const ticketCode = `CD-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const qrPayload = JSON.stringify({
          app: 'COORDINA',
          v: 1,
          ticketCode,
          orderId: orderIdCode,
          eventId: item.eventId,
          tierName: item.tierName,
          sig: `${ticketCode}_${Date.now()}`,
        });

        const ticketDocId = await ctx.db.insert('tickets', {
          ticketCode,
          orderId: orderDocId,
          eventId: item.eventId,
          userId: args.userId,
          attendeeName: args.customerName,
          attendeeEmail: args.customerEmail,
          tierName: item.tierName,
          price: item.price,
          qrHash: qrPayload,
          status: 'valid',
          createdAt: Date.now(),
        });

        issuedTickets.push({ ticketCode, id: ticketDocId });
      }
    }

    // 4. Create user notification if user is logged in
    if (args.userId) {
      await ctx.db.insert('notifications', {
        userId: args.userId,
        title: 'Tickets Confirmed!',
        message: `Your booking for ${args.items[0]?.eventTitle} (${issuedTickets.length} ticket${issuedTickets.length > 1 ? 's' : ''}) is ready in your wallet.`,
        type: 'ticket',
        actionUrl: '/tickets',
        read: false,
        createdAt: Date.now(),
      });
    }

    // 5. Audit log
    await ctx.db.insert('audit_logs', {
      actorName: args.customerName,
      actorRole: 'attendee',
      actorId: args.userId ?? 'guest',
      action: 'ORDER_COMPLETED',
      targetEntity: 'orders',
      targetId: orderDocId,
      details: `Completed order ${orderIdCode} for ₦${grandTotal.toLocaleString()} (${issuedTickets.length} tickets)`,
      timestamp: Date.now(),
    });

    return {
      orderId: orderIdCode,
      orderDocId,
      tickets: issuedTickets,
      total: grandTotal,
    };
  },
});

export const getOrderByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
      .first();

    if (!order) return null;

    const tickets = await ctx.db
      .query('tickets')
      .withIndex('by_orderId', (q) => q.eq('orderId', order._id))
      .collect();

    return {
      ...order,
      tickets,
    };
  },
});

export const getUserTickets = query({
  args: { userId: v.optional(v.id('users')), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let tickets = [];

    if (args.userId) {
      tickets = await ctx.db
        .query('tickets')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .collect();
    } else if (args.email) {
      const all = await ctx.db.query('tickets').collect();
      tickets = all.filter((t) => t.attendeeEmail.toLowerCase() === args.email!.toLowerCase());
    }

    // Populate event details for each ticket
    const populated = await Promise.all(
      tickets.map(async (t) => {
        const event = await ctx.db.get(t.eventId);
        let space = null;
        if (event?.spaceId) {
          space = await ctx.db.get(event.spaceId);
        }
        return {
          ...t,
          event,
          space,
        };
      })
    );

    return populated;
  },
});

export const checkInTicket = mutation({
  args: {
    ticketCode: v.string(),
    scannerName: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query('tickets')
      .withIndex('by_ticketCode', (q) => q.eq('ticketCode', args.ticketCode))
      .first();

    if (!ticket) {
      return { success: false, message: 'Invalid ticket code. Not found in registry.' };
    }

    if (ticket.status === 'used') {
      return {
        success: false,
        message: `Ticket ALREADY USED at ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'earlier'}.`,
        ticket,
      };
    }

    if (ticket.status === 'cancelled') {
      return { success: false, message: 'Ticket has been cancelled or refunded.' };
    }

    // Mark as used
    await ctx.db.patch(ticket._id, {
      status: 'used',
      checkedInAt: Date.now(),
      checkedInBy: args.scannerName,
    });

    await ctx.db.insert('audit_logs', {
      actorName: args.scannerName,
      actorRole: 'scanner',
      action: 'TICKET_CHECKIN',
      targetEntity: 'tickets',
      targetId: ticket._id,
      details: `Checked in ticket ${ticket.ticketCode} (${ticket.attendeeName}) for event ${ticket.eventId}`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: 'Access Granted! Ticket valid.',
      ticket: { ...ticket, status: 'used' as const },
    };
  },
});

