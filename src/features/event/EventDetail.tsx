import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { getEvent, getOrganiser, getSpace, CATEGORY_ICON } from '../../data/mock';
import { Badge, BottomSheet, Button, Card, Cover, EmptyState, Stars, VerifiedBadge } from '../../design-system/ui';
import { useAllEvents, usePlanItems, useStore } from '../../store';
import { detectClashes } from '../../lib/clash';
import { fmtDate, fmtTime, mapLink, naira } from '../../lib/format';
import { toast } from '../../lib/fx';
import { useAddToPlan, EventCard } from '../discover/EventCard';
import { recommend } from '../../lib/recommend';

export default function EventDetail() {
  const { id } = useParams();
  const all = useAllEvents();
  const event = all.find((e) => e.id === id) ?? getEvent(id ?? '');
  const nav = useNavigate();
  const add = useAddToPlan();
  const plan = usePlanItems();
  const budget = useStore((s) => s.budget);
  const report = useStore((s) => s.report);
  const [tierId, setTierId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sheet, setSheet] = useState<null | 'share' | 'report'>(null);
  const [reason, setReason] = useState('Fake or misleading listing');
  const heroRef = useRef<HTMLDivElement>(null);

  if (!event) {
    return (
      <EmptyState
        icon="search_off"
        title="Event not found"
        action={<Button onClick={() => nav('/home')}>Back to feed</Button>}
      />
    );
  }

  const sp = getSpace(event.spaceId);
  const org = getOrganiser(event.organiserId);
  const tier = event.tiers.find((t) => t.id === tierId) ?? event.tiers[0];
  const inCart = plan.some((p) => p.event.id === event.id);
  const preview = detectClashes([...plan.filter((p) => p.event.id !== event.id), { event, tier, qty }], budget).filter(
    (c) => c.eventIds.includes(event.id) || c.type === 'budget',
  );
  const similar = recommend(
    all.filter((e) => e.id !== event.id && e.city === event.city),
    [event.category],
    event.vibe,
  ).slice(0, 3);
  const shareText = `${event.title} · ${fmtDate(event.start)} ${fmtTime(event.start)} · ${event.area} on COORDINA`;

  return (
    <div className="pb-6 md:py-6">
      {/* Immersive Hero Banner (Eventbux / Evenie inspired) */}
      <div ref={heroRef} className="relative h-72 overflow-hidden bg-slate-950 sm:h-80 md:h-96 md:rounded-3xl">
        <Cover gradient={event.image} category={event.category} className="h-full w-full" label={event.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/20" />

        {/* Floating Top Controls */}
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Back"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-950/55 px-3.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-slate-950/75"
          >
            <Icon name="arrow_back" className="text-base" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={() => setSheet('share')}
            aria-label="Share event"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/55 text-white backdrop-blur-md transition hover:bg-slate-950/75"
          >
            <Icon name="ios_share" className="text-base" />
          </button>
        </div>

        {/* Hero Title Overlay */}
        <div className="absolute inset-x-4 bottom-5 md:inset-x-8 md:bottom-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">
              <Icon name={CATEGORY_ICON[event.category]} className="text-xs" />
              {event.category}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {event.vibe}
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold leading-tight text-white sm:text-4xl">{event.title}</h1>
          <p className="mt-1 text-xs text-slate-200 sm:text-sm">
            Hosted by <span className="font-medium text-white">{org.name}</span> · {event.area}, {event.city}
          </p>
        </div>
      </div>

      {/* Main Content 2-Column Layout on Desktop */}
      <div className="mt-6 grid gap-6 px-4 md:grid-cols-12 md:px-0">
        {/* Left Column: Details, Tiers, Organiser */}
        <div className="space-y-6 md:col-span-7">
          {/* Quick Info Tiles */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon name="calendar_today" />
              </span>
              <div>
                <p className="muted text-xs">Date &amp; Time</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {fmtDate(event.start, { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="muted text-xs">
                  {fmtTime(event.start)} – {fmtTime(event.end)}
                </p>
              </div>
            </Card>

            <Card className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon name="location_on" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="muted text-xs">Venue</p>
                <Link to={`/space/${event.spaceId}`} className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white">
                  {sp?.name ?? event.area}
                </Link>
                <p className="muted text-xs">{event.area}, {event.city}</p>
              </div>
            </Card>
          </div>

          {/* Description */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">About Event</h2>
            <p className="muted mt-2 text-sm leading-relaxed">{event.description}</p>
          </Card>

          {/* Ticket Tiers Selection */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Select Ticket</h2>
              <div className="flex items-center gap-2">
                <span className="muted text-xs">Qty</span>
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(10, qty + 1))}
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {event.tiers.map((t) => {
                const selected = tier.id === t.id;
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                      selected
                        ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-500/15'
                        : 'border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-600'
                    } ${t.remaining === 0 ? 'pointer-events-none opacity-45' : ''}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="tier"
                        className="h-4 w-4 accent-[#4F46E5]"
                        checked={selected}
                        disabled={t.remaining === 0}
                        onChange={() => setTierId(t.id)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900 dark:text-white">{t.name}</span>
                        {t.remaining <= 10 && t.remaining > 0 && (
                          <span className="text-xs font-medium text-coral-500">Only {t.remaining} left</span>
                        )}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{naira(t.price)}</span>
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Organiser Card */}
          <Card className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {org.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{org.name}</p>
                  {org.verified && <VerifiedBadge />}
                </div>
                <p className="muted text-xs">{org.reviews.toLocaleString()} attendee reviews</p>
              </div>
            </div>
            <Stars value={org.trust} />
          </Card>
        </div>

        {/* Right Column: Sticky Booking Summary + Venue Safety & Map */}
        <div className="space-y-4 md:col-span-5">
          <div className="md:sticky md:top-22 space-y-4">
            {/* Desktop Action Card */}
            <Card className="hidden p-5 md:block">
              <div className="flex items-baseline justify-between">
                <span className="muted text-xs">Total ({qty} ticket{qty > 1 ? 's' : ''})</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{naira(tier.price * qty)}</span>
              </div>
              <p className="muted mt-1 text-xs">{tier.name} · Instant QR delivery</p>

              {/* Smart Clash Check Strip */}
              <div
                aria-live="polite"
                className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${
                  preview.length
                    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                    : 'border-neon-400/40 bg-neon-50 text-neon-700 dark:bg-neon-500/10 dark:text-neon-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Icon name={preview.length ? 'info' : 'check_circle'} filled className="text-sm" />
                  <span>{preview.length ? 'Schedule note' : 'Fits your plan'}</span>
                </div>
                <p className="mt-1">
                  {plan.length === 0 && preview.length === 0
                    ? 'Add to Plan Cart to check travel time and overlaps with other events.'
                    : preview.length === 0
                      ? 'No time, travel, or budget conflicts with your current plan.'
                      : preview[0].message}
                </p>
              </div>

              <div className="mt-4 space-y-2.5">
                <Button full size="lg" onClick={() => nav(`/checkout?only=${event.id}&tier=${tier.id}&qty=${qty}`)}>
                  Buy Ticket Now
                </Button>
                <Button
                  full
                  size="lg"
                  variant="outline"
                  onClick={() => add(event, heroRef.current?.getBoundingClientRect(), tier.id, qty)}
                >
                  <Icon name={inCart ? 'check' : 'add'} className="text-base" />
                  {inCart ? 'Update in Plan Cart' : 'Add to Plan Cart'}
                </Button>
              </div>
            </Card>

            {/* Mobile Clash Check Strip */}
            <div
              aria-live="polite"
              className={`rounded-2xl border p-3.5 text-xs leading-relaxed md:hidden ${
                preview.length
                  ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                  : 'border-neon-400/40 bg-neon-50 text-neon-700 dark:bg-neon-500/10 dark:text-neon-400'
              }`}
            >
              <span className="font-semibold">Itinerary check: </span>
              {plan.length === 0 && preview.length === 0
                ? 'Add to your plan to check travel time and overlaps.'
                : preview.length === 0
                  ? 'No conflicts with your saved plan.'
                  : preview[0].message}
            </div>

            {/* Venue & Safety Card */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Venue &amp; Safety</h2>
                {sp?.verified ? <VerifiedBadge /> : <Badge tone="muted">Unverified</Badge>}
              </div>
              {sp && (
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <Icon name="shield" className="text-brand-500 text-base" />
                    <span>{sp.safety}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name="groups" className="text-brand-500 text-base" />
                    <span>Typical crowd: <strong>{sp.crowd}</strong></span>
                  </p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                  href={mapLink(event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="open_in_new" className="text-sm" /> View on Google Maps
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(`Heading to ${event.title}: ${mapLink(event)}`);
                    toast('Live location link copied');
                  }}
                >
                  <Icon name="share_location" className="text-sm text-brand-500" /> Share Location
                </Button>
              </div>
            </Card>

            <button
              type="button"
              className="muted inline-flex items-center gap-1.5 text-xs hover:underline"
              onClick={() => setSheet('report')}
            >
              <Icon name="flag" className="text-sm" /> Report this listing
            </button>
          </div>
        </div>
      </div>

      {/* Similar Events Grid */}
      {similar.length > 0 && (
        <div className="mt-10 px-4 md:px-0">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Other Events You May Like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {/* Docked Mobile Bottom Action Bar (No mobile tab bar on this route -> zero overlap!) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur-xl dark:bg-midnight-900/95 md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          <div className="mr-1">
            <p className="muted text-[11px]">Total</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{naira(tier.price * qty)}</p>
          </div>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => add(event, heroRef.current?.getBoundingClientRect(), tier.id, qty)}
          >
            {inCart ? 'Saved' : '+ Plan'}
          </Button>
          <Button
            className="flex-1"
            onClick={() => nav(`/checkout?only=${event.id}&tier=${tier.id}&qty=${qty}`)}
          >
            Buy Ticket
          </Button>
        </div>
      </div>

      {/* Share Sheet */}
      <BottomSheet open={sheet === 'share'} onClose={() => setSheet(null)} title="Share Event">
        <div className="relative mx-auto mb-4 h-56 overflow-hidden rounded-2xl bg-slate-900 text-white">
          <Cover gradient={event.image} category={event.category} className="h-full w-full" label={event.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          <div className="absolute inset-x-4 bottom-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-brand-300">COORDINA</p>
            <h3 className="mt-0.5 text-lg font-bold text-white">{event.title}</h3>
            <p className="text-xs text-slate-200">
              {fmtDate(event.start)} · {event.area} · {naira(tier.price)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#10B981] text-sm font-medium text-white hover:bg-[#059669]"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          >
            <Icon name="chat" className="text-base" /> WhatsApp
          </a>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(shareText);
              toast('Invite text copied');
            }}
          >
            <Icon name="content_copy" className="text-base" /> Copy Link
          </Button>
        </div>
      </BottomSheet>

      {/* Report Sheet */}
      <BottomSheet open={sheet === 'report'} onClose={() => setSheet(null)} title="Report Listing">
        <div className="space-y-2">
          {['Fake or misleading listing', 'Unsafe venue', 'Asked to pay outside COORDINA', 'Other'].map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-sm"
            >
              <input
                type="radio"
                className="h-4 w-4 accent-[#4F46E5]"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>
        <Button
          full
          className="mt-4"
          onClick={() => {
            report(event.title, reason);
            setSheet(null);
            toast('Report received. Our trust team will review it.');
          }}
        >
          Submit Report
        </Button>
      </BottomSheet>
    </div>
  );
}
