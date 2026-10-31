import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { CEvent, Ticket, Vibe, Category, City, EventVerificationRecord, AuditLog, VerificationStatus, Space, BlacklistedIdentity } from '../types';
import { events as seedEvents, spaces as seedSpaces, initialVerifications, initialAuditLogs, AREAS } from '../data/mock';
import type { PlanItem } from '../lib/clash';

export interface CartLine { eventId: string; tierId: string; qty: number }
export interface Order { id: string; at: string; total: number; fees: number; method: string; ticketIds: string[] }
export interface SquadMember { name: string; votes: Record<string, boolean> }
export interface Squad { id: string; name: string; eventIds: string[]; members: SquadMember[] }
export interface Booking { id: string; spaceId: string; date: string; guests: number; status: 'Requested' | 'Confirmed' }
export interface AdminItem { id: string; kind: 'Venue' | 'Event'; name: string; by: string; status: 'pending' | 'approved' | 'rejected' }
export interface FraudFlag { id: string; reason: string; target: string; level: 'high' | 'med' | 'low'; resolved: boolean }

export interface User { name: string; email: string }
interface Account extends User { password: string }

interface State {
  user: User | null; accounts: Account[];
  signUp: (name: string, email: string, password: string) => string | null;
  signIn: (email: string, password: string) => string | null;
  socialSignIn: (provider: string) => void;
  signOut: () => void;
  onboarded: boolean; city: City; interests: Category[]; budget: number; vibe: Vibe;
  theme: 'dark' | 'light'; lowData: boolean;
  cart: CartLine[]; tickets: Ticket[]; orders: Order[];
  customEvents: CEvent[]; squads: Squad[]; bookings: Booking[];
  savedCard: string | null; reports: { id: string; target: string; reason: string }[];
  admin: AdminItem[]; flags: FraudFlag[]; checkedIn: Record<string, number>;
  verifications: EventVerificationRecord[]; auditLogs: AuditLog[];
  blacklistedIdentities: BlacklistedIdentity[];
  cartOpen: boolean; swapNotice: string | null;

  finishOnboarding: (p: { city: City; interests: Category[]; budget: number; vibe: Vibe }) => void;
  setTheme: (t: 'dark' | 'light') => void; setBudget: (n: number) => void; setCity: (c: City) => void;
  toggleLowData: () => void;
  addToCart: (l: CartLine) => void; removeFromCart: (eventId: string) => void; setQty: (eventId: string, qty: number) => void;
  swapInCart: (oldId: string, newEventId: string) => void; clearCart: () => void;
  setCartOpen: (b: boolean) => void;
  completeOrder: (lines: CartLine[], total: number, fees: number, method: string) => Order;
  transferTicket: (id: string, to: string) => void; refundTicket: (id: string) => void;
  addCustomEvent: (e: CEvent) => void;
  createSquad: (name: string, eventIds: string[], members: string[]) => string;
  vote: (squadId: string, member: string, eventId: string, yes: boolean) => void;
  addMember: (squadId: string, name: string) => void;
  addBooking: (b: Omit<Booking, 'id' | 'status'>) => void;
  report: (target: string, reason: string) => void;
  adminDecide: (id: string, s: 'approved' | 'rejected') => void; resolveFlag: (id: string) => void;
  adminReviewVerification: (id: string, status: VerificationStatus, reviewerNotes?: string) => void;
  confirmVenueBooking: (token: string, confirmed: boolean, notes?: string) => boolean;
  submitForVerification: (rec: EventVerificationRecord) => void;
  addBlacklistIdentity: (record: BlacklistedIdentity) => void;
  pardonBlacklistIdentity: (id: string) => void;
  checkIdentityIsBlacklisted: (opts: { email?: string; phone?: string; nin?: string }) => { blacklisted: boolean; reason?: string; matchedField?: string };
  checkIn: (eventId: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null, accounts: [],
      signUp: (name, email, password) => {
        const e = email.trim().toLowerCase();
        if (get().accounts.some((a) => a.email === e)) return 'An account with this email already exists. Sign in instead.';
        set((s) => ({ accounts: [...s.accounts, { name, email: e, password }], user: { name, email: e }, onboarded: false }));
        return null;
      },
      signIn: (email, password) => {
        const e = email.trim().toLowerCase();
        const a = get().accounts.find((x) => x.email === e);
        if (!a) return 'No account found for this email. Create one first.';
        if (a.password !== password) return 'Incorrect password.';
        set({ user: { name: a.name, email: a.email } });
        return null;
      },
      socialSignIn: (provider) => {
        const email = `attendee@${provider.toLowerCase()}.coordina.app`;
        set({ user: { name: `${provider} Guest`, email } });
      },
      signOut: () => set({ user: null }),
      onboarded: false, city: 'Abuja', interests: [], budget: 100000, vibe: 'Energetic',
      theme: 'light', lowData: false,
      cart: [], tickets: [], orders: [], customEvents: [], squads: [], bookings: [],
      savedCard: null, reports: [], checkedIn: {}, cartOpen: false, swapNotice: null,
      verifications: initialVerifications,
      auditLogs: initialAuditLogs,
      blacklistedIdentities: [
        {
          id: 'blk-1',
          organizerName: 'Phantom Rhythms Ent.',
          email: 'events@phantomrhythms.ng',
          phone: '+234 809 999 1122',
          nin: 'NIN-9920194820',
          cacNumber: 'RC-9988112',
          reason: 'Fake lineup & non-existent venue contract in Maitama',
          eventTitle: 'Secret Mansion Rave 2026',
          flaggedAt: '2 days ago',
          status: 'active_blacklist' as const,
        },
        {
          id: 'blk-2',
          organizerName: 'Urban Scalpers Global',
          email: 'vip@urbanscalpers.ng',
          phone: '+234 814 000 7788',
          nin: 'NIN-1029384756',
          cacNumber: 'RC-7722114',
          reason: 'Ticket scalping ring extortion outside Paystack escrow',
          eventTitle: 'Lagos Island VIP Gala',
          flaggedAt: '5 days ago',
          status: 'active_blacklist' as const,
        },
      ],
      admin: [],
      flags: [],

      finishOnboarding: (p) => set({ ...p, onboarded: true }),
      setTheme: (theme) => set({ theme }), setBudget: (budget) => set({ budget }), setCity: (city) => set({ city }),
      toggleLowData: () => set((s) => ({ lowData: !s.lowData })),

      addToCart: (l) => set((s) => ({ cart: [...s.cart.filter((c) => c.eventId !== l.eventId), l] })),
      removeFromCart: (eventId) => set((s) => ({ cart: s.cart.filter((c) => c.eventId !== eventId) })),
      setQty: (eventId, qty) => set((s) => ({ cart: s.cart.map((c) => (c.eventId === eventId ? { ...c, qty: Math.max(1, Math.min(10, qty)) } : c)) })),
      swapInCart: (oldId, newEventId) => {
        const ev = [...seedEvents, ...get().customEvents].find((e) => e.id === newEventId);
        if (!ev) return;
        const tier = ev.tiers.find((t) => t.remaining > 0) ?? ev.tiers[0];
        set((s) => ({
          cart: [...s.cart.filter((c) => c.eventId !== oldId), { eventId: newEventId, tierId: tier.id, qty: 1 }],
          swapNotice: `Swapped in ${ev.title}`,
        }));
      },
      clearCart: () => set({ cart: [] }),
      setCartOpen: (cartOpen) => set({ cartOpen }),

      completeOrder: (lines, total, fees, method) => {
        const all = [...seedEvents, ...get().customEvents];
        const orderId = 'CRD' + uid().toUpperCase();
        const tickets: Ticket[] = [];
        for (const l of lines) {
          const ev = all.find((e) => e.id === l.eventId)!;
          const tier = ev.tiers.find((t) => t.id === l.tierId)!;
          for (let i = 0; i < l.qty; i++)
            tickets.push({ id: uid().toUpperCase(), eventId: ev.id, tierId: tier.id, tierName: tier.name, price: tier.price, owner: 'You', used: false, orderId });
        }
        const order: Order = { id: orderId, at: new Date().toISOString(), total, fees, method, ticketIds: tickets.map((t) => t.id) };
        set((s) => ({
          tickets: [...tickets, ...s.tickets], orders: [order, ...s.orders],
          cart: s.cart.filter((c) => !lines.some((l) => l.eventId === c.eventId)),
          savedCard: method === 'Card' ? '•••• 4242' : s.savedCard,
        }));
        return order;
      },
      transferTicket: (id, to) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, owner: to } : t)) })),
      refundTicket: (id) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, refundRequested: true } : t)) })),
      addCustomEvent: (e) => set((s) => ({ customEvents: [e, ...s.customEvents] })),

      createSquad: (name, eventIds, members) => {
        const id = uid();
        set((s) => ({ squads: [{ id, name, eventIds, members: [{ name: 'You', votes: {} }, ...members.map((m) => ({ name: m, votes: {} }))] }, ...s.squads] }));
        return id;
      },
      vote: (squadId, member, eventId, yes) =>
        set((s) => ({
          squads: s.squads.map((q) => q.id !== squadId ? q : { ...q, members: q.members.map((m) => (m.name === member ? { ...m, votes: { ...m.votes, [eventId]: yes } } : m)) }),
        })),
      addMember: (squadId, name) => set((s) => ({ squads: s.squads.map((q) => (q.id === squadId ? { ...q, members: [...q.members, { name, votes: {} }] } : q)) })),
      addBooking: (b) => set((s) => ({ bookings: [{ ...b, id: uid(), status: 'Requested' }, ...s.bookings] })),
      report: (target, reason) => set((s) => ({ reports: [{ id: uid(), target, reason }, ...s.reports] })),
      adminDecide: (id, status) => set((s) => ({ admin: s.admin.map((a) => (a.id === id ? { ...a, status } : a)) })),
      resolveFlag: (id) => set((s) => ({ flags: s.flags.map((f) => (f.id === id ? { ...f, resolved: true } : f)) })),
      submitForVerification: (rec) =>
        set((s) => ({
          verifications: [rec, ...s.verifications.filter((v) => v.id !== rec.id)],
          auditLogs: [
            {
              id: 'log-' + uid(),
              timestamp: new Date().toISOString(),
              actor: rec.organizerName,
              action: 'Submission Created',
              targetId: rec.id,
              targetType: 'Event',
              details: `Organizer submitted "${rec.eventTitle}" for verification with ${rec.documents.length} document(s).`,
            },
            ...s.auditLogs,
          ],
        })),
      adminReviewVerification: (id, status, reviewerNotes) =>
        set((s) => {
          const rec = s.verifications.find((v) => v.id === id);
          const title = rec?.eventTitle ?? id;
          return {
            verifications: s.verifications.map((v) =>
              v.id === id
                ? { ...v, status, reviewedAt: new Date().toISOString(), reviewerNotes: reviewerNotes ?? v.reviewerNotes }
                : v,
            ),
            customEvents: s.customEvents.map((e) => (e.id === rec?.eventId ? { ...e, verificationStatus: status } : e)),
            auditLogs: [
              {
                id: 'log-' + uid(),
                timestamp: new Date().toISOString(),
                actor: 'Verification Officer (Compliance)',
                action: status,
                targetId: id,
                targetType: 'Event',
                details: `Officer reviewed "${title}": Status changed to ${status}. ${reviewerNotes ? `Notes: ${reviewerNotes}` : ''}`,
              },
              ...s.auditLogs,
            ],
          };
        }),
      confirmVenueBooking: (token, confirmed, notes) => {
        let matched = false;
        set((s) => {
          const target = s.verifications.find((v) => v.venueConfirmation.token === token);
          if (!target) return s;
          matched = true;
          const newStatus = confirmed ? 'Venue Confirmed' : 'Verification Rejected';
          return {
            verifications: s.verifications.map((v) =>
              v.venueConfirmation.token === token
                ? {
                    ...v,
                    status: newStatus,
                    venueConfirmation: {
                      ...v.venueConfirmation,
                      status: confirmed ? 'Confirmed' : 'Declined',
                      respondedAt: new Date().toISOString(),
                      notes: notes ?? (confirmed ? 'Confirmed by Venue Representative' : 'Declined by Venue Representative'),
                    },
                  }
                : v,
            ),
            auditLogs: [
              {
                id: 'log-' + uid(),
                timestamp: new Date().toISOString(),
                actor: target.venueConfirmation.venueName + ' (Venue Rep)',
                action: confirmed ? 'Venue Confirmed' : 'Venue Declined',
                targetId: target.id,
                targetType: 'Venue',
                details: confirmed
                  ? `Venue representative confirmed booking for "${target.eventTitle}".`
                  : `Venue representative declined/rejected booking for "${target.eventTitle}". Notes: ${notes ?? 'None'}`,
              },
              ...s.auditLogs,
            ],
          };
        });
        return matched;
      },
      addBlacklistIdentity: (record) =>
        set((s) => ({
          blacklistedIdentities: [record, ...s.blacklistedIdentities.filter((b) => b.id !== record.id)],
          auditLogs: [
            {
              id: 'log-' + uid(),
              timestamp: new Date().toISOString(),
              actor: 'Compliance Officer',
              action: 'Organizer Flagged & Blacklisted',
              targetId: record.id,
              targetType: 'Organizer',
              details: `Flagged organizer "${record.organizerName}" (Email: ${record.email}, Phone: ${record.phone}, NIN: ${record.nin}). Reason: ${record.reason}`,
            },
            ...s.auditLogs,
          ],
        })),
      pardonBlacklistIdentity: (id) =>
        set((s) => ({
          blacklistedIdentities: s.blacklistedIdentities.map((b) =>
            b.id === id ? { ...b, status: 'pardoned' as const } : b
          ),
          auditLogs: [
            {
              id: 'log-' + uid(),
              timestamp: new Date().toISOString(),
              actor: 'Compliance Officer',
              action: 'Organizer Pardoned',
              targetId: id,
              targetType: 'Organizer',
              details: `Pardoned organizer identity record ${id} from active blacklist.`,
            },
            ...s.auditLogs,
          ],
        })),
      checkIdentityIsBlacklisted: ({ email, phone, nin }) => {
        const list = get().blacklistedIdentities.filter((b) => b.status === 'active_blacklist');
        const cleanEmail = email?.trim().toLowerCase();
        const cleanPhone = phone?.trim();
        const cleanNin = nin?.trim().toUpperCase();

        const match = list.find(
          (b) =>
            (cleanEmail && b.email.toLowerCase() === cleanEmail) ||
            (cleanPhone && b.phone === cleanPhone) ||
            (cleanNin && b.nin.toUpperCase() === cleanNin)
        );

        if (match) {
          return {
            blacklisted: true,
            reason: match.reason,
            matchedField:
              cleanNin && match.nin.toUpperCase() === cleanNin
                ? 'Director NIN'
                : cleanEmail && match.email.toLowerCase() === cleanEmail
                ? 'Organizer Email'
                : 'Phone Number',
          };
        }
        return { blacklisted: false };
      },
      checkIn: (eventId) => set((s) => ({ checkedIn: { ...s.checkedIn, [eventId]: (s.checkedIn[eventId] ?? 0) + 1 } })),
    }),
    { name: 'cho-store' },
  ),
);

export const useAllEvents = (): CEvent[] => {
  const custom = useStore((s) => s.customEvents);
  const dbEvents = useQuery(api.events.list, {});

  return useMemo(() => {
    if (dbEvents && dbEvents.length > 0) {
      const mapped: CEvent[] = dbEvents.map((e: any) => {
        const areaCoord = AREAS[e.area] ?? { lat: 9.0765, lng: 7.4698 };
        return {
          id: e._id,
          title: e.title,
          category: e.category as Category,
          vibe: e.vibe as Vibe,
          city: e.city as City,
          area: e.area,
          spaceId: e.spaceId ?? '',
          organiserId: e.organizerId,
          start: e.start,
          end: e.end,
          image: e.image,
          description: e.description,
          tiers: e.tiers,
          lat: areaCoord.lat,
          lng: areaCoord.lng,
          verificationStatus: e.verificationStatus as VerificationStatus,
        };
      });
      const dbIds = new Set(mapped.map((m) => m.id));
      const extras = custom.filter((c) => !dbIds.has(c.id));
      return [...mapped, ...extras];
    }
    return [...custom, ...seedEvents];
  }, [dbEvents, custom]);
};

export const useAllSpaces = (): Space[] => {
  const dbSpaces = useQuery(api.spaces.list, {});

  return useMemo(() => {
    if (dbSpaces && dbSpaces.length > 0) {
      return dbSpaces.map((s: any) => ({
        id: s._id,
        name: s.name,
        type: s.type as any,
        city: s.city as City,
        area: s.area,
        lat: s.lat,
        lng: s.lng,
        verified: s.verified,
        rating: s.rating,
        reviews: [
          { who: 'Verified Reviewer', rating: s.rating, text: 'Clean layout, verified amenities.' },
        ],
        hours: '10am – 11pm daily',
        image: s.image,
        photos: [s.image],
        about: `${s.name} in ${s.area}, ${s.city}. Capacity: ${s.capacity}.`,
        safety: 'Security verified by COORDINA.',
        crowd: (s.crowd as any) || 'Moderate',
        bookingFrom: 35000,
        amenities: s.amenities,
        capacity: s.capacity,
      }));
    }
    return seedSpaces;
  }, [dbSpaces]);
};

export const usePlanItems = (): PlanItem[] => {
  const cart = useStore((s) => s.cart);
  const all = useAllEvents();
  return useMemo(
    () =>
      cart.flatMap((l) => {
        const event = all.find((e) => e.id === l.eventId);
        const tier = event?.tiers.find((t) => t.id === l.tierId);
        return event && tier ? [{ event, tier, qty: l.qty }] : [];
      }),
    [cart, all],
  );
};

