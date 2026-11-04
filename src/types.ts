export type Category = 'Concerts' | 'Nightlife' | 'Food' | 'Faith' | 'Tech' | 'Art' | 'Sports' | 'Networking';
export type City = 'Abuja' | 'Lagos';
export type Vibe = 'Chill' | 'Energetic' | 'Classy' | 'Family' | 'Creative';
export type UserRole = 'attendee' | 'organiser' | 'venue_manager' | 'admin';

export type VerificationStatus =
  | 'Coordina Trusted'
  | 'Organizer Verified'
  | 'Event Verified'
  | 'Venue Confirmed'
  | 'Verification Pending'
  | 'Verification Rejected'
  | 'Event Suspended'
  | 'Unverified';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface VerificationDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  verified: boolean;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
  flags: {
    newOrganizer: boolean;
    highTicketValue: boolean;
    unverifiedVenue: boolean;
    shortNotice: boolean;
    missingDocumentation: boolean;
  };
}

export interface VenueConfirmationRequest {
  id: string;
  venueId: string;
  venueName: string;
  contactEmail: string;
  contactPhone: string;
  token: string;
  status: 'Pending' | 'Confirmed' | 'Declined';
  requestedAt: string;
  respondedAt?: string;
  notes?: string;
}

export interface EventVerificationRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  category: Category;
  city: City;
  area: string;
  venueId: string;
  venueName: string;
  organizerId: string;
  organizerName: string;
  organizerIdentity: {
    cacNumber: string;
    bvnNinVerified: boolean;
    phoneOtpVerified: boolean;
    directorName: string;
    faceBiometricVerified?: boolean;
    faceSnapshotUrl?: string;
    biometricToken?: string;
    biometricConfidence?: number;
    biometricScannedAt?: string;
  };
  documents: VerificationDocument[];
  venueConfirmation: VenueConfirmationRequest;
  riskAssessment: RiskAssessment;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetId: string;
  targetType: 'Event' | 'Organizer' | 'Venue' | 'Policy';
  details: string;
}

export interface Tier {
  id: string;
  name: string;
  price: number;
  remaining: number;
  total: number;
}

export interface RegionRestriction {
  enabled: boolean;
  mode: 'country' | 'state' | 'multi';
  label: string;
  allowedCountries: string[];
  allowedStates?: string[];
  allowedCities?: string[];
}

export interface Organiser {
  id: string;
  name: string;
  trust: number;
  reviews: number;
  verified: boolean;
  cacNumber?: string;
  email?: string;
  phone?: string;
  nin?: string;
  isFlagged?: boolean;
  flagReason?: string;
  status?: VerificationStatus;
}

export interface BlacklistedIdentity {
  id: string;
  organizerName: string;
  email: string;
  phone: string;
  nin: string;
  cacNumber?: string;
  reason: string;
  eventTitle?: string;
  flaggedAt: string;
  status: 'active_blacklist' | 'pardoned';
}

export interface Space {
  id: string;
  name: string;
  type: 'Lounge' | 'Gallery' | 'Beach spot' | 'Co-working café' | 'Rooftop' | string;
  city: City;
  area: string;
  address?: string;
  lat: number;
  lng: number;
  verified: boolean;
  rating: number;
  reviewCount?: number;
  reviews: { who: string; rating: number; text: string }[];
  hours: string;
  image: string;
  photos: string[];
  about: string;
  safety: string;
  crowd: string;
  bookingFrom: number;
  amenities?: string[];
  bestFor?: string[];
  dressCode?: string;
  capacity?: number;
  contactPhone?: string;
  contactEmail?: string;
}

export interface CEvent {
  id: string;
  title: string;
  category: Category;
  vibe: Vibe;
  city: City;
  area: string;
  spaceId: string;
  venueName?: string;
  address?: string;
  organiserId: string;
  organiserName?: string;
  organizerVerified?: boolean;
  organizerCoordinaPlus?: boolean;
  regionRestriction?: RegionRestriction;
  start: string;
  end: string;
  image: string;
  description: string;
  tiers: Tier[];
  lat: number;
  lng: number;
  status?: string;
  rating?: number;
  reviewCount?: number;
  reportCount?: number;
  expectedAttendance?: number;
  verificationStatus?: VerificationStatus;
}

export interface Ticket {
  id: string;
  ticketCode: string;
  qrHash: string;
  eventId: string;
  eventTitle?: string;
  venueName?: string;
  city?: City;
  area?: string;
  start?: string;
  end?: string;
  image?: string;
  tierId?: string;
  tierName: string;
  price: number;
  owner: string;
  status?: string;
  used?: boolean;
  checkedInAt?: number;
  refundRequested?: boolean;
  transferredToName?: string;
  wasTransferredAway?: boolean;
  orderId: string;
}

export interface Clash {
  id: string;
  type: 'hard' | 'travel' | 'budget' | 'soldout' | 'fatigue';
  eventIds: string[];
  message: string;
  severity: 'warn' | 'info';
}
