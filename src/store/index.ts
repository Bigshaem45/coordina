import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { AREAS } from '../lib/constants';
import type {
  CEvent,
  Ticket,
  Vibe,
  Category,
  City,
  VerificationStatus,
  Space,
  UserRole,
} from '../types';
import type { PlanItem } from '../lib/clash';
import { toast } from '../lib/fx';
import { detectVisitorGeo, toConvexBuyerGeo } from '../lib/geo';
import { cleanErrorMessage } from '../lib/errors';

export type { UserRole };

export interface CartLine {
  eventId: string;
  tierId: string;
  qty: number;
}

export interface SessionUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city: City;
  interests: Category[];
  vibe: Vibe;
  budget: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboarded: boolean;
  organizerId: string | null;
  organizer: any | null;
}

interface UIStoreState {
  sessionUserId: string | null;
  setSessionUserId: (id: string | null) => void;
  signOut: () => void;

  guestCity: City;
  theme: 'dark' | 'light';
  lowData: boolean;
  cartOpen: boolean;
  verifyModalOpen: boolean;
  swapNotice: string | null;
  offlineTicketsByUser: Record<string, Ticket[]>;

  setTheme: (t: 'dark' | 'light') => void;
  toggleLowData: () => void;
  setCartOpen: (b: boolean) => void;
  setVerifyModalOpen: (b: boolean) => void;
  setSwapNotice: (msg: string | null) => void;
  setOfflineTicketsForUser: (userId: string, tickets: Ticket[]) => void;

  setCity: (c: City) => Promise<void>;
  setBudget: (n: number) => Promise<void>;
  addToCart: (l: CartLine) => Promise<boolean>;
  removeFromCart: (eventId: string) => Promise<void>;
  setQty: (eventId: string, qty: number) => Promise<void>;
  swapInCart: (oldId: string, newEventId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const normalizeCategory = (cat: string): Category => {
  if (cat === 'Arts & Culture') return 'Art';
  const valid: Category[] = [
    'Concerts',
    'Nightlife',
    'Food',
    'Faith',
    'Tech',
    'Art',
    'Sports',
    'Networking',
  ];
  return valid.includes(cat as Category) ? (cat as Category) : 'Concerts';
};

export function mapConvexEvent(e: any): CEvent {
  const areaCoord = AREAS[e.area] ?? (e.city === 'Lagos' ? { lat: 6.4281, lng: 3.4219 } : { lat: 9.0765, lng: 7.4698 });
  return {
    id: String(e._id),
    title: e.title,
    category: normalizeCategory(e.category),
    vibe: (e.vibe as Vibe) || 'Energetic',
    city: (e.city as City) || 'Abuja',
    area: e.area,
    spaceId: e.spaceId ? String(e.spaceId) : '',
    venueName: e.venueName,
    address: e.address,
    organiserId: String(e.organizerId),
    organiserName: e.organizerName ?? 'Event Host',
    organizerVerified: Boolean(e.organizerVerified),
    organizerCoordinaPlus: Boolean(e.organizerCoordinaPlus),
    regionRestriction: e.regionRestriction ?? undefined,
    start: e.start,
    end: e.end,
    image: e.image,
    description: e.description,
    tiers: e.tiers ?? [],
    lat: typeof e.lat === 'number' ? e.lat : areaCoord.lat,
    lng: typeof e.lng === 'number' ? e.lng : areaCoord.lng,
    status: e.status,
    rating: e.rating ?? 0,
    reviewCount: e.reviewCount ?? 0,
    reportCount: e.reportCount ?? 0,
    expectedAttendance: e.expectedAttendance ?? 0,
    verificationStatus: (e.verificationStatus as VerificationStatus) ?? 'Unverified',
  };
}

export function mapConvexSpace(s: any): Space {
  return {
    id: String(s._id),
    name: s.name,
    type: s.type,
    city: (s.city as City) || 'Abuja',
    area: s.area,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    verified: Boolean(s.verified),
    rating: s.rating ?? 0,
    reviewCount: s.reviewCount ?? 0,
    reviews: [],
    hours: s.hours || 'Open daily · Contact venue desk for schedule',
    image: s.image,
    photos: s.photos && s.photos.length > 0 ? s.photos : [s.image],
    about:
      s.about ||
      `${s.name} in ${s.area}, ${s.city}. Capacity up to ${s.capacity} guests.`,
    safety:
      s.safety ||
      (s.verified
        ? 'Verified physical address & venue security desk on COORDINA.'
        : 'Standard venue entry protocols apply.'),
    crowd: s.crowd || 'Moderate',
    bookingFrom: s.bookingFrom ?? 25000,
    amenities: s.amenities ?? [],
    bestFor: s.bestFor ?? [],
    dressCode: s.dressCode,
    capacity: s.capacity,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
  };
}

export const useStore = create<UIStoreState>()(
  persist(
    (set, get) => ({
      sessionUserId: null,
      setSessionUserId: (sessionUserId) =>
        set({ sessionUserId, cartOpen: false, verifyModalOpen: false, swapNotice: null }),
      signOut: () =>
        set({
          sessionUserId: null,
          cartOpen: false,
          verifyModalOpen: false,
          swapNotice: null,
        }),

      guestCity: 'Abuja',
      theme: 'light',
      lowData: false,
      cartOpen: false,
      verifyModalOpen: false,
      swapNotice: null,
      offlineTicketsByUser: {},

      setTheme: (theme) => set({ theme }),
      toggleLowData: () => set((s) => ({ lowData: !s.lowData })),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setVerifyModalOpen: (verifyModalOpen) => set({ verifyModalOpen }),
      setSwapNotice: (swapNotice) => set({ swapNotice }),
      setOfflineTicketsForUser: (userId, tickets) =>
        set((s) => ({
          offlineTicketsByUser: {
            ...s.offlineTicketsByUser,
            [userId]: tickets,
          },
        })),

      setCity: async (city) => {
        set({ guestCity: city });
        const uid = get().sessionUserId;
        if (uid) {
          try {
            await convex.mutation(api.auth.updateProfile, {
              id: uid as any,
              city,
            });
          } catch {
            // Keep guestCity synced locally if offline
          }
        }
      },

      setBudget: async (budget) => {
        const uid = get().sessionUserId;
        if (!uid) return;
        try {
          await convex.mutation(api.auth.updateProfile, {
            id: uid as any,
            budget,
          });
        } catch (err: any) {
          toast(err?.message || 'Unable to save budget right now.');
        }
      },

      addToCart: async (line) => {
        const uid = get().sessionUserId;
        if (!uid) {
          toast('Please log in to add events to your plan.');
          return false;
        }
        try {
          const geo = await detectVisitorGeo();
          await convex.mutation(api.cart.addOrUpdateItem, {
            userId: uid as any,
            eventId: line.eventId as any,
            tierId: line.tierId,
            qty: line.qty,
            buyerGeo: toConvexBuyerGeo(geo),
          });
          return true;
        } catch (err: any) {
          toast(cleanErrorMessage(err, 'Could not add event to plan.'));
          return false;
        }
      },

      removeFromCart: async (eventId) => {
        const uid = get().sessionUserId;
        if (!uid) return;
        try {
          await convex.mutation(api.cart.removeItem, {
            userId: uid as any,
            eventId: eventId as any,
          });
        } catch (err: any) {
          toast(err?.message || 'Could not remove item.');
        }
      },

      setQty: async (eventId, qty) => {
        const uid = get().sessionUserId;
        if (!uid) return;
        try {
          await convex.mutation(api.cart.setItemQty, {
            userId: uid as any,
            eventId: eventId as any,
            qty,
          });
        } catch (err: any) {
          toast(err?.message || 'Could not update ticket quantity.');
        }
      },

      swapInCart: async (oldId, newEventId) => {
        const uid = get().sessionUserId;
        if (!uid) return;
        try {
          const geo = await detectVisitorGeo();
          const res = await convex.mutation(api.cart.swapItem, {
            userId: uid as any,
            oldEventId: oldId as any,
            newEventId: newEventId as any,
            buyerGeo: toConvexBuyerGeo(geo),
          });
          set({ swapNotice: `Swapped in ${res.title}` });
        } catch (err: any) {
          toast(cleanErrorMessage(err, 'Could not swap event.'));
        }
      },

      clearCart: async () => {
        const uid = get().sessionUserId;
        if (!uid) return;
        try {
          await convex.mutation(api.cart.clearCart, {
            userId: uid as any,
          });
        } catch {
          // Ignore
        }
      },
    }),
    {
      name: 'coordina-session-v2',
      partialize: (s) => ({
        sessionUserId: s.sessionUserId,
        guestCity: s.guestCity,
        theme: s.theme,
        lowData: s.lowData,
        offlineTicketsByUser: s.offlineTicketsByUser,
      }),
    }
  )
);

/** Live Convex hook returning the authenticated user mapped to their exact role & profile */
export function useAuth(): {
  user: SessionUser | null;
  isLoading: boolean;
  sessionUserId: string | null;
} {
  const sessionUserId = useStore((s) => s.sessionUserId);
  const raw = useQuery(
    api.auth.getMe,
    sessionUserId ? { userId: sessionUserId as any } : 'skip'
  );

  const isLoading = Boolean(sessionUserId) && raw === undefined;

  const user = useMemo<SessionUser | null>(() => {
    if (!sessionUserId || !raw) return null;
    return {
      _id: String(raw._id),
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      role: raw.role as UserRole,
      city: ((raw.city as City) || 'Abuja') as City,
      interests: (raw.interests ?? []).map(normalizeCategory),
      vibe: ((raw.vibe as Vibe) || 'Energetic') as Vibe,
      budget: raw.budget ?? 100000,
      emailVerified: Boolean(raw.emailVerified),
      phoneVerified: Boolean(raw.phoneVerified),
      onboarded: Boolean(raw.onboarded),
      organizerId: raw.organizerId ? String(raw.organizerId) : null,
      organizer: raw.organizer ?? null,
    };
  }, [sessionUserId, raw]);

  return { user, isLoading, sessionUserId };
}

export function useCurrentUser(): SessionUser | null {
  return useAuth().user;
}

export function useActiveCity(): City {
  const guestCity = useStore((s) => s.guestCity);
  const { user } = useAuth();
  return user?.city ?? guestCity;
}

export function useEventsQuery(): { events: CEvent[]; isLoading: boolean } {
  const dbEvents = useQuery(api.events.list, {});
  const events = useMemo(() => (dbEvents ?? []).map(mapConvexEvent), [dbEvents]);
  return { events, isLoading: dbEvents === undefined };
}

export const useAllEvents = (): CEvent[] => {
  return useEventsQuery().events;
};

export function useSpacesQuery(): { spaces: Space[]; isLoading: boolean } {
  const dbSpaces = useQuery(api.spaces.list, {});
  const spaces = useMemo(() => (dbSpaces ?? []).map(mapConvexSpace), [dbSpaces]);
  return { spaces, isLoading: dbSpaces === undefined };
}

export const useAllSpaces = (): Space[] => {
  return useSpacesQuery().spaces;
};

export const usePlanItems = (): PlanItem[] => {
  const sessionUserId = useStore((s) => s.sessionUserId);
  const rows = useQuery(
    api.cart.getMyCart,
    sessionUserId ? { userId: sessionUserId as any } : 'skip'
  );

  return useMemo(() => {
    if (!sessionUserId || !rows) return [];
    return rows.map((r: any) => ({
      event: mapConvexEvent(r.event),
      tier: r.tier,
      qty: r.qty,
    }));
  }, [sessionUserId, rows]);
};
