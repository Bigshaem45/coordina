import { describe, expect, it } from 'vitest';
import { detectClashes, type PlanItem } from './clash';
import { computeFees, computeOrganiserPostingFee } from './format';
import type { CEvent } from '../types';

function makeFixtureEvent(overrides: Partial<CEvent> & { id: string }): CEvent {
  return {
    id: overrides.id,
    title: overrides.title ?? `Event ${overrides.id}`,
    category: overrides.category ?? 'Concerts',
    vibe: overrides.vibe ?? 'Energetic',
    city: overrides.city ?? 'Lagos',
    area: overrides.area ?? 'Lekki',
    spaceId: overrides.spaceId ?? 'sp_1',
    venueName: overrides.venueName ?? 'Venue',
    address: overrides.address ?? '1 Admiralty Way',
    organiserId: overrides.organiserId ?? 'org_1',
    start: overrides.start ?? '2026-12-05T19:00:00.000Z',
    end: overrides.end ?? '2026-12-05T23:00:00.000Z',
    image: overrides.image ?? '',
    description: overrides.description ?? 'Fixture event',
    tiers: overrides.tiers ?? [
      { id: 't1', name: 'Regular', price: 10000, total: 100, remaining: 50 },
      { id: 't2', name: 'VIP', price: 50000, total: 20, remaining: 15 },
    ],
    lat: overrides.lat ?? 6.4474,
    lng: overrides.lng ?? 3.4723,
  };
}

const fixtures: Record<string, CEvent> = {
  lekkiNight: makeFixtureEvent({
    id: 'ev_lekki',
    city: 'Lagos',
    area: 'Lekki',
    lat: 6.4474,
    lng: 3.4723,
  }),
  viOverlap: makeFixtureEvent({
    id: 'ev_vi',
    city: 'Lagos',
    area: 'Victoria Island',
    lat: 6.4281,
    lng: 3.4219,
  }),
  ikejaFar: makeFixtureEvent({
    id: 'ev_ikeja',
    city: 'Lagos',
    area: 'Ikeja',
    lat: 6.6018,
    lng: 3.3515,
  }),
  lowStock: makeFixtureEvent({
    id: 'ev_low',
    tiers: [{ id: 't1', name: 'Regular', price: 8000, total: 100, remaining: 4 }],
  }),
};

const item = (key: keyof typeof fixtures, tierIdx = 0): PlanItem => {
  const event = fixtures[key];
  return { event, tier: event.tiers[tierIdx], qty: 1 };
};

const shift = (it: PlanItem, startISO: string, endISO: string): PlanItem => ({
  ...it,
  event: { ...it.event, start: startISO, end: endISO },
});

describe('clash engine', () => {
  it('detects hard overlap', () => {
    const a = item('lekkiNight');
    const b = shift(item('viOverlap'), a.event.start, a.event.end);
    expect(detectClashes([a, b], 1e9).some((c) => c.type === 'hard')).toBe(true);
  });

  it('detects travel clash Lekki to Ikeja with a short gap', () => {
    const a = item('lekkiNight');
    const endA = new Date(a.event.end);
    const b = shift(
      item('ikejaFar'),
      new Date(endA.getTime() + 15 * 60000).toISOString(),
      new Date(endA.getTime() + 3 * 3600000).toISOString()
    );
    expect(detectClashes([a, b], 1e9).some((c) => c.type === 'travel')).toBe(true);
  });

  it('detects budget clash', () => {
    expect(detectClashes([item('lekkiNight', 1)], 1000).some((c) => c.type === 'budget')).toBe(
      true
    );
  });

  it('flags low stock', () => {
    expect(detectClashes([item('lowStock', 0)], 1e9).some((c) => c.type === 'soldout')).toBe(
      true
    );
  });

  it('has no clash for a single comfortable event', () => {
    expect(
      detectClashes([item('lekkiNight')], 1e9).filter((c) => c.type !== 'soldout')
    ).toHaveLength(0);
  });
});

describe('fees', () => {
  it('is zero for free orders', () => expect(computeFees(0, 1).total).toBe(0));
  it('adds fees to subtotal', () => {
    const f = computeFees(10000, 1);
    expect(f.total).toBe(10000 + f.service + f.processing + f.vat);
  });

  it('charges organiser ₦2500 per 100 capacity for free events', () => {
    const fee100 = computeOrganiserPostingFee([{ price: 0, qty: 100 }]);
    expect(fee100.isFree).toBe(true);
    expect(fee100.hundredBlocks).toBe(1);
    expect(fee100.postingFee).toBe(2500);

    const fee250 = computeOrganiserPostingFee([{ price: 0, qty: 250 }]);
    expect(fee250.hundredBlocks).toBe(3);
    expect(fee250.postingFee).toBe(7500);

    const fee500 = computeOrganiserPostingFee([{ price: 0, qty: 500 }]);
    expect(fee500.postingFee).toBe(12500);
  });

  it('charges ₦0 organiser posting fee for paid events', () => {
    const feePaid = computeOrganiserPostingFee([{ price: 5000, qty: 200 }]);
    expect(feePaid.isFree).toBe(false);
    expect(feePaid.postingFee).toBe(0);
  });
});
