import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const verificationStatusValidator = v.union(
  v.literal('Unverified'),
  v.literal('Verification Pending'),
  v.literal('Venue Confirmed'),
  v.literal('Event Verified'),
  v.literal('Organizer Verified'),
  v.literal('Coordina Trusted'),
  v.literal('Verification Rejected'),
  v.literal('Event Suspended')
);

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
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    emailVerificationCode: v.optional(v.string()),
    emailVerificationSentAt: v.optional(v.number()),
    resetCode: v.optional(v.string()),
    resetCodeSentAt: v.optional(v.number()),
    onboarded: v.optional(v.boolean()),
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
    directorName: v.optional(v.string()),
    nin: v.optional(v.string()),
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
    riskScore: v.number(),
    tier: v.union(v.literal('basic'), v.literal('verified_pro'), v.literal('enterprise')),
    faceBiometricVerified: v.optional(v.boolean()),
    faceSnapshotUrl: v.optional(v.string()),
    biometricToken: v.optional(v.string()),
    biometricConfidence: v.optional(v.number()),
    bankDetails: v.optional(
      v.object({
        bankName: v.string(),
        bankCode: v.optional(v.string()),
        accountName: v.string(),
        accountNumber: v.string(),
        recipientCode: v.optional(v.string()),
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
    type: v.string(),
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
    photos: v.optional(v.array(v.string())),
    hours: v.optional(v.string()),
    about: v.optional(v.string()),
    safety: v.optional(v.string()),
    bookingFrom: v.optional(v.number()),
    dressCode: v.optional(v.string()),
    bestFor: v.optional(v.array(v.string())),
    coverStorageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_city', ['city'])
    .index('by_verified', ['verified'])
    .index('by_area', ['area'])
    .index('by_managerUserId', ['managerUserId']),

  // 5. Events
  events: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    city: v.string(),
    area: v.string(),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    address: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    start: v.string(),
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
    verificationStatus: verificationStatusValidator,
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
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    reportCount: v.optional(v.number()),
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
    cacNumber: v.optional(v.string()),
    directorName: v.optional(v.string()),
    nin: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneOtpVerified: v.optional(v.boolean()),
    faceBiometricVerified: v.optional(v.boolean()),
    faceSnapshotUrl: v.optional(v.string()),
    biometricToken: v.optional(v.string()),
    biometricConfidence: v.optional(v.number()),
    venueName: v.optional(v.string()),
    venueEmail: v.optional(v.string()),
    venuePhone: v.optional(v.string()),
    venueToken: v.optional(v.string()),
    venueConfirmedAt: v.optional(v.string()),
    riskScore: v.optional(v.number()),
    riskLevel: v.optional(v.union(v.literal('Low'), v.literal('Medium'), v.literal('High'))),
    riskReasons: v.optional(v.array(v.string())),
    documents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          type: v.string(),
          url: v.string(),
          uploadedAt: v.string(),
          verified: v.boolean(),
        })
      )
    ),
    flyerStorageId: v.optional(v.string()),
    programmeStorageId: v.optional(v.string()),
    bookingReceiptStorageId: v.optional(v.string()),
    performerConfirmationStorageId: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    trustLevelAssigned: v.optional(verificationStatusValidator),
    reviewerNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    submittedAt: v.number(),
  })
    .index('by_eventId', ['eventId'])
    .index('by_organizerId', ['organizerId'])
    .index('by_status', ['status']),

  // 7. Venue Confirmation Requests (for remote physical confirmation)
  venue_confirmations: defineTable({
    eventId: v.id('events'),
    spaceId: v.optional(v.id('spaces')),
    venueName: v.string(),
    token: v.string(),
    contactPhone: v.string(),
    contactEmail: v.optional(v.string()),
    organizerName: v.optional(v.string()),
    cacNumber: v.optional(v.string()),
    phoneOtpCode: v.optional(v.string()),
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
    orderId: v.string(),
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
    promoCode: v.optional(v.string()),
    discountAmount: v.optional(v.number()),
    fees: v.object({
      platformFee: v.number(),
      freeEventOrgFee: v.number(),
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
    ticketCode: v.string(),
    orderId: v.id('orders'),
    eventId: v.id('events'),
    userId: v.optional(v.id('users')),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    tierId: v.optional(v.string()),
    tierName: v.string(),
    price: v.number(),
    qrHash: v.string(),
    status: v.union(v.literal('valid'), v.literal('used'), v.literal('cancelled')),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.string()),
    transferredToEmail: v.optional(v.string()),
    transferredToName: v.optional(v.string()),
    transferredFromUserId: v.optional(v.id('users')),
    transferredAt: v.optional(v.number()),
    refundRequested: v.optional(v.boolean()),
    refundRequestedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_ticketCode', ['ticketCode'])
    .index('by_orderId', ['orderId'])
    .index('by_eventId', ['eventId'])
    .index('by_userId', ['userId'])
    .index('by_transferredFromUserId', ['transferredFromUserId'])
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
        userId: v.optional(v.id('users')),
        email: v.optional(v.string()),
        name: v.string(),
        phone: v.optional(v.string()),
        avatar: v.string(),
        isHost: v.boolean(),
        arrivalStatus: v.optional(v.string()),
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
    voterUserId: v.optional(v.id('users')),
    voterName: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
    timestamp: v.number(),
  })
    .index('by_squadId', ['squadId'])
    .index('by_squad_and_event', ['squadId', 'eventId']),

  // 12. Squad Messages
  squad_messages: defineTable({
    squadId: v.id('squads'),
    senderUserId: v.id('users'),
    senderName: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index('by_squadId', ['squadId']),

  // 13. Verification Documents & General File Metadata
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

  // 14. Audit & Compliance Logs (Immutable)
  audit_logs: defineTable({
    actorName: v.string(),
    actorRole: v.string(),
    actorId: v.optional(v.string()),
    action: v.string(),
    targetEntity: v.string(),
    targetId: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index('by_targetEntity', ['targetEntity'])
    .index('by_timestamp', ['timestamp']),

  // 15. Notifications
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

  // 16. Community Reports & Fraud Alerts
  event_reports: defineTable({
    eventId: v.id('events'),
    eventTitle: v.string(),
    reporterName: v.string(),
    reporterEmail: v.optional(v.string()),
    reason: v.union(
      v.literal('fake_event'),
      v.literal('venue_mismatch'),
      v.literal('scalping'),
      v.literal('inappropriate'),
      v.literal('cancelled'),
      v.literal('other')
    ),
    details: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('dismissed'),
      v.literal('action_taken')
    ),
    actionTaken: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_eventId', ['eventId'])
    .index('by_status', ['status']),

  // 17. Event Ratings & Attendee Reviews
  event_ratings: defineTable({
    eventId: v.id('events'),
    userId: v.optional(v.id('users')),
    userName: v.string(),
    rating: v.number(),
    tags: v.array(v.string()),
    review: v.optional(v.string()),
    ticketVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_eventId', ['eventId'])
    .index('by_rating', ['rating']),

  // 18. Blacklisted & Flagged Identities
  blacklisted_identities: defineTable({
    organizerName: v.string(),
    email: v.string(),
    phone: v.string(),
    nin: v.string(),
    cacNumber: v.optional(v.string()),
    reason: v.string(),
    eventId: v.optional(v.string()),
    eventTitle: v.optional(v.string()),
    flaggedBy: v.string(),
    status: v.union(v.literal('active_blacklist'), v.literal('under_appeal'), v.literal('pardoned')),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_phone', ['phone'])
    .index('by_nin', ['nin'])
    .index('by_status', ['status']),

  // 19. Per-User Plan Cart Items
  cart_items: defineTable({
    userId: v.id('users'),
    eventId: v.id('events'),
    tierId: v.string(),
    qty: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_user_and_event', ['userId', 'eventId']),

  // 20. Per-User Social Space Reservations
  space_bookings: defineTable({
    userId: v.id('users'),
    userName: v.string(),
    userEmail: v.string(),
    spaceId: v.id('spaces'),
    spaceName: v.string(),
    date: v.string(),
    guests: v.number(),
    notes: v.optional(v.string()),
    estimatedSpend: v.number(),
    status: v.union(v.literal('Requested'), v.literal('Confirmed'), v.literal('Declined')),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_spaceId', ['spaceId']),

  // 21. Organizer Promo Codes
  promo_codes: defineTable({
    organizerId: v.id('organizers'),
    eventId: v.optional(v.id('events')),
    code: v.string(),
    discountPct: v.number(),
    uses: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_organizerId', ['organizerId'])
    .index('by_code', ['code']),

  // 22. Organizer Payout Disbursements
  payouts: defineTable({
    organizerId: v.id('organizers'),
    userId: v.id('users'),
    amount: v.number(),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    reference: v.string(),
    status: v.union(v.literal('pending'), v.literal('paid'), v.literal('failed')),
    createdAt: v.number(),
  })
    .index('by_organizerId', ['organizerId'])
    .index('by_userId', ['userId']),

  // 23. Phone OTP Challenges (Organizer & Venue Verification)
  phone_otps: defineTable({
    userId: v.id('users'),
    phone: v.string(),
    code: v.string(),
    verified: v.boolean(),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),
});
