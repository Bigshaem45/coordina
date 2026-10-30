export type Category = 'Concerts' | 'Nightlife' | 'Food' | 'Faith' | 'Tech' | 'Art' | 'Sports' | 'Networking';
export type City = 'Abuja' | 'Lagos';
export type Vibe = 'Chill' | 'Energetic' | 'Classy' | 'Family' | 'Creative';

export interface Tier { id: string; name: string; price: number; remaining: number; total: number }

export interface Organiser { id: string; name: string; trust: number; reviews: number; verified: boolean }

export interface Space {
  id: string; name: string; type: 'Lounge' | 'Gallery' | 'Beach spot' | 'Co-working café' | 'Rooftop';
  city: City; area: string; lat: number; lng: number; verified: boolean;
  rating: number; reviews: { who: string; rating: number; text: string }[];
  hours: string; image: string; photos: string[]; about: string;
  safety: string; crowd: 'Quiet' | 'Moderate' | 'Busy'; bookingFrom: number;
}

export interface CEvent {
  id: string; title: string; category: Category; vibe: Vibe; city: City; area: string;
  spaceId: string; organiserId: string;
  start: string; end: string; // ISO
  image: string; description: string; tiers: Tier[]; lat: number; lng: number;
}

export interface Ticket {
  id: string; eventId: string; tierId: string; tierName: string; price: number;
  owner: string; used: boolean; refundRequested?: boolean; orderId: string;
}

export interface Clash {
  id: string;
  type: 'hard' | 'travel' | 'budget' | 'soldout' | 'fatigue';
  eventIds: string[];
  message: string;
  severity: 'warn' | 'info';
}

