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
  Networking: 'Forum',
};
// Fix lowercase Material ligature for Networking
CATEGORY_ICON.Networking = 'hub';

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

export const organisers: Organiser[] = [
  { id: 'o1', name: 'Afro Nation Collective', trust: 4.8, reviews: 1240, verified: true },
  { id: 'o2', name: 'Naija Eats Co.', trust: 4.6, reviews: 612, verified: true },
  { id: 'o3', name: 'TechNaija', trust: 4.7, reviews: 893, verified: true },
  { id: 'o4', name: 'Grace Assembly', trust: 4.9, reviews: 2210, verified: true },
  { id: 'o5', name: 'Canvas & Co', trust: 4.4, reviews: 184, verified: true },
  { id: 'o6', name: 'Lagos Run Club', trust: 4.5, reviews: 480, verified: false },
];

export const spaces: Space[] = [
  mkSpace(
    's1', 'Cloud 9 Rooftop', 'Rooftop', 'Lekki', true, 4.7, '4pm – 3am daily',
    'Panoramic skyline views, signature cocktails, and curated Afrobeats & house sets every weekend.',
    'Security on site, well-lit entry, CCTV.', 'Busy', 25000,
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=700&q=80',
    ],
    0.0012, -0.0015,
  ),
  mkSpace(
    's2', 'Wuse Arts Gallery', 'Gallery', 'Wuse', true, 4.5, '10am – 7pm, Tue–Sun',
    'Contemporary Nigerian sculpture, photography, and canvas exhibitions across three sunlit floors.',
    'Wheelchair accessible, security on site.', 'Quiet', 80000,
    'https://images.unsplash.com/photo-1577720580479-7d839d829c73?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=700&q=80',
    ],
    -0.0014, 0.0011,
  ),
  mkSpace(
    's3', 'Maitama Lounge', 'Lounge', 'Maitama', true, 4.6, '5pm – 2am daily',
    'Intimate architectural lounge featuring live acoustic & jazz quartets and a modern West African kitchen.',
    'Valet parking, security on site.', 'Moderate', 60000,
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?auto=format&fit=crop&w=700&q=80',
    ],
    0.0018, 0.0013,
  ),
  mkSpace(
    's4', 'Elegushi Beach Club', 'Beach spot', 'Lekki', false, 4.2, '9am – 11pm daily',
    'Private cabanas, ocean breeze, grilled suya platters, and sunset DJ sessions along the Atlantic.',
    'Crowded on weekends. Keep valuables close.', 'Busy', 40000,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=700&q=80',
    ],
    -0.0016, 0.0019,
  ),
  mkSpace(
    's5', 'Hub Café Ikeja', 'Co-working café', 'Ikeja', true, 4.5, '7am – 9pm daily',
    'Minimalist workspace & specialty coffee bar with fiber Wi-Fi, 24/7 solar backup, and courtyard seating.',
    'Backup power, daytime venue.', 'Moderate', 15000,
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=700&q=80',
    ],
    0.001, -0.0011,
  ),
  mkSpace(
    's6', 'Jabi Lake Pavilion', 'Lounge', 'Jabi', true, 4.4, '12pm – 11pm daily',
    'Open-air waterfront pavilion designed for food markets, acoustic evenings, and community runs.',
    'Open-air, security patrols.', 'Moderate', 35000,
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=700&q=80',
    ],
    -0.0011, 0.0014,
  ),
  mkSpace(
    's7', 'Landmark Centre VI', 'Lounge', 'Victoria Island', true, 4.6, '10am – 11pm daily',
    'Premier oceanfront event destination with exhibition halls, boardwalk dining, and private lounges.',
    'Gated, security and CCTV.', 'Busy', 120000,
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=700&q=80',
    ],
    0.0015, -0.0012,
  ),
];

function mkSpace(
  id: string, name: string, type: Space['type'], area: string, verified: boolean, rating: number,
  hours: string, about: string, safety: string, crowd: Space['crowd'], bookingFrom: number,
  image: string, photos: string[], dLat: number, dLng: number,
): Space {
  const a = AREAS[area];

  const amenitiesMap: Record<Space['type'], string[]> = {
    Rooftop: ['Skyline View', 'Craft Cocktails', 'Valet Parking', 'Dual Backup Power', 'High-Speed Wi-Fi'],
    Gallery: ['Curated Art Vault', 'Acoustic Treatment', 'Espresso Bar', 'Climate Control', 'Wheelchair Access'],
    'Beach spot': ['Ocean Cabanas', 'Live Suya Grill', 'Beach Volleyball', 'Trained Lifeguards', 'Sunset Deck'],
    'Co-working café': ['Fiber Wi-Fi (150 Mbps)', 'Private Call Booths', 'Continuous Power', 'Artisanal Brews', 'Ergonomic Seating'],
    Lounge: ['VIP Table Service', 'Resident DJ Console', 'Secured Valet', 'Private Dining Room', 'CCTV Surveillance'],
  };

  const bestForMap: Record<Space['type'], string[]> = {
    Rooftop: ['Sundowners', 'Date Night', 'Birthday Soirées'],
    Gallery: ['Art Enthusiasts', 'Intimate Mixers', 'Weekend Inspiration'],
    'Beach spot': ['Squad Escapes', 'Day Parties', 'Coastal Relaxation'],
    'Co-working café': ['Remote Founders', 'Deep Work Sessions', 'Coffee Catch-ups'],
    Lounge: ['Celebrations', 'Weekend Nightlife', 'Networking Drinks'],
  };

  const dressCodeMap: Record<Space['type'], string> = {
    Rooftop: 'Smart Casual / Chic',
    Gallery: 'Creative & Relaxed',
    'Beach spot': 'Resort Wear / Beach Chic',
    'Co-working café': 'Casual',
    Lounge: 'Glamorous / Night Out',
  };

  const capacityMap: Record<Space['type'], number> = {
    Rooftop: 350,
    Gallery: 180,
    'Beach spot': 650,
    'Co-working café': 110,
    Lounge: 420,
  };

  return {
    id, name, type, area, city: a.city, lat: a.lat + dLat, lng: a.lng + dLng,
    verified, rating, hours, about, safety, crowd, bookingFrom, image, photos,
    amenities: amenitiesMap[type],
    bestFor: bestForMap[type],
    dressCode: dressCodeMap[type],
    capacity: capacityMap[type],
    reviews: [
      { who: 'Chioma A.', rating: 5, text: 'Great atmosphere, felt completely safe, and the team was attentive.' },
      { who: 'Tunde B.', rating: 4, text: 'Beautiful space. Reserve ahead on Fridays and Saturdays.' },
      { who: 'Amina K.', rating: 5, text: 'Clean layout, great sound, and transparent pricing.' },
    ],
  };
}

const base = new Date();
base.setHours(0, 0, 0, 0);
const at = (dayOffset: number, hour: number, min = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

interface E {
  id: string; t: string; c: Category; v: CEvent['vibe']; area: string; s: string; o: string;
  d: number; h: number; dur: number; desc: string; img: string; tiers: [string, number, number, number][];
}

const raw: E[] = [
  {
    id: 'e1', t: 'Afrobeats Night Live', c: 'Concerts', v: 'Energetic', area: 'Lekki', s: 's1', o: 'o1', d: 0, h: 20, dur: 3,
    desc: 'Headline Afrobeats performers and live percussion under the Lekki skyline. Doors open at 8:00 PM.',
    img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1000&q=80',
    tiers: [['General Admission', 10000, 120, 400], ['VIP Deck', 35000, 12, 80], ['Table for 6', 250000, 2, 10]],
  },
  {
    id: 'e2', t: 'Rooftop Brunch & Beats', c: 'Food', v: 'Chill', area: 'Ikeja', s: 's5', o: 'o2', d: 1, h: 10, dur: 3,
    desc: 'Chef-curated brunch plates, bottomless mimosas, and a sunlit soulful house set.',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Standard Pass', 15000, 60, 100], ['Couple Pass', 27000, 20, 40]],
  },
  {
    id: 'e3', t: 'Abuja Tech Summit', c: 'Tech', v: 'Creative', area: 'Maitama', s: 's3', o: 'o3', d: 2, h: 9, dur: 8,
    desc: 'Founders, product designers, engineers, and VCs shaping West Africa’s digital economy.',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Early Bird', 8000, 4, 150], ['Regular Pass', 15000, 300, 500]],
  },
  {
    id: 'e4', t: 'Sunday Worship & Acoustic', c: 'Faith', v: 'Family', area: 'Wuse', s: 's2', o: 'o4', d: 3, h: 17, dur: 3,
    desc: 'An uplifting evening of contemporary gospel music, reflection, and community.',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Free RSVP', 0, 800, 1000]],
  },
  {
    id: 'e5', t: 'Art After Dark', c: 'Art', v: 'Classy', area: 'Wuse', s: 's2', o: 'o5', d: 0, h: 18, dur: 3,
    desc: 'Private evening exhibition walk, live canvas session, and natural wine tasting.',
    img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Gallery Entry', 5000, 70, 120]],
  },
  {
    id: 'e6', t: 'Lagos Street Food Fest', c: 'Food', v: 'Family', area: 'Victoria Island', s: 's7', o: 'o2', d: 1, h: 14, dur: 7,
    desc: 'Over 40 artisanal kitchens, smoky jollof cook-offs, craft mocktails, and live DJs.',
    img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Day Entry', 3000, 900, 1500], ['Tasting Passport', 9000, 150, 300]],
  },
  {
    id: 'e7', t: 'Sunset Beach Session', c: 'Nightlife', v: 'Energetic', area: 'Lekki', s: 's4', o: 'o1', d: 1, h: 21, dur: 5,
    desc: 'Oceanfront electronic & Afro-house showcase from golden hour into late night.',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Regular', 12000, 8, 600], ['Cabana VIP', 40000, 30, 100]],
  },
  {
    id: 'e8', t: 'Founders Evening Mixer', c: 'Networking', v: 'Classy', area: 'Victoria Island', s: 's7', o: 'o3', d: 0, h: 17, dur: 3,
    desc: 'Curated conversations for operators, creatives, and angel investors over cocktails.',
    img: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Guest Pass', 6000, 90, 150]],
  },
  {
    id: 'e9', t: 'Jabi Sunrise 5K Run', c: 'Sports', v: 'Energetic', area: 'Jabi', s: 's6', o: 'o6', d: 2, h: 6, dur: 2,
    desc: 'Paced waterfront 5K community run followed by cold-pressed juices and breakfast bowls.',
    img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Runner Bib', 2000, 200, 300]],
  },
  {
    id: 'e10', t: 'Standup Night: Laugh Naija', c: 'Nightlife', v: 'Chill', area: 'Ikeja', s: 's5', o: 'o1', d: 2, h: 19, dur: 3,
    desc: 'An intimate club set featuring six of Nigeria’s sharpest stand-up comics.',
    img: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Standard Seat', 7000, 150, 250], ['Front Row', 20000, 40, 60]],
  },
  {
    id: 'e11', t: 'Highlife & Jazz Supper', c: 'Concerts', v: 'Classy', area: 'Maitama', s: 's3', o: 'o1', d: 1, h: 19, dur: 4,
    desc: 'Warm brass arrangements, classic West African highlife, and a three-course tasting menu.',
    img: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Lounge Seat', 18000, 50, 120], ['Dinner Table (4)', 90000, 5, 15]],
  },
  {
    id: 'e12', t: 'Midnight Amapiano Room', c: 'Nightlife', v: 'Energetic', area: 'Victoria Island', s: 's7', o: 'o1', d: 2, h: 23, dur: 5,
    desc: 'Deep log drums, guest selectors from Lagos & Johannesburg, and immersive lighting.',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80',
    tiers: [['General', 8000, 200, 500]],
  },
  {
    id: 'e13', t: 'Garki Twilight Market', c: 'Food', v: 'Chill', area: 'Garki', s: 's6', o: 'o2', d: 4, h: 18, dur: 5,
    desc: 'Artisanal street eats, ceramics, vinyl stalls, and acoustic sets under string lights.',
    img: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Market Entry', 1500, 500, 800]],
  },
  {
    id: 'e14', t: 'Yaba Design & Film Circle', c: 'Networking', v: 'Creative', area: 'Yaba', s: 's5', o: 'o5', d: 3, h: 16, dur: 3,
    desc: 'Short-film screenings, portfolio reviews, and relaxed conversation for visual storytellers.',
    img: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1000&q=80',
    tiers: [['Free Entry', 0, 100, 150], ['Supporter Pass', 3000, 40, 50]],
  },
];

// Give e7 its own distinct sunset beach party photo
raw[6].img = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80';

export const events: CEvent[] = raw.map((e, idx) => {
  const a = AREAS[e.area];
  const start = new Date(at(e.d, e.h));
  const end = new Date(start.getTime() + e.dur * 3600_000);
  const offsetLat = ((idx % 5) - 2) * 0.0012;
  const offsetLng = (((idx * 3) % 5) - 2) * 0.0012;

  // Distribute realistic verification statuses
  const statusPool: CEvent['verificationStatus'][] = [
    'Event Verified',
    'Venue Confirmed',
    'Event Verified',
    'Organizer Verified',
    'Event Verified',
    'Venue Confirmed',
    'Verification Pending',
  ];
  const verificationStatus = statusPool[idx % statusPool.length];

  return {
    id: e.id, title: e.t, category: e.c, vibe: e.v, city: a.city, area: e.area, spaceId: e.s, organiserId: e.o,
    start: start.toISOString(), end: end.toISOString(), image: e.img, description: e.desc,
    tiers: e.tiers.map((t, i) => ({ id: `${e.id}-t${i}`, name: t[0], price: t[1], remaining: t[2], total: t[3] })),
    lat: a.lat + offsetLat, lng: a.lng + offsetLng,
    verificationStatus,
  };
});

export const initialVerifications: EventVerificationRecord[] = [
  {
    id: 'vr-101',
    eventId: 'e1',
    eventTitle: 'Afrobeats Night Live',
    category: 'Concerts',
    city: 'Lagos',
    area: 'Lekki',
    venueId: 's1',
    venueName: 'Cloud 9 Rooftop',
    organizerId: 'o1',
    organizerName: 'Afro Nation Collective',
    organizerIdentity: {
      cacNumber: 'RC-1849204',
      bvnNinVerified: true,
      phoneOtpVerified: true,
      directorName: 'Babatunde Adeyemi',
    },
    documents: [
      { id: 'doc-1', name: 'CAC Incorporation Certificate.pdf', type: 'CAC Certificate', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-24T10:00:00Z', verified: true },
      { id: 'doc-2', name: 'Director NIN Slip.pdf', type: 'Director Government ID', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-24T10:05:00Z', verified: true },
      { id: 'doc-3', name: 'Cloud 9 Rooftop Booking Contract.pdf', type: 'Venue Booking Agreement', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-24T10:12:00Z', verified: true },
    ],
    venueConfirmation: {
      id: 'vc-1',
      venueId: 's1',
      venueName: 'Cloud 9 Rooftop',
      contactEmail: 'gm@cloud9rooftop.ng',
      contactPhone: '+234 803 111 2233',
      token: 'tok_cloud9_e1_9841',
      status: 'Confirmed',
      requestedAt: '2026-10-24T10:15:00Z',
      respondedAt: '2026-10-24T12:30:00Z',
      notes: 'Booking confirmed for Friday night. Hall deposit received.',
    },
    riskAssessment: {
      score: 12,
      level: 'Low',
      reasons: [
        'Organizer verified with valid CAC registration (RC-1849204) & Director identity',
        'Venue representative independently confirmed reservation & date match',
        'High historical organizer trust rating (4.8/5.0 with 1,240 reviews)',
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
    submittedAt: '2026-10-24T10:15:00Z',
    reviewedAt: '2026-10-24T14:00:00Z',
    reviewerNotes: 'Verified CAC with national registry. Venue confirmed directly. Approved for public listing.',
  },
  {
    id: 'vr-102',
    eventId: 'e2',
    eventTitle: 'Rooftop Brunch & Beats',
    category: 'Food',
    city: 'Lagos',
    area: 'Ikeja',
    venueId: 's5',
    venueName: 'The Terrace Bistro & Lounge',
    organizerId: 'o2',
    organizerName: 'Naija Eats Co.',
    organizerIdentity: {
      cacNumber: 'RC-1492019',
      bvnNinVerified: true,
      phoneOtpVerified: true,
      directorName: 'Zainab Balogun',
    },
    documents: [
      { id: 'doc-4', name: 'NaijaEats CAC Cert.pdf', type: 'CAC Certificate', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-25T11:00:00Z', verified: true },
      { id: 'doc-5', name: 'Terrace Bistro Invoice.pdf', type: 'Venue Booking Agreement', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-25T11:10:00Z', verified: true },
    ],
    venueConfirmation: {
      id: 'vc-2',
      venueId: 's5',
      venueName: 'The Terrace Bistro & Lounge',
      contactEmail: 'events@terracebistro.ng',
      contactPhone: '+234 812 444 5566',
      token: 'tok_terrace_e2_3312',
      status: 'Confirmed',
      requestedAt: '2026-10-25T11:15:00Z',
      respondedAt: '2026-10-25T15:20:00Z',
      notes: 'Saturday brunch slot confirmed for 10am to 1pm.',
    },
    riskAssessment: {
      score: 18,
      level: 'Low',
      reasons: [
        'Organizer verified with valid CAC registration & Director identity',
        'Venue representative independently confirmed reservation & date match',
      ],
      flags: {
        newOrganizer: false,
        highTicketValue: false,
        unverifiedVenue: false,
        shortNotice: false,
        missingDocumentation: false,
      },
    },
    status: 'Venue Confirmed',
    submittedAt: '2026-10-25T11:15:00Z',
    reviewedAt: '2026-10-25T16:00:00Z',
  },
  {
    id: 'vr-103',
    eventId: 'e12',
    eventTitle: 'Midnight Amapiano Room',
    category: 'Nightlife',
    city: 'Lagos',
    area: 'Victoria Island',
    venueId: 's7',
    venueName: 'Landmark Centre VI',
    organizerId: 'o1',
    organizerName: 'Afro Nation Collective',
    organizerIdentity: {
      cacNumber: 'RC-1849204',
      bvnNinVerified: true,
      phoneOtpVerified: true,
      directorName: 'Babatunde Adeyemi',
    },
    documents: [
      { id: 'doc-6', name: 'Flyer & Guest DJ Lineup.png', type: 'Event Flyer & Lineup', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-10-29T14:00:00Z', verified: true },
    ],
    venueConfirmation: {
      id: 'vc-3',
      venueId: 's7',
      venueName: 'Landmark Centre VI',
      contactEmail: 'bookings@landmarklagos.com',
      contactPhone: '+234 802 999 8877',
      token: 'tok_landmark_e12_4499',
      status: 'Pending',
      requestedAt: '2026-10-29T14:30:00Z',
      notes: 'Awaiting venue manager confirmation response.',
    },
    riskAssessment: {
      score: 42,
      level: 'Medium',
      reasons: [
        'Organizer verified with valid CAC registration',
        'Venue representative has not yet confirmed the booking reservation',
        'No written venue lease/receipt or authorization agreement attached',
      ],
      flags: {
        newOrganizer: false,
        highTicketValue: false,
        unverifiedVenue: true,
        shortNotice: false,
        missingDocumentation: true,
      },
    },
    status: 'Verification Pending',
    submittedAt: '2026-10-29T14:30:00Z',
  },
  {
    id: 'vr-104',
    eventId: 'e-susp',
    eventTitle: 'Secret Mansion Rave on the Lagoon',
    category: 'Nightlife',
    city: 'Lagos',
    area: 'Lekki',
    venueId: 's1',
    venueName: 'Cloud 9 Rooftop',
    organizerId: 'o-susp',
    organizerName: 'Unknown Promoters NG',
    organizerIdentity: {
      cacNumber: 'RC-UNREGISTERED',
      bvnNinVerified: false,
      phoneOtpVerified: true,
      directorName: 'Anonymous Contact',
    },
    documents: [],
    venueConfirmation: {
      id: 'vc-4',
      venueId: 's1',
      venueName: 'Cloud 9 Rooftop',
      contactEmail: 'manager@cloud9.ng',
      contactPhone: '+234 803 111 2233',
      token: 'tok_cloud9_susp_1122',
      status: 'Declined',
      requestedAt: '2026-10-28T09:00:00Z',
      respondedAt: '2026-10-28T10:15:00Z',
      notes: 'We have no record of this event or promoter booking our terrace. Possible scam.',
    },
    riskAssessment: {
      score: 94,
      level: 'High',
      reasons: [
        'Organizer missing Corporate Affairs Commission (CAC) or verified Director Identity',
        'First-time event organizer on COORDINA platform',
        'Venue representative declined reservation (Venue Manager stated no booking exists)',
        'No written venue lease/receipt or authorization agreement attached',
      ],
      flags: {
        newOrganizer: true,
        highTicketValue: false,
        unverifiedVenue: true,
        shortNotice: false,
        missingDocumentation: true,
      },
    },
    status: 'Event Suspended',
    submittedAt: '2026-10-28T09:00:00Z',
    reviewedAt: '2026-10-28T10:30:00Z',
    reviewerNotes: 'Venue confirmed fraudulent reservation claim. Event immediately suspended and payouts frozen.',
  },
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-28T10:30:00Z',
    actor: 'Officer Hauwa Musa (Compliance)',
    action: 'Event Suspended',
    targetId: 'vr-104',
    targetType: 'Event',
    details: 'Suspended "Secret Mansion Rave" after Cloud 9 Rooftop management issued formal booking denial.',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-25T16:00:00Z',
    actor: 'Officer Emeka Obi (Verification)',
    action: 'Venue Confirmed',
    targetId: 'vr-102',
    targetType: 'Venue',
    details: 'Verified The Terrace Bistro & Lounge booking confirmation token response from events@terracebistro.ng.',
  },
  {
    id: 'log-3',
    timestamp: '2026-10-24T14:00:00Z',
    actor: 'Officer Hauwa Musa (Compliance)',
    action: 'Event Verified',
    targetId: 'vr-101',
    targetType: 'Event',
    details: 'Approved Afro Nation Collective CAC registration RC-1849204 and Cloud 9 venue lease contract.',
  },
];

export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getSpace = (id: string) => spaces.find((s) => s.id === id);
export const getOrganiser = (id: string) => organisers.find((o) => o.id === id)!;
export const minPrice = (e: CEvent) => Math.min(...e.tiers.map((t) => t.price));
