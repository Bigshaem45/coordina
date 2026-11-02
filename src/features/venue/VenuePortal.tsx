import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip, EmptyState, Skeleton } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { useAuth, useStore } from '../../store';
import { AREAS, CATEGORY_PHOTO } from '../../lib/constants';
import { fmtDate, fmtTime, naira } from '../../lib/format';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100';

export default function VenuePortal() {
  const { token } = useParams<{ token: string }>();

  if (token) {
    return <TokenConfirmationView token={token} />;
  }

  return <VenueManagerDesk />;
}

function TokenConfirmationView({ token }: { token: string }) {
  const { user } = useAuth();
  const record = useQuery(api.verification.getVenueConfirmationByToken, { token });
  const [notes, setNotes] = useState('');
  const [confirmedPhone, setConfirmedPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<'confirmed' | 'disputed' | null>(null);

  if (record === undefined) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
        <Skeleton className="h-12" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Icon name="error_outline" className="text-4xl text-rose-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
          Invalid or Expired Venue Token
        </h1>
        <p className="muted mt-1 max-w-sm text-xs">
          We could not find a venue confirmation request matching token <code className="font-mono">{token}</code>. Please check the link in your email or sign in to the Venue Desk.
        </p>
        <div className="mt-5 flex gap-2">
          <Link to="/venue-portal">
            <Button size="sm">Open Venue Desk</Button>
          </Link>
          <Link to="/home">
            <Button size="sm" variant="outline">
              Explore Platform
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleConfirm = async (confirmed: boolean) => {
    setSubmitting(true);
    try {
      const nextStatus = confirmed ? 'confirmed' : 'disputed';
      await convex.mutation(api.verification.confirmVenueBooking, {
        token: record.token,
        status: nextStatus,
        notes: notes.trim() || undefined,
        confirmedByPhone: confirmedPhone.trim() || user?.phone || undefined,
        actorUserId: user ? (user._id as any) : undefined,
      });
      setDecision(nextStatus);
      toast(
        confirmed
          ? 'Venue reservation confirmed on COORDINA!'
          : 'Booking disputed. Event flagged for compliance review.'
      );
    } catch (err: any) {
      toast(err?.message || 'Failed to submit venue response.');
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyResolved = record.status !== 'pending' && !decision;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Logo size={28} />
        <span className="rounded-full bg-neon-500/15 px-3 py-1 text-xs font-semibold text-neon-600 dark:text-neon-400">
          Venue Verification Token
        </span>
      </div>

      <div className="mt-6 text-left">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Booking Confirmation Request
        </h1>
        <p className="muted mt-1 text-xs leading-relaxed">
          An event organizer submitted an event scheduled at <strong>{record.venueName}</strong>. Please independently confirm or dispute whether their reservation is genuine.
        </p>
      </div>

      {decision || alreadyResolved ? (
        <Card className="mt-6 p-6 text-center">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              (decision ?? record.status) === 'confirmed'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
            }`}
          >
            <Icon
              name={(decision ?? record.status) === 'confirmed' ? 'check_circle' : 'cancel'}
              className="text-3xl"
              filled
            />
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            {(decision ?? record.status) === 'confirmed'
              ? 'Venue Reservation Confirmed'
              : 'Venue Booking Disputed'}
          </h2>
          <p className="muted mt-1 text-xs leading-relaxed">
            {(decision ?? record.status) === 'confirmed'
              ? 'Your confirmation has been recorded in the COORDINA compliance ledger and upgraded the event trust status.'
              : 'Your dispute has been logged with COORDINA Compliance and public verification has been rejected.'}
          </p>
          {record.notes && (
            <p className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-midnight-950 dark:text-slate-300">
              Notes: {record.notes}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/venue-portal">
              <Button size="sm">Venue Manager Desk</Button>
            </Link>
            <Link to="/home">
              <Button variant="outline" size="sm">
                Return to Platform
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          <Card className="divide-y divide-slate-100 p-5 dark:divide-slate-800">
            <div className="pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                Submitted Event
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {record.event?.title ?? 'Scheduled Event'}
              </h2>
              {record.event && (
                <p className="muted mt-0.5 text-xs">
                  {record.event.category} · {fmtDate(record.event.start)} ({fmtTime(record.event.start)} –{' '}
                  {fmtTime(record.event.end)})
                </p>
              )}
            </div>

            <div className="space-y-2 py-3 text-xs">
              <div className="flex justify-between">
                <span className="muted">Organizer</span>
                <strong className="text-slate-900 dark:text-white">{record.organizerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="muted">Organizer CAC</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {record.cacNumber}
                </span>
              </div>
              {record.directorName && (
                <div className="flex justify-between">
                  <span className="muted">Director</span>
                  <span className="text-slate-800 dark:text-slate-200">{record.directorName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="muted">Venue Requested</span>
                <strong className="text-slate-900 dark:text-white">{record.venueName}</strong>
              </div>
              {record.event && (
                <div className="flex justify-between">
                  <span className="muted">Expected Capacity</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {record.event.expectedAttendance.toLocaleString()} guests
                  </span>
                </div>
              )}
            </div>

            {record.documents && record.documents.length > 0 && (
              <div className="py-3 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Attached Booking Documents ({record.documents.length})
                </p>
                <div className="mt-2 space-y-1.5">
                  {record.documents.map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-midnight-800"
                    >
                      <span>
                        {doc.name} ({doc.type})
                      </span>
                      <Icon name="open_in_new" className="text-xs text-brand-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 text-xs">
              <span className="muted">Token Reference:</span>{' '}
              <code className="font-mono text-slate-800 dark:text-slate-200">{record.token}</code>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Representative Phone (Optional)
              </label>
              <input
                type="tel"
                value={confirmedPhone}
                onChange={(e) => setConfirmedPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Verification Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Hall deposit received, dates verified"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              disabled={submitting}
              className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={() => handleConfirm(false)}
            >
              <Icon name="close" className="text-sm" /> Dispute Booking
            </Button>
            <Button size="lg" disabled={submitting} onClick={() => handleConfirm(true)}>
              <Icon name="check" className="text-sm" /> Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VenueManagerDesk() {
  const { user, isLoading } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const navigate = useNavigate();
  const [tokenLookup, setTokenLookup] = useState('');
  const [deskTab, setDeskTab] = useState<'Confirmations' | 'Reservations' | 'My Spaces' | 'Add Space'>(
    'Confirmations'
  );

  const deskData = useQuery(
    api.spaces.getVenueDeskData,
    user && (user.role === 'venue_manager' || user.role === 'admin')
      ? { userId: user._id as any }
      : 'skip'
  );

  const [spaceForm, setSpaceForm] = useState({
    name: '',
    type: 'Event Centre',
    area: 'Wuse',
    address: '',
    capacity: 250,
    bookingFrom: 50000,
    crowd: 'Vibrant',
    contactPhone: '',
    hours: 'Open daily · 10:00 AM – 11:00 PM',
    about: '',
    amenities: 'Parking, Security, Generator, Sound System',
    image: '',
  });
  const [creatingSpace, setCreatingSpace] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-8">
        <Skeleton className="h-14" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Venue Manager Portal</h1>
          <p className="muted mt-0.5 text-sm">
            Confirm organizer event bookings, manage private table reservations, and register social spaces.
          </p>
        </div>
        <Badge tone="neon">Independent Venue Desk</Badge>
      </div>

      {/* Direct Token Lookup Card (Available to any representative holding an email token) */}
      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!tokenLookup.trim()) return;
            navigate(`/venue-portal/${encodeURIComponent(tokenLookup.trim())}`);
          }}
          className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
        >
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Have a Venue Verification Token from an email?
            </label>
            <input
              value={tokenLookup}
              onChange={(e) => setTokenLookup(e.target.value)}
              placeholder="Paste token e.g. tok_abc123_xyz"
              className={`${inputCls} font-mono`}
            />
          </div>
          <Button type="submit" className="mt-5 shrink-0" disabled={!tokenLookup.trim()}>
            <Icon name="verified" /> Open Token Request
          </Button>
        </form>
      </Card>

      {!user ? (
        <Card className="p-8 text-center">
          <Icon name="storefront" className="mx-auto text-4xl text-brand-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Sign in as a Venue Manager
          </h2>
          <p className="muted mx-auto mt-1 max-w-md text-xs leading-relaxed">
            Sign in or create a Venue Manager account to manage your spaces, respond to private table bookings, and track all event confirmation requests tied to your venue email.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/auth?role=venue_manager">
              <Button>Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup&role=venue_manager">
              <Button variant="outline">Register Venue Account</Button>
            </Link>
          </div>
        </Card>
      ) : user.role !== 'venue_manager' && user.role !== 'admin' ? (
        <Card className="p-8 text-center">
          <Icon name="lock" className="mx-auto text-3xl text-amber-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Venue Manager Role Required
          </h2>
          <p className="muted mx-auto mt-1 max-w-md text-xs">
            You are signed in as <strong>{user.role}</strong> ({user.email}). Paste a specific confirmation token above to verify a booking, or register a dedicated Venue Manager account to manage social spaces.
          </p>
        </Card>
      ) : (
        <>
          {!user.emailVerified && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <strong>Email Verification Required:</strong> Verify <strong>{user.email}</strong> before registering new social spaces.
              </div>
              <Button size="sm" onClick={() => setVerifyModalOpen(true)}>
                Verify Email
              </Button>
            </div>
          )}

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {(['Confirmations', 'Reservations', 'My Spaces', 'Add Space'] as const).map((t) => (
              <Chip key={t} active={deskTab === t} onClick={() => setDeskTab(t)}>
                {t}
              </Chip>
            ))}
          </div>

          {deskData === undefined ? (
            <Skeleton className="h-48" />
          ) : deskTab === 'Confirmations' ? (
            <div className="space-y-3">
              {!deskData?.confirmations.length ? (
                <EmptyState
                  icon="verified"
                  title="No Event Confirmation Requests Yet"
                  body="When an event planner schedules an event at your venue or enters your venue email, their verification request will appear here automatically."
                />
              ) : (
                deskData.confirmations.map((vc: any) => (
                  <Card key={vc._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {vc.event?.title ?? vc.venueName}
                        </h3>
                        <Badge
                          tone={
                            vc.status === 'confirmed'
                              ? 'neon'
                              : vc.status === 'disputed'
                              ? 'coral'
                              : 'amber'
                          }
                        >
                          {vc.status}
                        </Badge>
                      </div>
                      <p className="muted mt-1 text-xs">
                        Organizer: <strong>{vc.organizerName ?? 'Organizer'}</strong> · Venue:{' '}
                        <strong>{vc.venueName}</strong> · Token: <code className="font-mono">{vc.token}</code>
                      </p>
                    </div>
                    <Link to={`/venue-portal/${vc.token}`}>
                      <Button size="sm" variant={vc.status === 'pending' ? 'primary' : 'outline'}>
                        {vc.status === 'pending' ? 'Review & Confirm' : 'View Record'}
                      </Button>
                    </Link>
                  </Card>
                ))
              )}
            </div>
          ) : deskTab === 'Reservations' ? (
            <div className="space-y-3">
              {!deskData?.bookings.length ? (
                <EmptyState
                  icon="Deck"
                  title="No Table or Space Reservations"
                  body="Private table and venue hire requests submitted on your space profile will appear here."
                />
              ) : (
                deskData.bookings.map((b: any) => (
                  <Card key={b._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.spaceName}</h3>
                        <Badge
                          tone={
                            b.status === 'Confirmed'
                              ? 'neon'
                              : b.status === 'Declined'
                              ? 'coral'
                              : 'amber'
                          }
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <p className="muted mt-1 text-xs">
                        Guest: <strong>{b.userName}</strong> ({b.userEmail}) · Date: <strong>{b.date}</strong> ·{' '}
                        {b.guests} guests · Est. {naira(b.estimatedSpend)}
                      </p>
                    </div>
                    {b.status === 'Requested' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await convex.mutation(api.spaces.respondToBooking, {
                                userId: user._id as any,
                                bookingId: b._id,
                                status: 'Declined',
                              });
                              toast('Reservation declined.');
                            } catch (err: any) {
                              toast(err?.message || 'Unable to update reservation.');
                            }
                          }}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await convex.mutation(api.spaces.respondToBooking, {
                                userId: user._id as any,
                                bookingId: b._id,
                                status: 'Confirmed',
                              });
                              toast('Reservation confirmed! Guest notified.');
                            } catch (err: any) {
                              toast(err?.message || 'Unable to confirm reservation.');
                            }
                          }}
                        >
                          Confirm
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          ) : deskTab === 'My Spaces' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {!deskData?.spaces.length ? (
                <div className="sm:col-span-2">
                  <EmptyState
                    icon="domain_add"
                    title="No Spaces Registered Yet"
                    body="Register your lounge, event centre, rooftop, or gallery so organizers and attendees can discover and book it."
                    cta={
                      <Button size="sm" onClick={() => setDeskTab('Add Space')}>
                        Register Social Space
                      </Button>
                    }
                  />
                </div>
              ) : (
                deskData.spaces.map((s: any) => (
                  <Card key={s._id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{s.name}</h3>
                        <p className="muted text-xs">
                          {s.type} · {s.area}, {s.city}
                        </p>
                      </div>
                      <Badge tone={s.verified ? 'neon' : 'amber'}>
                        {s.verified ? 'Verified Space' : 'Pending Review'}
                      </Badge>
                    </div>
                    <p className="muted mt-2 text-xs">
                      Capacity: {s.capacity.toLocaleString()} · Min. spend {naira(s.bookingFrom ?? 25000)}
                    </p>
                    <div className="mt-3">
                      <Link to={`/space/${s._id}`}>
                        <Button size="sm" variant="outline">
                          View Space Profile
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Register a Social Space
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user.emailVerified) {
                    setVerifyModalOpen(true);
                    return;
                  }
                  setCreatingSpace(true);
                  try {
                    const areaInfo = AREAS[spaceForm.area] ?? AREAS.Wuse;
                    await convex.mutation(api.spaces.create, {
                      userId: user._id as any,
                      name: spaceForm.name.trim(),
                      type: spaceForm.type,
                      city: areaInfo.city,
                      area: spaceForm.area,
                      address: spaceForm.address.trim(),
                      lat: areaInfo.lat,
                      lng: areaInfo.lng,
                      capacity: Number(spaceForm.capacity) || 100,
                      amenities: spaceForm.amenities
                        .split(',')
                        .map((a) => a.trim())
                        .filter(Boolean),
                      crowd: spaceForm.crowd,
                      contactPhone: spaceForm.contactPhone.trim() || user.phone || '',
                      contactEmail: user.email,
                      hours: spaceForm.hours.trim(),
                      about: spaceForm.about.trim() || undefined,
                      bookingFrom: Number(spaceForm.bookingFrom) || 25000,
                      image: spaceForm.image.trim() || CATEGORY_PHOTO.Nightlife,
                    });
                    toast('Social space registered on COORDINA!');
                    setDeskTab('My Spaces');
                  } catch (err: any) {
                    toast(err?.message || 'Failed to register space.');
                  } finally {
                    setCreatingSpace(false);
                  }
                }}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">Venue / Space Name</label>
                  <input
                    required
                    value={spaceForm.name}
                    onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
                    placeholder="e.g. Meridian Rooftop Lounge"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Space Type</label>
                  <select
                    value={spaceForm.type}
                    onChange={(e) => setSpaceForm({ ...spaceForm, type: e.target.value })}
                    className={inputCls}
                  >
                    {['Event Centre', 'Rooftop Lounge', 'Gallery', 'Beach Club', 'Restaurant & Bar', 'Outdoor Park', 'Tech Hub'].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">District / Area</label>
                  <select
                    value={spaceForm.area}
                    onChange={(e) => setSpaceForm({ ...spaceForm, area: e.target.value })}
                    className={inputCls}
                  >
                    {Object.entries(AREAS).map(([area, meta]) => (
                      <option key={area} value={area}>
                        {area} ({meta.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Street Address</label>
                  <input
                    required
                    value={spaceForm.address}
                    onChange={(e) => setSpaceForm({ ...spaceForm, address: e.target.value })}
                    placeholder="Plot / Street address"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Guest Capacity</label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={spaceForm.capacity}
                    onChange={(e) => setSpaceForm({ ...spaceForm, capacity: +e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Table / Booking From (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={spaceForm.bookingFrom}
                    onChange={(e) => setSpaceForm({ ...spaceForm, bookingFrom: +e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Desk Contact Phone</label>
                  <input
                    required
                    value={spaceForm.contactPhone}
                    onChange={(e) => setSpaceForm({ ...spaceForm, contactPhone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Cover Photo URL (Optional)</label>
                  <input
                    value={spaceForm.image}
                    onChange={(e) => setSpaceForm({ ...spaceForm, image: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium">Amenities (comma-separated)</label>
                  <input
                    value={spaceForm.amenities}
                    onChange={(e) => setSpaceForm({ ...spaceForm, amenities: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium">About This Space</label>
                  <input
                    value={spaceForm.about}
                    onChange={(e) => setSpaceForm({ ...spaceForm, about: e.target.value })}
                    placeholder="Describe acoustics, seating, parking, and security protocols"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <Button full type="submit" disabled={creatingSpace}>
                    {creatingSpace ? 'Registering Space…' : 'Publish Social Space'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
