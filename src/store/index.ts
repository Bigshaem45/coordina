import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CEvent, Ticket, Vibe, Category, City } from '../types';
import { events as seedEvents } from '../data/mock';
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
      socialSignIn: (provider) => set({ user: { name: 'Demo User', email: `demo@${provider.toLowerCase()}.com` } }),
      signOut: () => set({ user: null }),
      onboarded: false, city: 'Abuja', interests: [], budget: 100000, vibe: 'Energetic',
      theme: 'light', lowData: false,
      cart: [], tickets: [], orders: [], customEvents: [], squads: [], bookings: [],
      savedCard: null, reports: [], checkedIn: {}, cartOpen: false, swapNotice: null,
      admin: [
        { id: 'a1', kind: 'Venue', name: 'Skyline Terrace, Lekki', by: 'Ope Adeyemi', status: 'pending' },
        { id: 'a2', kind: 'Event', name: 'Mega Detty December Preview', by: 'Unknown Promos', status: 'pending' },
        { id: 'a3', kind: 'Venue', name: 'The Garden, Wuse 2', by: 'Hauwa Musa', status: 'pending' },
      ],
      flags: [
        { id: 'f1', reason: 'Same ticket QR scanned at two gates', target: 'Order #A81C2', level: 'high', resolved: false },
        { id: 'f2', reason: 'Organiser asked buyers to pay outside COORDINA', target: 'Unknown Promos', level: 'high', resolved: false },
        { id: 'f3', reason: '15 refund requests in 1 hour', target: 'Rave on the Lagoon', level: 'med', resolved: false },
      ],

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
      checkIn: (eventId) => set((s) => ({ checkedIn: { ...s.checkedIn, [eventId]: (s.checkedIn[eventId] ?? 0) + 1 } })),
    }),
    { name: 'cho-store' },
  ),
);

export const useAllEvents = () => {
  const custom = useStore((s) => s.customEvents);
  return useMemo(() => [...custom, ...seedEvents], [custom]);
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

