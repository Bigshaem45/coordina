import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Icon } from '../../design-system/Icon';
import { CATEGORY_ICON } from '../../lib/constants';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Cover,
  EmptyState,
  Stars,
  VerifiedBadge,
  SkeletonCard,
} from '../../design-system/ui';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import {
  useAllEvents,
  useAuth,
  usePlanItems,
  useStore,
  mapConvexEvent,
  mapConvexSpace,
} from '../../store';
import { detectClashes } from '../../lib/clash';
import { fmtDate, fmtTime, mapLink, naira } from '../../lib/format';
import { toast } from '../../lib/fx';
import {
  googleCalLink,
  openCalendarEvent,
  whatsappEvent,
  getEventShareUrl,
} from '../../lib/calendar';
import { useAddToPlan, EventCard } from '../discover/EventCard';
import { recommend } from '../../lib/recommend';
import { evaluateEventRegionAccess, useVisitorGeo } from '../../lib/geo';
import ReportModal from './ReportModal';
import RatingModal from './RatingModal';

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const add = useAddToPlan();
  const plan = usePlanItems();
  const all = useAllEvents();
  const { user } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);

  const eventDetail = useQuery(
    api.events.getById,
    id ? { id: id as any } : 'skip'
  );
  const ratingsData = useQuery(
    api.reports.getEventRatings,
    id ? { eventId: id as any } : 'skip'
  );

  const [tierId, setTierId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sheet, setSheet] = useState<null | 'share'>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const isEventRegionLocked = Boolean(eventDetail?.regionRestriction?.enabled);
  const { geo: visitorGeo, loading: geoLoading, refreshGeo } = useVisitorGeo(isEventRegionLocked);

  if (eventDetail === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-0">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!eventDetail) {
    return (
      <EmptyState
        icon="search_off"
        title="Event not found"
        action={<Button onClick={() => nav('/home')}>Back to feed</Button>}
      />
    );
  }

  const event = mapConvexEvent(eventDetail);
  const sp = eventDetail.space ? mapConvexSpace(eventDetail.space) : null;
  const org = eventDetail.organizer;
  const orgName = org?.businessName ?? event.organiserName ?? 'Event Host';
  const orgVerified = org?.status === 'verified';

  const tier = event.tiers.find((t) => t.id === tierId) ?? event.tiers[0];
  const inCart = plan.some((p) => p.event.id === event.id);
  const budget = user?.budget ?? 100000;
  const preview = tier
    ? detectClashes(
        [...plan.filter((p) => p.event.id !== event.id), { event, tier, qty }],
        budget
      ).filter((c) => c.eventIds.includes(event.id) || c.type === 'budget')
    : [];

  const similar = recommend(
    all.filter((e) => e.id !== event.id && e.city === event.city),
    [event.category],
    event.vibe
  ).slice(0, 3);

  const avgRating = ratingsData?.average ?? event.rating ?? 0;
  const reviewCount = ratingsData?.count ?? event.reviewCount ?? 0;
  const topTags = Object.entries(ratingsData?.tagCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const isFullyVerified =
    event.verificationStatus === 'Event Verified' ||
    event.verificationStatus === 'Organizer Verified' ||
    event.verificationStatus === 'Coordina Trusted';

  const regionAccess = evaluateEventRegionAccess(event.regionRestriction, visitorGeo);
  const isRegionBlocked =
    Boolean(event.regionRestriction?.enabled) && !geoLoading && !regionAccess.allowed;
  const isRegionChecking = Boolean(event.regionRestriction?.enabled) && geoLoading && !visitorGeo;

  const handleBuyNow = async () => {
    if (!user) {
      toast('Please log in to purchase tickets.');
      nav(`/auth?mode=signin&redirect=${encodeURIComponent(loc.pathname)}`);
      return;
    }
    if (!user.emailVerified) {
      toast('Please verify your email before purchasing tickets.');
      setVerifyModalOpen(true);
      return;
    }
    if (event.regionRestriction?.enabled) {
      const latestGeo = visitorGeo ?? (await refreshGeo());
      const check = evaluateEventRegionAccess(event.regionRestriction, latestGeo);
      if (!check.allowed) {
        toast(
          check.reason ||
            `Ticket sales for this event are restricted to ${event.regionRestriction.label}.`
        );
        return;
      }
    }
    if (!tier || tier.remaining <= 0) {
      toast('Selected ticket tier is sold out.');
      return;
    }
    nav(`/checkout?only=${event.id}&tier=${tier.id}&qty=${qty}`);
  };

  return (
    <div className="pb-6 md:py-6">
      {/* Immersive Hero Banner */}
      <div
        ref={heroRef}
        className="relative h-72 overflow-hidden bg-slate-950 sm:h-80 md:h-96 md:rounded-3xl"
      >
        <Cover
          gradient={event.image}
          category={event.category}
          className="h-full w-full"
          label={event.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/20" />

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

        <div className="absolute inset-x-4 bottom-5 md:inset-x-8 md:bottom-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">
              <Icon name={CATEGORY_ICON[event.category]} className="text-xs" />
              {event.category}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {event.vibe}
            </span>
            <button
              type="button"
              onClick={() => setRatingOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md transition hover:bg-amber-400/30"
              title="Click to rate event"
            >
              <Icon name="star" className="text-sm text-amber-400" filled />
              <span>{reviewCount > 0 ? avgRating : 'Rate'}</span>
              {reviewCount > 0 && <span className="opacity-80">({reviewCount})</span>}
            </button>
            <VerificationBadge
              status={event.verificationStatus ?? 'Unverified'}
              size="sm"
            />
            {event.regionRestriction?.enabled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-950/75 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
                <Icon name="public" className="text-xs text-indigo-300" />
                <span>{event.regionRestriction.label} Only</span>
              </span>
            )}
          </div>
          <h1 className="mt-2.5 text-2xl font-bold leading-tight text-white sm:text-4xl">
            {event.title}
          </h1>
          <p className="mt-1 text-xs text-slate-200 sm:text-sm">
            Hosted by <span className="font-medium text-white">{orgName}</span> · {event.area},{' '}
            {event.city}
          </p>
        </div>
      </div>

      {/* Main Content 2-Column Layout on Desktop */}
      <div className="mt-6 grid gap-6 px-4 md:grid-cols-12 md:px-0">
        <div className="space-y-6 md:col-span-7">
          {/* Quick Info Tiles */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="group flex items-start justify-between gap-3 p-4 transition hover:border-brand-300 dark:hover:border-brand-500/40">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name="calendar_today" />
                </span>
                <div>
                  <p className="muted text-xs">Date &amp; Time</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                    {fmtDate(event.start, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <p className="muted text-xs">
                    {fmtTime(event.start)} – {fmtTime(event.end)}
                  </p>
                </div>
              </div>
              <a
                href={googleCalLink(event)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-brand-600 shadow-2xs transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-brand-300 dark:hover:bg-brand-500/20"
                title="Add to Google Calendar"
              >
                <Icon name="event" className="text-xs" />
                <span>+ Cal</span>
              </a>
            </Card>

            <Card className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon name="location_on" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="muted text-xs">Venue</p>
                {sp ? (
                  <Link
                    to={`/space/${sp.id}`}
                    className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                  >
                    {sp.name}
                  </Link>
                ) : (
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {event.venueName || event.area}
                  </p>
                )}
                <p className="muted text-xs">
                  {event.address ? `${event.address} · ` : ''}
                  {event.area}, {event.city}
                </p>
              </div>
            </Card>
          </div>

          {/* Trust & Remote Verification Passport */}
          <Card
            className={`border-l-4 p-4 ${
              isFullyVerified ? 'border-l-emerald-500' : 'border-l-amber-500'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    isFullyVerified
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                  }`}
                >
                  <Icon
                    name={isFullyVerified ? 'verified_user' : 'gpp_maybe'}
                    className="text-lg"
                    filled
                  />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Coordina Trust &amp; Verification Status
                  </h3>
                  <p className="muted text-[11px]">
                    {isFullyVerified
                      ? 'Verified organizer identity and compliance checks passed'
                      : 'Verification status reflects live KYC and venue confirmation records'}
                  </p>
                </div>
              </div>
              <VerificationBadge
                status={event.verificationStatus ?? 'Unverified'}
                size="sm"
              />
            </div>

            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  <Icon
                    name={orgVerified ? 'verified' : 'schedule'}
                    className={`text-sm ${orgVerified ? 'text-emerald-500' : 'text-amber-500'}`}
                  />
                  <span>Organizer KYC</span>
                </div>
                <p className="muted mt-0.5">
                  {orgVerified
                    ? 'Identity & registration verified'
                    : 'Organizer KYC pending or unsubmitted'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  <Icon
                    name={
                      eventDetail.venueConfirmationStatus === 'confirmed' || sp?.verified
                        ? 'storefront'
                        : 'pending'
                    }
                    className={`text-sm ${
                      eventDetail.venueConfirmationStatus === 'confirmed' || sp?.verified
                        ? 'text-neon-500'
                        : 'text-amber-500'
                    }`}
                  />
                  <span>Venue Status</span>
                </div>
                <p className="muted mt-0.5">
                  {eventDetail.venueConfirmationStatus === 'confirmed'
                    ? 'Confirmed directly by venue manager'
                    : sp?.verified
                      ? 'Hosted at a verified COORDINA space'
                      : 'Awaiting venue manager confirmation'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  <Icon name="shield" className="text-sm text-brand-500" />
                  <span>Escrow Protection</span>
                </div>
                <p className="muted mt-0.5">
                  Organiser payouts require verified KYC &amp; clean event audit
                </p>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              About Event
            </h2>
            <p className="muted mt-2 text-sm leading-relaxed">{event.description}</p>
          </Card>

          {/* COORDINA Plus IP Region Lock Banner */}
          {event.regionRestriction?.enabled && (
            <Card
              className={`border-2 p-5 ${
                isRegionChecking
                  ? 'border-indigo-400/40 bg-indigo-50/50 dark:bg-indigo-500/10'
                  : regionAccess.allowed
                    ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10'
                    : 'border-rose-500/60 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      isRegionChecking
                        ? 'bg-indigo-500'
                        : regionAccess.allowed
                          ? 'bg-emerald-600'
                          : 'bg-rose-600'
                    }`}
                  >
                    <Icon
                      name={
                        isRegionChecking
                          ? 'radar'
                          : regionAccess.allowed
                            ? 'where_to_vote'
                            : 'location_disabled'
                      }
                      className="text-xl"
                    />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isRegionChecking
                          ? 'Verifying Your IP Region…'
                          : regionAccess.allowed
                            ? `IP Region Verified: Eligible for ${event.regionRestriction.label}`
                            : `Ticket Sales Locked to ${event.regionRestriction.label}`}
                      </h3>
                      <Badge tone={regionAccess.allowed ? 'neon' : 'coral'}>
                        COORDINA Plus Geo-Fence
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {isRegionChecking ? (
                        <>
                          Checking your network IP to confirm you are inside{' '}
                          <strong>{event.regionRestriction.label}</strong>.
                        </>
                      ) : regionAccess.allowed ? (
                        <>
                          Your connection (<strong>{regionAccess.userLocationLabel}</strong>
                          {visitorGeo?.ip ? ` · ${visitorGeo.ip}` : ''}) matches the organizer’s
                          allowed region (<strong>{event.regionRestriction.label}</strong>).
                        </>
                      ) : (
                        <>
                          The organizer has restricted ticket purchases for this event to attendees
                          located in <strong>{event.regionRestriction.label}</strong>. Your current
                          IP location was detected as{' '}
                          <strong>{regionAccess.userLocationLabel}</strong>
                          {visitorGeo?.ip ? ` (${visitorGeo.ip})` : ''}. If you are physically in
                          this region, disable any VPN or proxy and re-check your IP.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={geoLoading}
                  onClick={() => {
                    refreshGeo().then((fresh) => {
                      const recheck = evaluateEventRegionAccess(event.regionRestriction, fresh);
                      toast(
                        recheck.allowed
                          ? `IP verified in ${recheck.userLocationLabel} — ticket purchase unlocked!`
                          : `Current IP (${recheck.userLocationLabel}) is outside ${event.regionRestriction?.label}.`
                      );
                    });
                  }}
                >
                  <Icon name="refresh" className="text-sm" />
                  {geoLoading ? 'Checking…' : 'Re-check IP'}
                </Button>
              </div>
            </Card>
          )}

          {/* Ticket Tiers Selection */}
          {tier && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Select Ticket
                </h2>
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
                          <span className="block text-sm font-medium text-slate-900 dark:text-white">
                            {t.name}
                          </span>
                          {t.remaining === 0 ? (
                            <span className="text-xs font-medium text-rose-500">Sold out</span>
                          ) : t.remaining <= 10 ? (
                            <span className="text-xs font-medium text-coral-500">
                              Only {t.remaining} left
                            </span>
                          ) : (
                            <span className="muted text-xs">{t.remaining} available</span>
                          )}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t.price === 0 ? 'Free' : naira(t.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Live Organiser Card */}
          <Card className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {orgName[0]?.toUpperCase() ?? 'O'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{orgName}</p>
                  {orgVerified && <VerifiedBadge />}
                  {(org?.isCoordinaPlus || event.organizerCoordinaPlus) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      <Icon name="workspace_premium" className="text-xs" /> COORDINA Plus
                    </span>
                  )}
                </div>
                <p className="muted text-xs">
                  {org?.eventsHosted ?? 1} published event{(org?.eventsHosted ?? 1) === 1 ? '' : 's'}{' '}
                  · {org?.totalReviews ?? 0} attendee review
                  {(org?.totalReviews ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {(org?.avgRating ?? 0) > 0 && <Stars value={org?.avgRating ?? 0} />}
          </Card>

          {/* Live Attendee Ratings & Community Reviews */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Attendee Ratings &amp; Reviews
                  </h2>
                  <Badge tone="neon">Live Feedback</Badge>
                </div>
                <p className="muted mt-0.5 text-xs">
                  Real ratings submitted by verified COORDINA accounts.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRatingOpen(true)}>
                <Icon name="rate_review" className="text-sm" /> Rate Event
              </Button>
            </div>

            {reviewCount === 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-50/80 p-5 text-center dark:bg-midnight-900">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No attendee reviews yet
                </p>
                <p className="muted mt-1 text-xs">
                  Attended {event.title}? Share the first verified rating for the community.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl bg-slate-50/80 p-4 dark:bg-midnight-900">
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {avgRating}
                    </span>
                    <div className="mt-1 flex justify-center text-amber-400">
                      <Stars value={avgRating} />
                    </div>
                    <p className="muted mt-0.5 text-[11px]">
                      {reviewCount} review{reviewCount === 1 ? '' : 's'}
                    </p>
                  </div>

                  {topTags.length > 0 && (
                    <>
                      <div className="hidden h-10 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
                      <div className="min-w-[200px] flex-1">
                        <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Crowd Highlights
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {topTags.map(([tag, count]) => (
                            <span
                              key={tag}
                              className="rounded-lg bg-brand-500/10 px-2 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-300"
                            >
                              {tag} ({Math.round((count / reviewCount) * 100)}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 divide-y divide-slate-100 space-y-3 text-xs dark:divide-slate-800">
                  {(ratingsData?.ratings ?? []).slice(0, 6).map((r: any) => (
                    <div key={r._id} className="pt-3 first:pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {r.userName}
                          </span>
                          {r.ticketVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              <Icon name="check_circle" className="text-[12px]" filled /> Ticket
                              Holder
                            </span>
                          )}
                        </div>
                        <span className="muted text-[10px]">
                          {new Date(r.createdAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-amber-400">
                        <Stars value={r.rating} />
                      </div>
                      {r.review && (
                        <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                          {r.review}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Column: Sticky Booking Summary + Venue Safety & Map */}
        <div className="space-y-4 md:col-span-5">
          <div className="space-y-4 md:sticky md:top-22">
            {tier && (
              <Card className="hidden p-5 md:block">
                <div className="flex items-baseline justify-between">
                  <span className="muted text-xs">
                    Total ({qty} ticket{qty > 1 ? 's' : ''})
                  </span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {tier.price === 0 ? 'Free' : naira(tier.price * qty)}
                  </span>
                </div>
                <p className="muted mt-1 text-xs">{tier.name} · Instant QR delivery</p>

                <div
                  aria-live="polite"
                  className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${
                    preview.length
                      ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                      : 'border-neon-400/40 bg-neon-50 text-neon-700 dark:bg-neon-500/10 dark:text-neon-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Icon
                      name={preview.length ? 'info' : 'check_circle'}
                      filled
                      className="text-sm"
                    />
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
                  <Button
                    full
                    size="lg"
                    disabled={isRegionBlocked || isRegionChecking}
                    onClick={handleBuyNow}
                  >
                    {isRegionChecking
                      ? 'Checking IP Region…'
                      : isRegionBlocked
                        ? `Restricted to ${event.regionRestriction?.label}`
                        : user
                          ? 'Buy Ticket Now'
                          : 'Log In to Buy Ticket'}
                  </Button>
                  <Button
                    full
                    size="lg"
                    variant="outline"
                    disabled={isRegionBlocked || isRegionChecking}
                    onClick={() =>
                      add(event, heroRef.current?.getBoundingClientRect(), tier.id, qty)
                    }
                  >
                    <Icon
                      name={
                        isRegionBlocked
                          ? 'location_disabled'
                          : inCart
                            ? 'check'
                            : user
                              ? 'add'
                              : 'lock'
                      }
                      className="text-base"
                    />
                    {isRegionBlocked
                      ? 'Unavailable in Your IP Region'
                      : inCart
                        ? 'Update in Plan Cart'
                        : user
                          ? 'Add to Plan Cart'
                          : 'Log In to Add to Plan'}
                  </Button>
                </div>
              </Card>
            )}

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

            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Venue &amp; Safety
                </h2>
                {sp?.verified ? <VerifiedBadge /> : <Badge tone="muted">Venue Info</Badge>}
              </div>
              {sp && (
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <Icon name="shield" className="text-base text-brand-500" />
                    <span>{sp.safety}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name="groups" className="text-base text-brand-500" />
                    <span>
                      Typical crowd: <strong>{sp.crowd}</strong>
                    </span>
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
                    navigator.clipboard?.writeText(
                      `Heading to ${event.title}: ${mapLink(event)}`
                    );
                    toast('Live location link copied');
                  }}
                >
                  <Icon name="share_location" className="text-sm text-brand-500" /> Share
                  Location
                </Button>
              </div>
            </Card>

            <button
              type="button"
              className="muted inline-flex items-center gap-1.5 text-xs hover:text-rose-600 dark:hover:text-rose-400"
              onClick={() => setReportOpen(true)}
            >
              <Icon name="flag" className="text-sm" /> Report this event listing
            </button>
          </div>
        </div>
      </div>

      {/* Similar Events Grid */}
      {similar.length > 0 && (
        <div className="mt-10 px-4 md:px-0">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Other Events You May Like
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {/* Docked Mobile Bottom Action Bar */}
      {tier && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl dark:bg-midnight-900/95 md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-2.5">
            <div className="mr-1">
              <p className="muted text-[11px]">Total</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {tier.price === 0 ? 'Free' : naira(tier.price * qty)}
              </p>
            </div>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isRegionBlocked || isRegionChecking}
              onClick={() =>
                add(event, heroRef.current?.getBoundingClientRect(), tier.id, qty)
              }
            >
              {isRegionBlocked ? 'Region Locked' : inCart ? 'Saved' : user ? '+ Plan' : 'Log In'}
            </Button>
            <Button
              className="flex-1"
              disabled={isRegionBlocked || isRegionChecking}
              onClick={handleBuyNow}
            >
              {isRegionChecking
                ? 'Checking IP…'
                : isRegionBlocked
                  ? `${event.regionRestriction?.label} Only`
                  : user
                    ? 'Buy Ticket'
                    : 'Log In to Buy'}
            </Button>
          </div>
        </div>
      )}

      {/* Share Sheet */}
      <BottomSheet open={sheet === 'share'} onClose={() => setSheet(null)} title="Share Event">
        <div className="relative mx-auto mb-4 h-56 overflow-hidden rounded-2xl bg-slate-900 text-white">
          <Cover
            gradient={event.image}
            category={event.category}
            className="h-full w-full"
            label={event.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          <div className="absolute inset-x-4 bottom-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-brand-300">COORDINA</p>
            <h3 className="mt-0.5 text-lg font-bold text-white">{event.title}</h3>
            <p className="text-xs text-slate-200">
              {fmtDate(event.start)} · {event.area}
              {tier ? ` · ${tier.price === 0 ? 'Free' : naira(tier.price)}` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#10B981] text-sm font-medium text-white transition hover:bg-[#059669]"
            target="_blank"
            rel="noreferrer"
            href={whatsappEvent(event)}
          >
            <Icon name="chat" className="text-base" /> WhatsApp
          </a>
          <Button
            variant="outline"
            onClick={() => {
              const url = getEventShareUrl(event.id);
              navigator.clipboard?.writeText(url);
              toast('Event link copied: ' + url);
            }}
          >
            <Icon name="content_copy" className="text-base" /> Copy Link
          </Button>
        </div>
        <div className="mt-3">
          <Button
            full
            variant="secondary"
            onClick={() => {
              openCalendarEvent(event);
            }}
          >
            <Icon name="event" className="text-base" /> Add to Calendar
          </Button>
        </div>
      </BottomSheet>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
      />

      <RatingModal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  );
}
