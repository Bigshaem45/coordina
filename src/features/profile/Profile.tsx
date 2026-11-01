import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip, EmptyState, Skeleton } from '../../design-system/ui';
import { useStore, useAuth, useActiveCity } from '../../store';
import { naira } from '../../lib/format';

export default function Profile() {
  const { user, isLoading, sessionUserId } = useAuth();
  const city = useActiveCity();
  const theme = useStore((s) => s.theme);
  const lowData = useStore((s) => s.lowData);
  const setTheme = useStore((s) => s.setTheme);
  const toggleLowData = useStore((s) => s.toggleLowData);
  const setCity = useStore((s) => s.setCity);
  const setBudget = useStore((s) => s.setBudget);
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const signOut = useStore((s) => s.signOut);
  const nav = useNavigate();

  const [localBudget, setLocalBudget] = useState(user?.budget ?? 100000);
  useEffect(() => {
    if (user?.budget) setLocalBudget(user.budget);
  }, [user?.budget]);

  const bookings = useQuery(
    api.spaces.getMyBookings,
    user ? { userId: user._id as any } : 'skip'
  );
  const orders = useQuery(
    api.orders.getMyOrders,
    user ? { userId: user._id as any } : 'skip'
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-0">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!sessionUserId || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-0">
        <Card className="p-6">
          <EmptyState
            icon="account_circle"
            title="Sign in to view your Profile"
            text="Your tickets, reservations, squad itineraries, and role workspace are mapped strictly to your authenticated account."
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link to="/auth?mode=signin&redirect=/profile">
                  <Button>
                    <Icon name="login" /> Log In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button variant="outline">Create Account</Button>
                </Link>
              </div>
            }
          />

          <div className="mt-6 divide-y divide-slate-100 border-t border-[var(--border)] pt-4 dark:divide-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance</p>
                <p className="muted text-xs">Switch between light and midnight dark themes</p>
              </div>
              <div className="flex gap-2">
                <Chip active={theme === 'light'} onClick={() => setTheme('light')}>
                  <Icon name="light_mode" className="text-sm" /> Light
                </Chip>
                <Chip active={theme === 'dark'} onClick={() => setTheme('dark')}>
                  <Icon name="dark_mode" className="text-sm" /> Dark
                </Chip>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Browsing City</p>
                <p className="muted text-xs">Filter discovery feed for Abuja or Lagos</p>
              </div>
              <div className="flex gap-2">
                {(['Abuja', 'Lagos'] as const).map((c) => (
                  <Chip key={c} active={city === c} onClick={() => setCity(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const roleBadgeLabel =
    user.role === 'admin'
      ? 'Compliance Admin'
      : user.role === 'organiser'
      ? 'Event Planner'
      : user.role === 'venue_manager'
      ? 'Venue Manager'
      : 'Attendee';

  const workspaceLinks = [
    { to: '/tickets', icon: 'confirmation_number', title: 'My Ticket Wallet', sub: 'Offline QR passes, transfers & refunds' },
    { to: '/squad', icon: 'groups', title: 'Squad Mode', sub: 'Vote with friends & split costs' },
    ...(user.role === 'organiser' || user.role === 'admin'
      ? [
          {
            to: '/organiser',
            icon: 'equalizer',
            title: 'Organiser Studio',
            sub: 'Publish events, KYC verification & Paystack payouts',
          },
          {
            to: '/scanner',
            icon: 'qr_code_scanner',
            title: 'Gate QR Scanner',
            sub: 'Verify & check in attendee passes at the gate',
          },
        ]
      : []),
    ...(user.role === 'venue_manager' || user.role === 'admin'
      ? [
          {
            to: '/venue-portal',
            icon: 'storefront',
            title: 'Venue Confirmation Desk',
            sub: 'Confirm event bookings & manage table reservations',
          },
          ...(user.role === 'venue_manager'
            ? [
                {
                  to: '/scanner',
                  icon: 'qr_code_scanner',
                  title: 'Gate QR Scanner',
                  sub: 'Validate attendee passes at venue entrance',
                },
              ]
            : []),
        ]
      : []),
    ...(user.role === 'admin'
      ? [
          {
            to: '/admin',
            icon: 'verified_user',
            title: 'Admin Compliance Console',
            sub: 'KYC reviews, fraud reports, blacklist & audit logs',
          },
        ]
      : []),
    ...(user.role === 'attendee'
      ? [
          {
            to: '/organiser',
            icon: 'business',
            title: 'Become an Event Planner',
            sub: 'Activate organizer studio to host verified events',
          },
        ]
      : []),
    { to: '/team', icon: 'badge', title: 'Leadership Team', sub: 'Meet the COORDINA executive team' },
    { to: '/', icon: 'home', title: 'Landing Showcase', sub: 'Public overview & Android APK download' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-0">
      {/* Authenticated Profile Summary */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-semibold text-white">
            {user.name[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{user.name}</h1>
              <Badge tone="brand">{roleBadgeLabel}</Badge>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Icon name="verified" className="text-xs" /> Email Verified
                </span>
              ) : (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-coral-500/50 bg-coral-500/10 px-2 py-0.5 text-[11px] font-bold text-coral-600 dark:text-coral-400">
                  <Icon name="gpp_bad" className="text-xs" /> Email Unverified
                </span>
              )}
            </div>
            <p className="muted text-xs">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="muted">{user.city}</Badge>
              <Badge tone="muted">{user.vibe}</Badge>
              <Badge tone="neon">Budget Cap {naira(user.budget)}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Bold Unverified Email Card */}
      {!user.emailVerified && (
        <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Icon name="mark_email_read" className="text-2xl" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Email Verification Required
                  </h2>
                  <Badge tone="coral">Restrictions Active</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Your email (<strong className="text-slate-900 dark:text-slate-100">{user.email}</strong>) is unverified.
                  Verify now to unlock restricted platform actions:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-lg bg-black/5 px-2 py-1 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    Ticket Checkout
                  </span>
                  <span className="rounded-lg bg-black/5 px-2 py-1 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    Event Publishing &amp; KYC
                  </span>
                  <span className="rounded-lg bg-black/5 px-2 py-1 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    Payout Settlements
                  </span>
                  <span className="rounded-lg bg-black/5 px-2 py-1 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    Squad Voting &amp; Reservations
                  </span>
                </div>
              </div>
            </div>
            <Button
              className="shrink-0 bg-amber-600 text-white shadow-md shadow-amber-600/20 hover:bg-amber-700"
              onClick={() => setVerifyModalOpen(true)}
            >
              <Icon name="verified" /> Request Verification
            </Button>
          </div>
        </Card>
      )}

      {/* Personal Preferences */}
      <Card className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance</p>
            <p className="muted text-xs">Switch between crisp light and midnight dark themes</p>
          </div>
          <div className="flex gap-2">
            <Chip active={theme === 'light'} onClick={() => setTheme('light')}>
              <Icon name="light_mode" className="text-sm" /> Light
            </Chip>
            <Chip active={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Icon name="dark_mode" className="text-sm" /> Dark
            </Chip>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Primary City</p>
            <p className="muted text-xs">Synced directly to your COORDINA account</p>
          </div>
          <div className="flex gap-2">
            {(['Abuja', 'Lagos'] as const).map((c) => (
              <Chip key={c} active={user.city === c} onClick={() => setCity(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Low-Data Mode</p>
            <p className="muted text-xs">Replaces high-res photography with lightweight category gradients</p>
          </div>
          <Chip active={lowData} onClick={toggleLowData}>
            {lowData ? 'Enabled' : 'Off'}
          </Chip>
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="bud" className="font-medium text-slate-900 dark:text-slate-100">
              Plan Budget Alert Limit
            </label>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{naira(localBudget)}</span>
          </div>
          <input
            id="bud"
            type="range"
            min={5000}
            max={500000}
            step={5000}
            value={localBudget}
            onChange={(e) => setLocalBudget(+e.target.value)}
            onMouseUp={() => setBudget(localBudget)}
            onTouchEnd={() => setBudget(localBudget)}
            className="mt-2 h-9 w-full cursor-pointer accent-brand-500"
          />
        </div>
      </Card>

      {/* Role-Mapped Workspaces */}
      <div className="grid gap-3 sm:grid-cols-2">
        {workspaceLinks.map((w) => (
          <Link key={w.to} to={w.to} className="group block">
            <Card className="flex items-center justify-between gap-3 p-4 transition-all group-hover:border-brand-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={w.icon} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{w.title}</p>
                  <p className="muted text-xs">{w.sub}</p>
                </div>
              </div>
              <Icon name="chevron_right" className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
      </div>

      {/* Live Per-User Space Bookings & Ticket Orders */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            My Space Reservations
          </h2>
          {bookings === undefined ? (
            <Skeleton className="h-20" />
          ) : bookings.length === 0 ? (
            <p className="muted text-sm">
              No reservations yet. Open any verified social space to request a table.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookings.map((b: any) => (
                <div key={b._id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{b.spaceName}</p>
                    <p className="muted text-xs">
                      {b.date} · {b.guests} guests · Est. {naira(b.estimatedSpend)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      b.status === 'Confirmed'
                        ? 'neon'
                        : b.status === 'Declined'
                        ? 'coral'
                        : 'brand'
                    }
                  >
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            My Order History
          </h2>
          {orders === undefined ? (
            <Skeleton className="h-20" />
          ) : orders.length === 0 ? (
            <p className="muted text-sm">Completed ticket orders for {user.email} appear here.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o: any) => (
                <Link
                  key={o._id}
                  to={`/success/${o.orderId}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:opacity-80"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {o.orderId}
                    </p>
                    <p className="muted text-xs">
                      {new Date(o.createdAt).toLocaleDateString('en-NG')} ·{' '}
                      {o.items.reduce((s: number, it: any) => s + it.qty, 0)} pass(es)
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {naira(o.total)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="outline"
          onClick={() => {
            signOut();
            nav('/');
          }}
        >
          <Icon name="logout" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
