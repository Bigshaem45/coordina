import { describe, expect, it } from 'vitest';
import { detectClashes, type PlanItem } from './clash';
import { computeFees } from './format';
import { events } from '../data/mock';

const item = (id: string, tierIdx = 0): PlanItem => {
  const event = events.find((e) => e.id === id)!;
  return { event, tier: event.tiers[tierIdx], qty: 1 };
};
const shift = (it: PlanItem, startISO: string, endISO: string): PlanItem => ({ ...it, event: { ...it.event, start: startISO, end: endISO } });

describe('clash engine', () => {
  it('detects hard overlap', () => {
    const a = item('e1');
    const b = shift(item('e5'), a.event.start, a.event.end);
    expect(detectClashes([a, b], 1e9).some((c) => c.type === 'hard')).toBe(true);
  });
  it('detects travel clash Lekki to Ikeja with a short gap', () => {
    const a = item('e1');
    const endA = new Date(a.event.end);
    const b = shift(item('e10'), new Date(endA.getTime() + 20 * 60000).toISOString(), new Date(endA.getTime() + 3 * 3600000).toISOString());
    expect(detectClashes([a, b], 1e9).some((c) => c.type === 'travel')).toBe(true);
  });
  it('detects budget clash', () => {
    expect(detectClashes([item('e1', 1)], 1000).some((c) => c.type === 'budget')).toBe(true);
  });
  it('flags low stock', () => {
    expect(detectClashes([item('e3', 0)], 1e9).some((c) => c.type === 'soldout')).toBe(true);
  });
  it('has no clash for a single comfortable event', () => {
    expect(detectClashes([item('e6')], 1e9).filter((c) => c.type !== 'soldout')).toHaveLength(0);
  });
});

describe('fees', () => {
  it('is zero for free orders', () => expect(computeFees(0, 1).total).toBe(0));
  it('adds fees to subtotal', () => {
    const f = computeFees(10000, 1);
    expect(f.total).toBe(10000 + f.service + f.processing + f.vat);
  });
});

