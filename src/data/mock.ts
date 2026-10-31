import type { CEvent, Organiser, Space, Category, EventVerificationRecord, AuditLog } from '../types';

export const CATEGORIES: Category[] = ['Concerts', 'Nightlife', 'Food', 'Faith', 'Tech', 'Art', 'Sports', 'Networking'];

export const CATEGORY_ICON: Record<Category, string> = {
  Concerts: 'music_note',
  Nightlife: 'nightlife',
  Food: 'restaurant',
  Faith: 'church',
  Tech: 'terminal',
  Art: 'palette',
  Sports: 'directions_run',
  Networking: 'hub',
};

export const CATEGORY_PHOTO: Record<Category, string> = {
  Concerts: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
  Nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  Food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
  Faith: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  Tech: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80',
  Art: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=900&q=80',
  Sports: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
  Networking: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
};

export const CATEGORY_GRADIENT: Record<Category, string> = {
  Concerts: 'linear-gradient(135deg,#312E81,#4F46E5)',
  Nightlife: 'linear-gradient(135deg,#0F172A,#4338CA)',
  Food: 'linear-gradient(135deg,#7C2D12,#EA580C)',
  Faith: 'linear-gradient(135deg,#1E3A8A,#3B82F6)',
  Tech: 'linear-gradient(135deg,#064E3B,#0D9488)',
  Art: 'linear-gradient(135deg,#701A75,#DB2777)',
  Sports: 'linear-gradient(135deg,#14532D,#16A34A)',
  Networking: 'linear-gradient(135deg,#1E293B,#6366F1)',
};

export const AREAS: Record<string, { city: 'Abuja' | 'Lagos'; lat: number; lng: number }> = {
  Wuse: { city: 'Abuja', lat: 9.0765, lng: 7.4698 },
  Maitama: { city: 'Abuja', lat: 9.0903, lng: 7.4934 },
  Garki: { city: 'Abuja', lat: 9.0333, lng: 7.4833 },
  Jabi: { city: 'Abuja', lat: 9.0667, lng: 7.4167 },
  Lekki: { city: 'Lagos', lat: 6.4474, lng: 3.4723 },
  'Victoria Island': { city: 'Lagos', lat: 6.4281, lng: 3.4219 },
  Ikeja: { city: 'Lagos', lat: 6.6018, lng: 3.3515 },
  Yaba: { city: 'Lagos', lat: 6.5095, lng: 3.3711 },
};

// Seeded verified organizers from database
export const organisers: Organiser[] = [
  {
    id: 'org1',
    name: 'Eclipse Live Africa',
    trust: 4.9,
    reviews: 840,
    verified: true,
    cacNumber: 'RC-1849204',
    email: 'contact@eclipseliveafrica.com',
    phone: '+234 803 555 1234',
    nin: 'NIN-8910248192',
    status: 'Organizer Verified',
  },
  {
    id: 'org2',
    name: 'Mainland BlockParty Co.',
    trust: 4.8,
    reviews: 620,
    verified: true,
    cacNumber: 'RC-1928374',
    email: 'festivals@mainlandblockparty.ng',
    phone: '+234 812 777 9900',
    nin: 'NIN-4491028471',
    status: 'Organizer Verified',
  },
  {
    id: 'org3',
    name: 'Abuja Creative Collective',
    trust: 4.7,
    reviews: 310,
    verified: true,
    cacNumber: 'RC-3910482',
    email: 'hello@abujacreatives.org',
    phone: '+234 809 111 2233',
    nin: 'NIN-5910294821',
    status: 'Organizer Verified',
  },
];

// Seeded verified spaces from database
export const spaces: Space[] = [
  {
    id: 'space1',
    name: 'Wuse Arts Gallery',
    type: 'Gallery',
    city: 'Abuja',
    area: 'Wuse',
    lat: 9.0765,
    lng: 7.4698,
    verified: true,
    rating: 4.9,
    hours: '10am – 8pm, Tue–Sun',
    about: 'Contemporary Nigerian sculpture, photography, and canvas exhibitions across three sunlit floors.',
    safety: 'Wheelchair accessible, security on site.',
    crowd: 'Creative & Sophisticated' as any,
    bookingFrom: 50000,
    amenities: ['Air Conditioning', 'Art Walkways', 'Wine Bar', 'Valet Parking'],
    capacity: 350,
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1000&q=80',
    photos: [
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1577720580479-7d839d829c73?auto=format&fit=crop&w=700&q=80',
    ],
    reviews: [
      { who: 'Hadiza M.', rating: 5, text: 'Exquisite ambiance for art lovers in Abuja.' },
      { who: 'Emeka O.', rating: 5, text: 'Secure parking, pristine lighting, and great wine selection.' },
    ],
  },
  {
    id: 'space2',
    name: 'Hard Rock Rooftop Lounge',
    type: 'Rooftop',
    city: 'Lagos',
    area: 'Victoria Island',
    lat: 6.4281,
    lng: 3.4219,
    verified: true,
    rating: 4.8,
    hours: '4pm – 3am daily',
    about: 'Panoramic ocean skyline views, signature cocktails, and live stage sets along the Atlantic.',
    safety: 'Strict security checkpoint, CCTV surveillance, valet.',
    crowd: 'High Energy & Classy' as any,
    bookingFrom: 75000,
    amenities: ['Ocean View', 'Cocktail Bar', 'Live Stage', 'Security Check'],
    capacity: 600,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80',
    photos: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=80',
    ],
    reviews: [
      { who: 'Tunde B.', rating: 5, text: 'Best sunset cocktails in Victoria Island. World-class acoustics.' },
      { who: 'Kemi A.', rating: 4, text: 'Energetic weekend crowd. Booking early is recommended.' },
    ],
  },
  {
    id: 'space3',
    name: 'Maitama Glass Pavilion',
    type: 'Lounge',
    city: 'Abuja',
    area: 'Maitama',
    lat: 9.0903,
    lng: 7.4934,
    verified: true,
    rating: 4.9,
    hours: '5pm – 2am daily',
    about: 'Intimate architectural glass pavilion featuring private VIP booths and an indoor botanical garden.',
    safety: 'Diplomatic zone security, secured access control.',
    crowd: 'Diplomatic & Executive' as any,
    bookingFrom: 60000,
    amenities: ['Private VIP Booths', 'Indoor Garden', 'Valet', 'Catering Kitchen'],
    capacity: 400,
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1000&q=80',
    photos: [
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80',
    ],
    reviews: [
      { who: 'Ibrahim S.', rating: 5, text: 'Quiet luxury and impeccable privacy. Perfect for elite dinners.' },
    ],
  },
];

// Seeded verified events from database
export const events: CEvent[] = [
  {
    id: 'event-art-dark',
    title: 'Art After Dark',
    category: 'Art',
    vibe: 'Classy',
    city: 'Abuja',
    area: 'Wuse',
    spaceId: 'space1',
    organiserId: 'org1',
    start: '2026-10-31T18:00:00Z',
    end: '2026-10-31T23:30:00Z',
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80',
    description: 'An intimate nocturnal showcase of contemporary Nigerian sculptures, neo-Afro beats, and sommelier-curated pairings.',
    tiers: [
      { id: 't1', name: 'Standard Gallery Pass', price: 5000, total: 200, remaining: 142 },
      { id: 't2', name: 'VIP Curator Tasting', price: 15000, total: 50, remaining: 8 },
    ],
    lat: 9.0765,
    lng: 7.4698,
    verificationStatus: 'Event Verified',
  },
  {
    id: 'event-lagos-sunset',
    title: 'Lagos Sunset Session',
    category: 'Concerts',
    vibe: 'Chill',
    city: 'Lagos',
    area: 'Victoria Island',
    spaceId: 'space2',
    organiserId: 'org2',
    start: '2026-11-01T17:00:00Z',
    end: '2026-11-01T22:00:00Z',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
    description: 'Rooftop golden hour with acoustic sets, tropical mixology, and breathtaking views over the Atlantic.',
    tiers: [
      { id: 't1', name: 'Early Bird Deck', price: 8000, total: 250, remaining: 19 },
      { id: 't2', name: 'VIP Cabana Lounge', price: 35000, total: 30, remaining: 4 },
    ],
    lat: 6.4281,
    lng: 3.4219,
    verificationStatus: 'Event Verified',
  },
];

export const initialVerifications: EventVerificationRecord[] = [
  {
    id: 'vr-101',
    eventId: 'event-art-dark',
    eventTitle: 'Art After Dark',
    category: 'Art',
    city: 'Abuja',
    area: 'Wuse',
    venueId: 'space1',
    venueName: 'Wuse Arts Gallery',
    organizerId: 'org1',
    organizerName: 'Eclipse Live Africa',
    organizerIdentity: {
      cacNumber: 'RC-1849204',
      bvnNinVerified: true,
      phoneOtpVerified: true,
      directorName: 'Samuel Onuegbu',
    },
    documents: [
      {
        id: 'doc-1',
        name: 'CAC Certificate of Incorporation.pdf',
        type: 'CAC Certificate',
        url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        uploadedAt: '2026-10-24T10:00:00Z',
        verified: true,
      },
      {
        id: 'doc-2',
        name: 'Wuse Arts Gallery Executed Lease.pdf',
        type: 'Venue Booking Agreement',
        url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
        uploadedAt: '2026-10-24T10:15:00Z',
        verified: true,
      },
    ],
    venueConfirmation: {
      id: 'vc-1',
      venueId: 'space1',
      venueName: 'Wuse Arts Gallery',
      contactEmail: 'contact@wuseartsgallery.ng',
      contactPhone: '+234 809 111 2233',
      token: 'tok_wuse_art_dark_2026',
      status: 'Confirmed',
      requestedAt: '2026-10-24T10:20:00Z',
      respondedAt: '2026-10-24T13:45:00Z',
      notes: 'Booking confirmed for the gallery floor on Oct 31, 2026.',
    },
    riskAssessment: {
      score: 5,
      level: 'Low',
      reasons: [
        'Corporate Affairs Commission (CAC) RC-1849204 verified in national registry',
        'Director Identity (NIN/BVN) authenticated via remote verification portal',
        'Venue Representative confirmed booking directly via cryptographic token response',
        'Venue Lease & Official Flyer documents inspected and approved',
      ],
      flags: {
        newOrganizer: false,
        highTicketValue: false,
        unverifiedVenue: false,
        shortNotice: false,
        missingDocumentation: false,
      },
    },
    status: 'Event Verified',
    submittedAt: '2026-10-24T10:20:00Z',
    reviewedAt: '2026-10-24T14:00:00Z',
    reviewerNotes: 'Verified CAC corporate registration and gallery lease contract.',
  },
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-24T14:00:00Z',
    actor: 'Compliance Desk (Abuja)',
    action: 'Event Verified',
    targetId: 'vr-101',
    targetType: 'Event',
    details: 'Approved Eclipse Live Africa CAC registration RC-1849204 and Wuse Arts Gallery booking agreement.',
  },
];

export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getSpace = (id: string) => spaces.find((s) => s.id === id);
export const getOrganiser = (id: string) => organisers.find((o) => o.id === id) ?? organisers[0];
export const minPrice = (e: CEvent) => Math.min(...e.tiers.map((t) => t.price));
