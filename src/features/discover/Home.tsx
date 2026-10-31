import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { CATEGORIES, CATEGORY_ICON, minPrice } from '../../data/mock';
import { Cover, Section, Stars, VerifiedBadge, ErrorState } from '../../design-system/ui';
import { useAllEvents, useAllSpaces, useStore } from '../../store';
import { bucket, fmtTime, naira } from '../../lib/format';
import { EventCard, useAddToPlan } from './EventCard';
import { Logo } from '../../design-system/Logo';
import { recommend } from '../../lib/recommend';

export default function Home() {
  const city = useStore((s) => s.city);
  const user = useStore((s) => s.user);
  const setCity = useStore((s) => s.setCity);
  const interests = useStore((s) => s.interests);
  const vibe = useStore((s) => s.vibe);
  const allEvents = useAllEvents();
  const allSpaces = useAllSpaces();
  const all = useMemo(() => allEvents.filter((e) => e.city === city), [allEvents, city]);
  const nav = useNavigate();
  const add = useAddToPlan();
  const cart = useStore((s) => s.cart);
  const inCartIds = useMemo(() => new Set(cart.map((c) => c.eventId)), [cart]);
  const [err] = useState(false);

  const tonight = all.filter((e) => bucket(e) === 'tonight');
  const weekend = all.filter((e) => bucket(e) === 'weekend');
  const spotlight = tonight[0] ?? all[0];
  const trending = [...all]
    .sort((a, b) => a.tiers[0].remaining / a.tiers[0].total - b.tiers[0].remaining / b.tiers[0].total)
    .slice(0, 6);
  const forYou = recommend(all, interests, vibe).slice(0, 4);
  const verified = allSpaces.filter((s) => s.city === city && s.verified);
  const getSpace = (id: string) => allSpaces.find((s) => s.id === id);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-8 pt-4 md:pt-6">
      {/* Top Bar (Mobile Logo + Location Switcher) */}
      <div className="flex w-full min-w-0 items-center justify-between px-4 md:px-0">
        <div className="shrink-0 md:hidden">
          <Logo size={26} />
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="muted text-xs">Exploring events in</p>
          <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{city}, Nigeria</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCity(city === 'Abuja' ? 'Lagos' : 'Abuja')}
            aria-label={`Location ${city}. Switch city`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          >
            <Icon name="location_on" className="text-brand-500 text-sm" />
            <span>{city}</span>
            <Icon name="unfold_more" className="text-slate-400 text-sm" />
          </button>
          <button
            type="button"
            onClick={() => nav('/map')}
            aria-label="Open map"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200 md:hidden"
          >
            <Icon name="map" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Search & Map Banner Row */}
      <div className="mt-4 grid w-full min-w-0 gap-3 px-4 md:grid-cols-12 md:px-0">
        <button
          type="button"
          onClick={() => nav('/discover')}
          className="surface flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl px-4 text-left text-sm text-slate-500 shadow-card transition hover:border-brand-300 md:col-span-8"
          aria-label="Search events and spaces"
        >
          <Icon name="search" className="shrink-0 text-lg text-slate-400" />
          <span className="min-w-0 flex-1 truncate">Search concerts, rooftops, areas…</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Icon name="tune" className="text-base" />
          </span>
        </button>

        <Link
          to="/map"
          className="surface hidden h-12 items-center justify-between rounded-2xl px-4 text-xs font-medium shadow-card transition hover:border-brand-300 md:col-span-4 md:flex"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
              <Icon name="near_me" />
            </span>
            <span>
              <strong className="block text-slate-900 dark:text-white">Find through the map</strong>
              <span className="muted">{all.length} live pins in {city}</span>
            </span>
          </span>
          <Icon name="chevron_right" className="text-slate-400" />
        </Link>
      </div>

      {/* Guest Mode Exploration Banner */}
      {!user && (
        <div className="mx-4 mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent p-4 md:mx-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                <Icon name="explore" className="text-lg" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Exploring as a Guest</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Browse verified Nigerian events &amp; venues freely. Sign in to add items to your plan, check clashes, and book tickets.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/auth?mode=signin">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                >
                  Log In
                </button>
              </Link>
              <Link to="/auth?mode=signup">
                <button
                  type="button"
                  className="rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-600"
                >
                  Sign Up
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Clean Category Pills */}
      <div className="no-scrollbar mt-4 flex w-full max-w-full gap-2 overflow-x-auto px-4 pb-1 md:px-0">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            to={`/discover?cat=${c}`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
          >
            <Icon name={CATEGORY_ICON[c]} className="text-[15px] text-brand-500" />
            <span>{c}</span>
          </Link>
        ))}
      </div>

      {err ? (
        <ErrorState />
      ) : (
        <>
          {/* Featured Spotlight Card (Evenie "Featured" style) */}
          {spotlight && (
            <Section
              title="Featured"
              action={
                <Link to="/discover" className="text-xs font-medium text-brand-500 hover:underline">
                  See all
                </Link>
              }
            >
              <div className="w-full min-w-0 px-4 md:px-0">
                <div className="group relative h-64 w-full overflow-hidden rounded-3xl bg-slate-900 shadow-card sm:h-72">
                  <Link to={`/event/${spotlight.id}`} className="block h-full w-full">
                    <Cover gradient={spotlight.image} category={spotlight.category} className="h-full w-full" label={spotlight.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                  </Link>

                  {/* Top-Right Date Tile */}
                  <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-center rounded-2xl bg-white/95 px-3 py-1.5 text-center text-slate-900 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                      {new Date(spotlight.start).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none">{new Date(spotlight.start).getDate()}</span>
                  </div>

                  {/* Bottom Details */}
                  <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 text-white">
                    <Link to={`/event/${spotlight.id}`} className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
                        {tonight.includes(spotlight) ? 'Happening Tonight' : spotlight.category} · {fmtTime(spotlight.start)}
                      </span>
                      <h3 className="mt-1.5 truncate text-xl font-bold text-white sm:text-2xl">{spotlight.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-200">
                        <Icon name="location_on" className="text-sm shrink-0" />
                        <span className="truncate">{getSpace(spotlight.spaceId)?.name ?? spotlight.area}, {spotlight.area}</span>
                        <span className="shrink-0">· {minPrice(spotlight) === 0 ? 'Free' : `From ${naira(minPrice(spotlight))}`}</span>
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => !inCartIds.has(spotlight.id) && add(spotlight)}
                      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition ${
                        inCartIds.has(spotlight.id)
                          ? 'bg-white text-slate-900'
                          : 'bg-brand-500 text-white hover:bg-brand-600'
                      }`}
                    >
                      <Icon name={inCartIds.has(spotlight.id) ? 'check' : 'add'} className="text-sm" />
                      <span>{inCartIds.has(spotlight.id) ? 'In Plan' : 'Add to Plan'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Tonight + This Weekend Horizontal Cards */}
          <Row
            title="This Weekend"
            subtitle="Curated lineup for Friday to Sunday"
            events={weekend.length ? weekend : all.slice(0, 4)}
            action={
              <Link to="/discover" className="text-xs font-medium text-brand-500 hover:underline">
                View all
              </Link>
            }
          />

          {/* Popular Events List Rows (Evenie "Popular Events" compact list) */}
          <Section
            title={`Popular in ${city}`}
            action={
              <Link to="/discover" className="text-xs font-medium text-brand-500 hover:underline">
                Explore all
              </Link>
            }
          >
            <div className="grid gap-3 px-4 md:grid-cols-2 md:px-0">
              {trending.map((e) => (
                <EventCard key={e.id} event={e} variant="row" />
              ))}
            </div>
          </Section>

          {/* Recommended Based on Preferences */}
          {forYou.length > 0 && <Row title="Picked for You" subtitle="Matched to your interests and mood" events={forYou} />}

          {/* Verified Social Spaces */}
          <Section
            title="Verified Spaces"
            subtitle="Lounges, galleries, rooftops, and cafés"
            action={
              <Link to="/discover" className="text-xs font-medium text-brand-500 hover:underline">
                All spaces
              </Link>
            }
          >
            <div className="no-scrollbar flex w-full max-w-full gap-4 overflow-x-auto px-4 pb-2 md:px-0">
              {verified.map((s) => (
                <Link
                  key={s.id}
                  to={`/space/${s.id}`}
                  className="surface group w-64 shrink-0 overflow-hidden rounded-2xl shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="relative h-36 overflow-hidden">
                    <Cover gradient={s.image} className="h-full w-full" label={s.name} />
                    <span className="absolute left-3 top-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                      {s.type}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.name}</h3>
                      <Stars value={s.rating} />
                    </div>
                    <p className="muted truncate text-xs">{s.area}, {s.city} · {s.crowd}</p>
                    <div className="pt-0.5">
                      <VerifiedBadge />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Row({
  title,
  subtitle,
  events,
  action,
}: {
  title: string;
  subtitle?: string;
  events: ReturnType<typeof useAllEvents>;
  action?: React.ReactNode;
}) {
  if (events.length === 0) return null;
  return (
    <Section title={title} subtitle={subtitle} action={action}>
      <div className="no-scrollbar flex w-full max-w-full gap-4 overflow-x-auto px-4 pb-2 md:px-0">
        {events.map((e) => (
          <EventCard key={e.id} event={e} compact />
        ))}
      </div>
    </Section>
  );
}
