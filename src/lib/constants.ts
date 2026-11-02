import type { CEvent, Category, City } from '../types';

export const CATEGORIES: Category[] = [
  'Concerts',
  'Nightlife',
  'Food',
  'Faith',
  'Tech',
  'Art',
  'Sports',
  'Networking',
];

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

export const AREAS: Record<string, { city: City; lat: number; lng: number }> = {
  Wuse: { city: 'Abuja', lat: 9.0765, lng: 7.4698 },
  Maitama: { city: 'Abuja', lat: 9.0903, lng: 7.4934 },
  Garki: { city: 'Abuja', lat: 9.0333, lng: 7.4833 },
  Jabi: { city: 'Abuja', lat: 9.0667, lng: 7.4167 },
  Asokoro: { city: 'Abuja', lat: 9.0479, lng: 7.5245 },
  Gwarinpa: { city: 'Abuja', lat: 9.1095, lng: 7.4042 },
  Lekki: { city: 'Lagos', lat: 6.4474, lng: 3.4723 },
  'Victoria Island': { city: 'Lagos', lat: 6.4281, lng: 3.4219 },
  Ikoyi: { city: 'Lagos', lat: 6.4549, lng: 3.4246 },
  Ikeja: { city: 'Lagos', lat: 6.6018, lng: 3.3515 },
  Yaba: { city: 'Lagos', lat: 6.5095, lng: 3.3711 },
};

export function minPrice(e: Pick<CEvent, 'tiers'>): number {
  if (!e.tiers || e.tiers.length === 0) return 0;
  return Math.min(...e.tiers.map((t) => t.price));
}

