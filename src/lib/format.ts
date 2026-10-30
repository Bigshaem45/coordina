import type { CEvent } from '../types';

export const naira = (n: number) => (n === 0 ? 'Free' : `₦${n.toLocaleString('en-NG')}`);

/** Transparent fees: 5% service fee (capped ₦2,000 per ticket line) plus flat ₦100 processing per order. VAT 7.5% on fees. */
export function computeFees(subtotal: number, lines: number) {
  if (subtotal === 0) return { service: 0, processing: 0, vat: 0, total: 0, fees: 0 };
  const service = Math.min(Math.round(subtotal * 0.05), 2000 * Math.max(lines, 1));
  const processing = 100;
  const vat = Math.round((service + processing) * 0.075);
  const fees = service + processing + vat;
  return { service, processing, vat, fees, total: subtotal + fees };
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(iso).toLocaleDateString('en-NG', opts);
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function bucket(e: CEvent): 'tonight' | 'weekend' | 'later' {
  const s = new Date(e.start), now = new Date();
  if (s.toDateString() === now.toDateString()) return 'tonight';
  const dow = s.getDay();
  const days = (s.getTime() - now.getTime()) / 864e5;
  if ((dow === 5 || dow === 6 || dow === 0) && days < 7) return 'weekend';
  return 'later';
}

export const mapLink = (e: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`;

