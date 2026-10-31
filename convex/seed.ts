import { mutation } from './_generated/server';

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Check if spaces already exist
    const existingSpaces = await ctx.db.query('spaces').first();
    if (existingSpaces) {
      return { message: 'Database already has data. Skipping seed.' };
    }

    // 1. Seed System Admin User
    const adminUserId = await ctx.db.insert('users', {
      name: 'COORDINA Admin',
      email: 'admin@coordina.app',
      role: 'admin',
      city: 'Abuja',
      interests: ['Concerts', 'Tech', 'Arts & Culture'],
      vibe: 'Energetic',
      phoneVerified: true,
      createdAt: Date.now(),
    });

    // 2. Seed Default Verified Organizers
    const orgUser1 = await ctx.db.insert('users', {
      name: 'Eclipse Live Africa',
      email: 'contact@eclipseliveafrica.com',
      phone: '+2348031234567',
      role: 'organiser',
      city: 'Lagos',
      interests: ['Concerts', 'Nightlife'],
      vibe: 'Energetic',
      phoneVerified: true,
      createdAt: Date.now(),
    });

    const org1 = await ctx.db.insert('organizers', {
      userId: orgUser1,
      businessName: 'Eclipse Live Africa',
      cacNumber: 'RC-1849204',
      contactEmail: 'contact@eclipseliveafrica.com',
      contactPhone: '+2348031234567',
      website: 'https://eclipseliveafrica.com',
      bio: 'Pioneering live music festivals and premium touring experiences across West Africa.',
      status: 'verified',
      riskScore: 5,
      tier: 'enterprise',
      createdAt: Date.now(),
    });

    const orgUser2 = await ctx.db.insert('users', {
      name: 'Mainland BlockParty Co.',
      email: 'events@mainlandblockparty.com',
      phone: '+2348029876543',
      role: 'organiser',
      city: 'Lagos',
      interests: ['Nightlife', 'Concerts'],
      vibe: 'Energetic',
      phoneVerified: true,
      createdAt: Date.now(),
    });

    const org2 = await ctx.db.insert('organizers', {
      userId: orgUser2,
      businessName: 'Mainland BlockParty Co.',
      cacNumber: 'RC-1928374',
      contactEmail: 'events@mainlandblockparty.com',
      contactPhone: '+2348029876543',
      website: 'https://mainlandblockparty.com',
      bio: 'Nigeria’s biggest youth culture festival and block party tour.',
      status: 'verified',
      riskScore: 8,
      tier: 'verified_pro',
      createdAt: Date.now(),
    });

    // 3. Seed Verified Spaces
    const space1 = await ctx.db.insert('spaces', {
      name: 'Wuse Arts Gallery',
      type: 'Gallery',
      city: 'Abuja',
      area: 'Wuse',
      address: '24 Crescent, Wuse 2, Abuja',
      lat: 9.0765,
      lng: 7.4698,
      capacity: 350,
      amenities: ['Air Conditioning', 'Art Walkways', 'Wine Bar', 'Valet Parking'],
      crowd: 'Creative & Sophisticated',
      rating: 4.9,
      reviewCount: 42,
      verified: true,
      verificationDate: '2026-08-15',
      contactPhone: '+2348091112233',
      image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80',
      createdAt: Date.now(),
    });

    const space2 = await ctx.db.insert('spaces', {
      name: 'Hard Rock Rooftop Lounge',
      type: 'Rooftop',
      city: 'Lagos',
      area: 'Victoria Island',
      address: 'Plot 3 & 4, Block XVI, Oniru Estate, VI, Lagos',
      lat: 6.4281,
      lng: 3.4219,
      capacity: 600,
      amenities: ['Ocean View', 'Cocktail Bar', 'Live Stage', 'Security Check'],
      crowd: 'High Energy & Classy',
      rating: 4.8,
      reviewCount: 88,
      verified: true,
      verificationDate: '2026-07-20',
      contactPhone: '+2348023334455',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
      createdAt: Date.now(),
    });

    const space3 = await ctx.db.insert('spaces', {
      name: 'Maitama Glass Pavilion',
      type: 'Lounge',
      city: 'Abuja',
      area: 'Maitama',
      address: '14 Ibrahim Babangida Way, Maitama, Abuja',
      lat: 9.0903,
      lng: 7.4934,
      capacity: 400,
      amenities: ['Private VIP Booths', 'Indoor Garden', 'Valet', 'Catering Kitchen'],
      crowd: 'Diplomatic & Executive',
      rating: 4.9,
      reviewCount: 35,
      verified: true,
      verificationDate: '2026-09-01',
      contactPhone: '+2348055556677',
      image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=900&q=80',
      createdAt: Date.now(),
    });

    // 4. Seed Verified Events
    await ctx.db.insert('events', {
      title: 'Art After Dark',
      description: 'An intimate nocturnal showcase of contemporary Nigerian sculptures, neo-Afro beats, and sommelier-curated pairings.',
      category: 'Arts & Culture',
      city: 'Abuja',
      area: 'Wuse',
      spaceId: space1,
      venueName: 'Wuse Arts Gallery',
      address: '24 Crescent, Wuse 2, Abuja',
      start: '2026-10-31T18:00:00Z',
      end: '2026-10-31T23:30:00Z',
      organizerId: org1,
      image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80',
      tags: ['Art', 'Nightlife', 'Wine'],
      clashTags: ['nightlife', 'wuse'],
      vibe: 'Classy',
      status: 'published',
      verificationStatus: 'Coordina Trusted',
      tiers: [
        { id: 't1', name: 'Standard Gallery Pass', price: 5000, total: 200, remaining: 142 },
        { id: 't2', name: 'VIP Curator Tasting', price: 15000, total: 50, remaining: 8 },
      ],
      isFree: false,
      expectedAttendance: 250,
      featured: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert('events', {
      title: 'Lagos Sunset Session',
      description: 'Rooftop golden hour with acoustic sets, tropical mixology, and breathtaking views over the Atlantic.',
      category: 'Concerts',
      city: 'Lagos',
      area: 'Victoria Island',
      spaceId: space2,
      venueName: 'Hard Rock Rooftop Lounge',
      address: 'Oniru Estate, VI, Lagos',
      start: '2026-11-01T17:00:00Z',
      end: '2026-11-01T22:00:00Z',
      organizerId: org2,
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
      tags: ['Live Music', 'Acoustic', 'Sunset'],
      clashTags: ['music', 'vi'],
      vibe: 'Chill',
      status: 'published',
      verificationStatus: 'Coordina Trusted',
      tiers: [
        { id: 't1', name: 'Early Bird Deck', price: 8000, total: 250, remaining: 19 },
        { id: 't2', name: 'VIP Cabana Lounge', price: 35000, total: 30, remaining: 4 },
      ],
      isFree: false,
      expectedAttendance: 280,
      featured: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: 'Seeded admin, organizers, spaces, and verified events successfully.',
    };
  },
});
