import type { CEvent, Category, Vibe } from '../types';

/** Simple content-based recommender: interest match + vibe match + low-stock boost. */
export function recommend(events: CEvent[], interests: Category[], vibe: Vibe): CEvent[] {
  return events
    .map((e) => ({
      e,
      s: (interests.includes(e.category) ? 3 : 0) + (e.vibe === vibe ? 2 : 0) + (e.tiers[0].remaining / e.tiers[0].total < 0.2 ? 0.5 : 0),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);
}

