import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // 1. Users (Attendees, Organizers, Venue Managers, Admins)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal('attendee'),
      v.literal('organiser'),
      v.literal('venue_manager'),
      v.literal('admin')
    ),
    city: v.string(),
    avatar: v.optional(v.string()),
    interests: v.array(v.string()),
    vibe: v.optional(v.string()),
    budget: v.optional(v.number()),
    phoneVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role'])
    .index('by_city', ['city']),

  // 2. Organizers Profile & Trust Scores
  organizers: defineTable({
    userId: v.id('users'),
    businessName: v.string(),
    cacNumber: v.optional(v.string()),
    contactEmail: v.string(),
    contactPhone: v.string(),
    website: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('verified'),
      v.literal('rejected'),
      v.literal('restricted')
    ),
    riskScore: v.number(), // 0 (lowest risk) to 100 (highest risk)
    tier: v.union(v.literal('basic'), v.literal('verified_pro'), v.literal('enterprise')),
    bankDetails: v.optional(
      v.object({
        bankName: v.string(),
        accountName: v.string(),
        accountNumber: v.string(),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_cacNumber', ['cacNumber']),

  // 3. Organizer KYC & Remote Verification Submissions
  organizer_verifications: defineTable({
    organizerId: v.id('organizers'),
    userId: v.id('users'),
    cacDocumentStorageId: v.optional(v.string()),
    directorIdStorageId: v.optional(v.string()),
    proofOfAddressStorageId: v.optional(v.string()),
    phoneOtpVerified: v.boolean(),
    otpVerifiedAt: v.optional(v.number()),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    reviewerNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    submittedAt: v.number(),
  })
    .index('by_organizerId', ['organizerId'])
    .index('by_status', ['status']),

  // 4. Social Spaces & Venues
  spaces: defineTable({
    name: v.string(),
    type: v.string(), // Lounge, Club, Rooftop, Gallery, Beach Club, Outdoor, Arena
    city: v.string(),
    area: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    capacity: v.number(),
    amenities: v.array(v.string()),
    crowd: v.string(),
    rating: v.number(),
    reviewCount: v.number(),
    verified: v.boolean(),
    verificationDate: v.optional(v.string()),
    contactPhone: v.string(),
    contactEmail: v.optional(v.string()),
    managerUserId: v.optional(v.id('users')),
    image: v.string(),
    coverStorageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_city', ['city'])
    .index('by_verified', ['verified'])
    .index('by_area', ['area']),

  // 5. Events
  events: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(), // Concerts, Nightlife, Food, Arts, Tech, Faith, Sports
    city: v.string(),
    area: v.string(),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    address: v.string(),
    start: v.string(), // ISO string e.g. 2026-10-30T18:00:00Z
    end: v.string(),
    organizerId: v.id('organizers'),
    image: v.string(),
    coverStorageId: v.optional(v.string()),
    tags: v.array(v.string()),
    clashTags: v.array(v.string()),
    vibe: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('pending_verification'),
      v.literal('published'),
      v.literal('cancelled')
    ),
    verificationStatus: v.union(
      v.literal('Unverified'),
      v.literal('Event Verified'),
      v.literal('Organizer Verified'),
      v.literal('Coordina Trusted')
    ),
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
    featured: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_city', ['city'])
    .index('by_category', ['category'])
    .index('by_status', ['status'])
    .index('by_organizerId', ['organizerId'])
    .index('by_verificationStatus', ['verificationStatus']),

  // 6. Event Verification Requests & Supporting Proof
  event_verifications: defineTable({
    eventId: v.id('events'),
    organizerId: v.id('organizers'),
    flyerStorageId: v.optional(v.string()),
    programmeStorageId: v.optional(v.string()),
    bookingReceiptStorageId: v.optional(v.string()),
    performerConfirmationStorageId: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    trustLevelAssigned: v.optional(
      v.union(
        v.literal('Unverified'),
        v.literal('Event Verified'),
        v.literal('Organizer Verified'),
        v.literal('Coordina Trusted')
      )
    ),
    reviewerNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    submittedAt: v.number(),
  })
    .index('by_eventId', ['eventId'])
    .index('by_status', ['status']),

  // 7. Venue Confirmation Requests (for remote physical confirmation)
  venue_confirmations: defineTable({
    eventId: v.id('events'),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    token: v.string(), // Cryptographic token e.g. "tok_afro_2026"
    contactPhone: v.string(),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('disputed')),
    notes: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
    confirmedByPhone: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_eventId', ['eventId'])
    .index('by_status', ['status']),

  // 8. Orders & Payments
  orders: defineTable({
    orderId: v.string(), // e.g. "ORD-2026-XXXX"
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
    subtotal: v.number(),
    fees: v.object({
      platformFee: v.number(),
      freeEventOrgFee: v.number(), // ₦2500 per 100 capacity for free events
      gatewayFee: v.number(),
      total: v.number(),
    }),
    total: v.number(),
    paymentMethod: v.union(v.literal('card'), v.literal('transfer'), v.literal('ussd')),
    paymentStatus: v.union(v.literal('pending'), v.literal('paid'), v.literal('failed')),
    transactionRef: v.string(),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_orderId', ['orderId'])
    .index('by_userId', ['userId'])
    .index('by_paymentStatus', ['paymentStatus']),

  // 9. Issued Tickets (with QR payload & offline cryptographic verification)
  tickets: defineTable({
    ticketCode: v.string(), // e.g. "CD-9482-TX"
    orderId: v.id('orders'),
    eventId: v.id('events'),
    userId: v.optional(v.id('users')),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    tierName: v.string(),
    price: v.number(),
    qrHash: v.string(), // Cryptographic signature for offline gate validation
    status: v.union(v.literal('valid'), v.literal('used'), v.literal('cancelled')),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_ticketCode', ['ticketCode'])
    .index('by_orderId', ['orderId'])
    .index('by_eventId', ['eventId'])
    .index('by_userId', ['userId'])
    .index('by_status', ['status']),

  // 10. Squads (Social Itinerary & Split Voting)
  squads: defineTable({
    name: v.string(),
    city: v.string(),
    inviteCode: v.string(),
    creatorUserId: v.optional(v.id('users')),
    creatorName: v.string(),
    members: v.array(
      v.object({
        name: v.string(),
        phone: v.optional(v.string()),
        avatar: v.string(),
        isHost: v.boolean(),
        joinedAt: v.number(),
      })
    ),
    shortlistEventIds: v.array(v.id('events')),
    status: v.union(v.literal('voting'), v.literal('locked'), v.literal('booked')),
    createdAt: v.number(),
  })
    .index('by_inviteCode', ['inviteCode'])
    .index('by_creatorUserId', ['creatorUserId']),

  // 11. Squad Votes
  squad_votes: defineTable({
    squadId: v.id('squads'),
    eventId: v.id('events'),
    voterName: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
    timestamp: v.number(),
  })
    .index('by_squadId', ['squadId'])
    .index('by_squad_and_event', ['squadId', 'eventId']),

  // 12. Verification Documents & General File Metadata
  documents: defineTable({
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    category: v.union(
      v.literal('cac_certificate'),
      v.literal('director_id'),
      v.literal('venue_booking_receipt'),
      v.literal('event_flyer'),
      v.literal('programme_doc'),
      v.literal('general_upload')
    ),
    uploaderUserId: v.optional(v.id('users')),
    relatedId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_storageId', ['storageId'])
    .index('by_category', ['category']),

  // 13. Audit & Compliance Logs (Immutable)
  audit_logs: defineTable({
    actorName: v.string(),
    actorRole: v.string(),
    actorId: v.optional(v.string()),
    action: v.string(), // e.g. "APPROVE_ORGANIZER", "SET_EVENT_TRUST", "CHECK_IN_TICKET"
    targetEntity: v.string(), // e.g. "events", "organizers", "tickets"
    targetId: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index('by_targetEntity', ['targetEntity'])
    .index('by_timestamp', ['timestamp']),

  // 14. Notifications
  notifications: defineTable({
    userId: v.id('users'),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal('verification'),
      v.literal('ticket'),
      v.literal('clash'),
      v.literal('squad'),
      v.literal('system')
    ),
    actionUrl: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_read', ['read']),
});

