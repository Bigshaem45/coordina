import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { CATEGORIES, CATEGORY_ICON, minPrice, AREAS } from '../../lib/constants';
import {
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Cover,
  Stars,
  VerifiedBadge,
  SkeletonCard,
} from '../../design-system/ui';
import { useActiveCity, useEventsQuery, useSpacesQuery, useStore } from '../../store';
import { bucket, naira } from '../../lib/format';
import { EventCard } from './EventCard';
import type { Category, Vibe } from '../../types';

const VIBES: Vibe[] = ['Chill', 'Energetic', 'Classy', 'Family', 'Creative'];

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>((params.get('cat') as Category) || null);
  const [when, setWhen] = useState<'any' | 'tonight' | 'weekend'>('any');
  const [price, setPrice] = useState<'any' | 'free' | 'paid'>('any');
  const [maxPrice, setMaxPrice] = useState(100000);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [tab, setTab] = useState<'events' | 'spaces'>('events');
  const [spaceType, setSpaceType] = useState<string | null>(null);
  const [crowdFilter, setCrowdFilter] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  const city = useActiveCity();
  const setCity = useStore((s) => s.setCity);
  const { events: all, isLoading: eventsLoading } = useEventsQuery();
  const { spaces, isLoading: spacesLoading } = useSpacesQuery();

  const areas = Object.keys(AREAS).filter((a) => AREAS[a].city === city);
  const list = useMemo(
    () =>
      all
        .filter((e) => e.city === city)
        .filter((e) => !cat || e.category === cat)
        .filter((e) => !vibe || e.vibe === vibe)
        .filter((e) => !area || e.area === area)
        .filter((e) => when === 'any' || bucket(e) === when)
        .filter((e) =>
          price === 'free' ? minPrice(e) === 0 : price === 'paid' ? minPrice(e) > 0 : true
        )
        .filter((e) => minPrice(e) <= maxPrice)
        .filter(
          (e) =>
            !q ||
            (e.title + (e.venueName ?? '') + e.area + e.category + e.vibe)
              .toLowerCase()
              .includes(q.toLowerCase())
        ),
    [all, city, cat, vibe, area, when, price, maxPrice, q]
  );

  const spaceList = spaces.filter(
    (s) =>
      s.city === city &&
      (!spaceType || s.type === spaceType) &&
      (!crowdFilter || s.crowd === crowdFilter) &&
      (!q ||
        (s.name + s.type + s.area + (s.amenities?.join(' ') ?? ''))
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!area || s.area === area)
  );

  const activeFilters = [
    when !== 'any',
    price !== 'any',
    !!vibe,
    !!area,
    maxPrice < 100000,
  ].filter(Boolean).length;

  const reset = () => {
    setCat(null);
    setWhen('any');
    setPrice('any');
    setVibe(null);
    setArea(null);
    setMaxPrice(100000);
    setQ('');
    setParams({});
  };

  return (
    <div className="w-full min-w-0 max-w-full px-4 py-5 md:px-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Explore {city}</h1>
          <p className="muted text-xs">
            {tab === 'events'
              ? `${list.length} event${list.length === 1 ? '' : 's'} available`
              : `${spaceList.length} social space${spaceList.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setArea(null);
            setCity(city === 'Abuja' ? 'Lagos' : 'Abuja');
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
        >
          <Icon name="location_on" className="text-sm text-brand-500" />
          Switch to {city === 'Abuja' ? 'Lagos' : 'Abuja'}
        </button>
      </div>

      {/* Search Bar + Filter Button */}
      <div className="mt-4 flex gap-2.5">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, venues, areas…"
            aria-label="Search"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <Icon name="close" className="text-base" />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={() => setSheet(true)}>
          <Icon name="tune" className="text-base" />
          <span>Filters{activeFilters ? ` (${activeFilters})` : ''}</span>
        </Button>
      </div>

      {/* Segmented Switcher (Events / Spaces) */}
      <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-midnight-800">
        {(['events', 'spaces'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-8 rounded-lg px-4 text-xs font-medium capitalize transition ${
              tab === t
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      {tab === 'events' && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          <Chip active={!cat} onClick={() => setCat(null)}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
              <Icon name={CATEGORY_ICON[c]} className="text-sm" />
              <span>{c}</span>
            </Chip>
          ))}
        </div>
      )}

      {tab === 'events' ? (
        eventsLoading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="No matching events"
            text="Try clearing a filter, adjusting your price range, or switching cities."
            action={
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Social Space Discovery Filter Bar */}
          <div className="mt-4 space-y-2.5">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {['All', 'Rooftop', 'Lounge', 'Gallery', 'Beach spot', 'Co-working café'].map(
                (type) => {
                  const active = (type === 'All' && !spaceType) || spaceType === type;
                  return (
                    <Chip
                      key={type}
                      active={active}
                      onClick={() => setSpaceType(type === 'All' ? null : active ? null : type)}
                    >
                      {type}
                    </Chip>
                  );
                }
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="muted font-medium">Crowd Level:</span>
              {(['All', 'Quiet', 'Moderate', 'Busy'] as const).map((c) => {
                const active = (c === 'All' && !crowdFilter) || crowdFilter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCrowdFilter(c === 'All' ? null : active ? null : c)}
                    className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-midnight-900 dark:text-slate-300'
                    }`}
                  >
                    {c === 'Quiet'
                      ? 'Quiet (Focused)'
                      : c === 'Moderate'
                        ? 'Moderate (Vibrant)'
                        : c === 'Busy'
                          ? 'Busy (Packed)'
                          : 'All'}
                  </button>
                );
              })}
            </div>
          </div>

          {spacesLoading ? (
            <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : spaceList.length === 0 ? (
            <EmptyState
              icon="storefront"
              title="No spaces found"
              text="Try another space type, crowd filter, or search keyword."
            />
          ) : (
            <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {spaceList.map((s) => (
                <Link
                  key={s.id}
                  to={`/space/${s.id}`}
                  className="surface group overflow-hidden rounded-2xl shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Cover gradient={s.image} className="h-full w-full" label={s.name} />
                    <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-xs">
                      From {naira(s.bookingFrom)}
                    </span>
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <span className="rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                        {s.crowd}
                      </span>
                      <span className="rounded-lg bg-brand-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                        {s.type}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                        {s.name}
                      </h3>
                      {s.rating > 0 && <Stars value={s.rating} />}
                    </div>
                    <p className="muted text-xs">
                      {s.area}, {s.city} · {s.hours}
                    </p>

                    {s.amenities && s.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {s.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-midnight-800 dark:text-slate-300"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                      <div>
                        {s.verified ? (
                          <VerifiedBadge />
                        ) : (
                          <span className="muted text-xs">Unverified listing</span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
                        View Space &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filter Events">
        <Group label="Date">
          {(['any', 'tonight', 'weekend'] as const).map((w) => (
            <Chip key={w} active={when === w} onClick={() => setWhen(w)}>
              {w === 'any' ? 'Anytime' : w === 'tonight' ? 'Tonight' : 'This Weekend'}
            </Chip>
          ))}
        </Group>

        <Group label="Ticket Type">
          {(['any', 'free', 'paid'] as const).map((p) => (
            <Chip key={p} active={price === p} onClick={() => setPrice(p)}>
              {p === 'any' ? 'All' : p === 'free' ? 'Free' : 'Paid'}
            </Chip>
          ))}
        </Group>

        <div className="mb-5">
          <div className="mb-2 flex justify-between text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">Maximum Price</span>
            <span className="font-semibold text-brand-500">₦{maxPrice.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100000}
            step={2500}
            value={maxPrice}
            onChange={(e) => setMaxPrice(+e.target.value)}
            aria-label="Max price"
            className="h-2 w-full cursor-pointer accent-[#4F46E5]"
          />
        </div>

        <Group label="Neighbourhood">
          {areas.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(area === a ? null : a)}>
              {a}
            </Chip>
          ))}
        </Group>

        <Group label="Mood">
          {VIBES.map((v) => (
            <Chip key={v} active={vibe === v} onClick={() => setVibe(vibe === v ? null : v)}>
              {v}
            </Chip>
          ))}
        </Group>

        <div className="mt-4 flex gap-2.5 border-t border-[var(--border)] pt-4">
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
          <Button full onClick={() => setSheet(false)}>
            Apply ({list.length})
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
