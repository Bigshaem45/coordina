import type { CEvent, Clash, Tier } from '../types';
import { AREAS } from '../data/mock';

export interface PlanItem { event: CEvent; tier: Tier; qty: number }

const R = 6371;
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated travel minutes between two events' areas. Lagos traffic is heavy; rush hour adds 60%. */
export function travelMinutes(a: CEvent, b: CEvent, atTime: Date): number {
  if (a.area === b.area) return 15;
  const A = AREAS[a.area], B = AREAS[b.area];
  if (A.city !== B.city) return 24 * 60; // different cities: effectively a day trip
  const hour = atTime.getHours();
  const rush = (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 20);
  const perKm = A.city === 'Lagos' ? 4 : 2.5;
  return Math.round(Math.max(15, km(A, B) * perKm) * (rush ? 1.6 : 1));
}

const isLate = (e: CEvent) => {
  const s = new Date(e.start), en = new Date(e.end);
  return s.getHours() >= 21 || en.getHours() < 5 || en.getDate() !== s.getDate();
};
const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

export function detectClashes(items: PlanItem[], budget: number): Clash[] {
  const clashes: Clash[] = [];
  const sorted = [...items].sort((a, b) => +new Date(a.event.start) - +new Date(b.event.start));

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].event, b = sorted[i + 1].event;
    const endA = +new Date(a.end), startB = +new Date(b.start);
    if (startB < endA) {
      clashes.push({
        id: `hard-${a.id}-${b.id}`, type: 'hard', eventIds: [a.id, b.id], severity: 'warn',
        message: `${a.title} runs until ${fmtT(a.end)}, but ${b.title} starts at ${fmtT(b.start)}. They overlap. Keep both?`,
      });
      continue;
    }
    const gap = Math.round((startB - endA) / 60000);
    const travel = travelMinutes(a, b, new Date(a.end));
    if (a.area !== b.area && gap < travel && gap < 12 * 60) {
      clashes.push({
        id: `travel-${a.id}-${b.id}`, type: 'travel', eventIds: [a.id, b.id], severity: 'warn',
        message: `${a.title} ends ${fmtT(a.end)} in ${a.area}. ${b.title} starts ${fmtT(b.start)} in ${b.area}. That's about ${travel} min of travel but you only have ${gap} min. Keep both?`,
      });
    } else if (day(new Date(b.start)) !== day(new Date(a.end)) && isLate(a) && new Date(b.start).getHours() < 11 && gap < 10 * 60) {
      clashes.push({
        id: `rest-${a.id}-${b.id}`, type: 'travel', eventIds: [a.id, b.id], severity: 'info',
        message: `${a.title} ends ${fmtT(a.end)} and ${b.title} starts ${fmtT(b.start)} the next morning in ${b.area}. That's a short night. Keep both?`,
      });
    }
  }

  const total = items.reduce((s, i) => s + i.tier.price * i.qty, 0);
  if (budget > 0 && total > budget) {
    clashes.push({
      id: 'budget', type: 'budget', eventIds: [], severity: 'warn',
      message: `Your plan costs ₦${total.toLocaleString()}, which is ₦${(total - budget).toLocaleString()} over your ₦${budget.toLocaleString()} budget.`,
    });
  }

  for (const it of items) {
    if (it.tier.remaining <= 10 || it.tier.remaining / it.tier.total <= 0.1) {
      clashes.push({
        id: `sold-${it.event.id}`, type: 'soldout', eventIds: [it.event.id], severity: 'info',
        message: `Only ${it.tier.remaining} ${it.tier.name} tickets left for ${it.event.title}. Check out soon.`,
      });
    }
  }

  const lateRun = sorted.filter((i) => isLate(i.event));
  for (let i = 0; i + 2 < lateRun.length; i++) {
    const d0 = day(new Date(lateRun[i].event.start));
    const d1 = day(new Date(lateRun[i + 1].event.start));
    const d2 = day(new Date(lateRun[i + 2].event.start));
    if (d1 - d0 === 864e5 && d2 - d1 === 864e5) {
      clashes.push({
        id: `fatigue-${lateRun[i].event.id}`, type: 'fatigue', eventIds: lateRun.slice(i, i + 3).map((x) => x.event.id), severity: 'info',
        message: `Three late nights in a row. Remember to rest. Want to drop one?`,
      });
      break;
    }
  }
  return clashes;
}

/** Find a same-vibe/category alternative that doesn't clash with the other plan items. */
export function suggestAlternative(target: CEvent, plan: PlanItem[], all: CEvent[], budget: number): CEvent | undefined {
  const others = plan.filter((p) => p.event.id !== target.id);
  const inPlan = new Set(plan.map((p) => p.event.id));
  return all
    .filter((e) => !inPlan.has(e.id) && e.city === target.city && (e.vibe === target.vibe || e.category === target.category))
    .map((e) => {
      const tier = e.tiers.find((t) => t.remaining > 0) ?? e.tiers[0];
      const test = [...others, { event: e, tier, qty: 1 }];
      const bad = detectClashes(test, budget).filter((c) => c.type !== 'soldout' && c.type !== 'fatigue' && c.eventIds.includes(e.id));
      const score = (e.vibe === target.vibe ? 2 : 0) + (e.category === target.category ? 1 : 0);
      return { e, bad: bad.length, score };
    })
    .filter((x) => x.bad === 0)
    .sort((a, b) => b.score - a.score)[0]?.e;
}

/** Best order = chronological. */
export const bestOrder = (items: PlanItem[]) => [...items].sort((a, b) => +new Date(a.event.start) - +new Date(b.event.start));

