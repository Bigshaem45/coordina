import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { events, getSpace } from '../../data/mock';
import { Badge, BottomSheet, Button, Card, Cover, EmptyState, Stars, VerifiedBadge } from '../../design-system/ui';
import { useStore } from '../../store';
import { naira } from '../../lib/format';
import { toast } from '../../lib/fx';
import { EventCard } from '../discover/EventCard';

export default function SpaceProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const sp = getSpace(id ?? '');
  const addBooking = useStore((s) => s.addBooking);
  const report = useStore((s) => s.report);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(12);

  if (!sp) {
    return (
      <EmptyState
        icon="storefront"
        title="Space not found"
        action={<Button onClick={() => nav('/home')}>Back to feed</Button>}
      />
    );
  }

  const upcoming = events.filter((e) => e.spaceId === sp.id);

  return (
    <div className="pb-6 md:py-6">
      <div className="relative h-64 overflow-hidden bg-slate-950 sm:h-80 md:rounded-3xl">
        <Cover gradient={sp.image} className="h-full w-full" label={sp.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
        <button
          type="button"
          onClick={() => nav(-1)}
          aria-label="Back"
          className="absolute left-4 top-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-950/55 px-3.5 text-xs font-medium text-white backdrop-blur-md hover:bg-slate-950/75"
        >
          <Icon name="arrow_back" className="text-base" />
          <span>Back</span>
        </button>

        <div className="absolute inset-x-4 bottom-5 md:inset-x-8">
          <div className="flex flex-wrap items-center gap-2">
            {sp.verified ? <VerifiedBadge /> : <Badge tone="dark">Unverified</Badge>}
            <Badge tone="dark">{sp.type}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-4xl">{sp.name}</h1>
          <p className="mt-0.5 text-xs text-slate-200 sm:text-sm">
            {sp.area}, {sp.city} · {sp.hours}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 px-4 md:grid-cols-12 md:px-0">
        <div className="space-y-6 md:col-span-8">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">About this space</h2>
              <Stars value={sp.rating} />
            </div>
            <p className="muted mt-2 text-sm leading-relaxed">{sp.about}</p>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {sp.photos.map((p, i) => (
                <Cover key={i} gradient={p} className="h-28 rounded-xl" label={`${sp.name} gallery ${i + 1}`} />
              ))}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4 text-xs">
              <Icon name="schedule" className="text-brand-500 text-lg" />
              <p className="muted mt-1.5">Opening Hours</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{sp.hours}</p>
            </Card>
            <Card className="p-4 text-xs">
              <Icon name="groups" className="text-brand-500 text-lg" />
              <p className="muted mt-1.5">Current Crowd</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{sp.crowd}</p>
            </Card>
            <Card className="p-4 text-xs">
              <Icon name="shield" className="text-brand-500 text-lg" />
              <p className="muted mt-1.5">Safety &amp; Access</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{sp.safety}</p>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">Guest Reviews</h2>
            <div className="space-y-2.5">
              {sp.reviews.map((r, i) => (
                <Card key={i} className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{r.who}</span>
                    <Stars value={r.rating} />
                  </div>
                  <p className="muted mt-1 text-xs leading-relaxed">{r.text}</p>
                </Card>
              ))}
            </div>
          </div>

          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">Upcoming at {sp.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 md:col-span-4">
          <Card className="p-5 md:sticky md:top-22">
            <p className="muted text-xs">Private table &amp; space hire</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">From {naira(sp.bookingFrom)}</p>
            <p className="muted mt-1 text-xs">Direct confirmation from {sp.name} within 24 hours.</p>
            <Button full size="lg" className="mt-4" onClick={() => setOpen(true)}>
              Reserve Space
            </Button>
            <Link to="/map" className="mt-2.5 block">
              <Button full variant="outline">
                <Icon name="map" className="text-base" /> View on Map
              </Button>
            </Link>
            <button
              type="button"
              className="muted mt-4 inline-flex items-center gap-1 text-xs hover:underline"
              onClick={() => {
                report(sp.name, 'Reported space');
                toast('Report sent to trust team');
              }}
            >
              <Icon name="flag" className="text-sm" /> Report venue details
            </button>
          </Card>
        </div>
      </div>

      {/* Docked Mobile CTA Bar (no bottom nav on /space/:id -> zero overlap) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl dark:bg-midnight-900/95 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="muted text-[11px]">Bookings from</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{naira(sp.bookingFrom)}</p>
          </div>
          <Button size="lg" onClick={() => setOpen(true)}>
            Reserve Space
          </Button>
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={`Reserve ${sp.name}`}>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300" htmlFor="bd">
          Preferred Date
        </label>
        <input
          id="bd"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
        />
        <div className="mb-2 flex justify-between text-xs font-medium">
          <span>Guests</span>
          <span className="font-semibold text-brand-500">{guests} people</span>
        </div>
        <input
          id="bg"
          type="range"
          min={2}
          max={200}
          value={guests}
          onChange={(e) => setGuests(+e.target.value)}
          className="mb-4 h-2 w-full cursor-pointer accent-[#4F46E5]"
        />
        <p className="muted mb-4 text-xs">
          Estimated minimum spend: <strong className="text-slate-900 dark:text-white">{naira(sp.bookingFrom + guests * 500)}</strong>.
        </p>
        <Button
          full
          size="lg"
          disabled={!date}
          onClick={() => {
            addBooking({ spaceId: sp.id, date, guests });
            setOpen(false);
            toast('Reservation requested. Track status in Profile.');
          }}
        >
          Send Reservation Request
        </Button>
      </BottomSheet>
    </div>
  );
}
