import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Icon } from '../../design-system/Icon';
import { CATEGORIES, AREAS, CATEGORY_PHOTO } from '../../lib/constants';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  Cover,
  EmptyState,
  Skeleton,
} from '../../design-system/ui';
import {
  useAuth,
  useSpacesQuery,
  useStore,
  mapConvexEvent,
  type SessionUser,
} from '../../store';
import {
  fmtDate,
  fmtTime,
  naira,
  computeOrganiserPostingFee,
  FREE_EVENT_RATE_PER_100,
} from '../../lib/format';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendEmail, sendVenueConfirmationRequestEmail } from '../../lib/email';
import type { Category, CEvent, RegionRestriction, Vibe } from '../../types';
import { cleanErrorMessage } from '../../lib/errors';
import {
  formatVisitorLocation,
  isUserCoordinaPlus,
  NIGERIAN_STATES,
  REGION_PRESETS,
  SUPPORTED_COUNTRIES,
  useVisitorGeo,
} from '../../lib/geo';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import { calculateRiskAssessment } from '../../lib/verification';
import GateScanner from '../wallet/GateScanner';
import FaceLivenessScanner, { type BiometricScanResult } from './FaceLivenessScanner';
import {
  COMMON_NIGERIAN_BANKS,
  resolveAccount,
  createTransferRecipient,
  initiateTransfer,
  payWithPaystack,
} from '../../lib/paystack';

type Tab = 'Dashboard' | 'Create' | 'COORDINA Plus' | 'Verification' | 'Scanner' | 'Payouts';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export default function Organiser() {
  const [tab, setTab] = useState<Tab>('Dashboard');
  const { user, isLoading } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const [upgradeBrandName, setUpgradeBrandName] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-8">
        <Skeleton className="h-14" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Access Restriction Gate: Not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon name="lock" className="text-3xl" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Organiser Studio Access
        </h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          The Organiser Studio is reserved for event planners and hosts. Sign in or register an Event Planner account to publish events, complete KYC &amp; venue verification, scan passes, and withdraw payouts.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth?role=organiser">
            <Button size="lg">Sign In as Organizer</Button>
          </Link>
          <Link to="/auth?mode=signup&role=organiser">
            <Button size="lg" variant="outline">
              Register as Organizer
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Access Restriction Gate: Non-Organiser Role
  if (user.role !== 'organiser' && user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon name="admin_panel_settings" className="text-3xl" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Icon name="person" className="text-xs" /> Current Role: {user.role} ({user.email})
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
          Activate Event Planner Studio
        </h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          Upgrade your account to <strong>Event Organizer</strong> to publish events, submit corporate &amp; facial biometric KYC, scan tickets at the gate, and settle payouts to your Nigerian bank account.
        </p>

        {!user.emailVerified ? (
          <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold">Verify your email address first</p>
            <p className="mt-1">
              Please verify <strong>{user.email}</strong> before activating an Event Planner studio.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setVerifyModalOpen(true)}>
              Verify Email Now
            </Button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setUpgrading(true);
              try {
                await convex.mutation(api.auth.upgradeToOrganiser, {
                  userId: user._id as any,
                  businessName: upgradeBrandName.trim() || user.name,
                });
                toast('Organizer Studio activated for your account!');
              } catch (err: any) {
                toast(err?.message || 'Unable to upgrade account.');
              } finally {
                setUpgrading(false);
              }
            }}
            className="mt-6 space-y-3 text-left"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Organization or Brand Name
              </label>
              <input
                required
                value={upgradeBrandName}
                onChange={(e) => setUpgradeBrandName(e.target.value)}
                placeholder="Enter your registered brand or planning company name"
                className={inputCls}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="lg" type="submit" disabled={upgrading || !upgradeBrandName.trim()}>
                <Icon name="upgrade" /> {upgrading ? 'Activating…' : 'Activate Organizer Studio'}
              </Button>
              <Link to="/home">
                <Button size="lg" variant="outline" type="button">
                  Back to Discover
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-0">
      {!user.emailVerified && (
        <div className="mb-5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-bold text-white shadow-sm">
                <Icon name="gpp_bad" className="text-xl" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Organiser Email Unverified
                  </h3>
                  <Badge tone="coral">Action Required</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Your organizer email (<strong className="text-slate-900 dark:text-slate-100">{user.email}</strong>) is unverified. Event publishing, KYC submission, gate scanner access, and bank payouts are restricted until verified.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 font-bold text-white shadow-sm hover:bg-amber-700"
              onClick={() => setVerifyModalOpen(true)}
            >
              <Icon name="mark_email_read" /> Request Verification
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Organiser Studio
            </h1>
            {user.organizer?.status === 'verified' ? (
              <Badge tone="neon">KYC Verified</Badge>
            ) : (
              <Badge tone="amber">KYC Pending</Badge>
            )}
            {isUserCoordinaPlus(user) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
                <Icon name="workspace_premium" className="text-sm" /> COORDINA Plus
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setTab('COORDINA Plus')}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300"
              >
                <Icon name="workspace_premium" className="text-sm" /> Upgrade to Plus
              </button>
            )}
          </div>
          <p className="muted mt-0.5 text-sm">
            {user.organizer?.businessName || user.name} · Manage your events, IP region locks, verification dossiers, gate passes, and payouts.
          </p>
        </div>
        {tab !== 'Create' && (
          <Button size="sm" onClick={() => setTab('Create')}>
            <Icon name="add_circle" /> Create Event
          </Button>
        )}
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {(
          ['Dashboard', 'Create', 'COORDINA Plus', 'Verification', 'Scanner', 'Payouts'] as Tab[]
        ).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === 'COORDINA Plus' ? '✦ COORDINA Plus' : t}
          </Chip>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'Dashboard' ? (
          <Dashboard
            user={user}
            onCreateClick={() => setTab('Create')}
            onVerifyClick={() => setTab('Verification')}
            onUpgradePlus={() => setTab('COORDINA Plus')}
          />
        ) : tab === 'Create' ? (
          <Create
            user={user}
            onDone={() => setTab('Verification')}
            onUpgradePlus={() => setTab('COORDINA Plus')}
          />
        ) : tab === 'COORDINA Plus' ? (
          <CoordinaPlusPanel
            user={user}
            onCreateClick={() => setTab('Create')}
            onDashboardClick={() => setTab('Dashboard')}
          />
        ) : tab === 'Verification' ? (
          <OrganizerVerificationPortal user={user} onCreateClick={() => setTab('Create')} />
        ) : tab === 'Scanner' ? (
          <GateScanner />
        ) : (
          <Payouts user={user} onGoVerify={() => setTab('Verification')} />
        )}
      </div>
    </div>
  );
}

function Dashboard({
  user,
  onCreateClick,
  onVerifyClick,
  onUpgradePlus,
}: {
  user: SessionUser;
  onCreateClick: () => void;
  onVerifyClick: () => void;
  onUpgradePlus: () => void;
}) {
  const dash = useQuery(api.events.getOrganizerDashboard, { userId: user._id as any });
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const [code, setCode] = useState('');
  const [pct, setPct] = useState(10);
  const [selectedPromoEvent, setSelectedPromoEvent] = useState<string>('');
  const [savingPromo, setSavingPromo] = useState(false);

  const [regionModalEvent, setRegionModalEvent] = useState<CEvent | null>(null);
  const [draftRegion, setDraftRegion] = useState<RegionRestriction>({
    enabled: false,
    mode: 'state',
    label: 'Abuja (FCT), Nigeria',
    allowedCountries: ['NG'],
    allowedStates: ['Abuja (FCT)', 'FC'],
  });
  const [savingRegion, setSavingRegion] = useState(false);

  const hasPlus = Boolean(dash?.isCoordinaPlus || isUserCoordinaPlus(user));

  const mine = useMemo(() => (dash?.events ?? []).map(mapConvexEvent), [dash?.events]);

  if (!dash) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Tickets Sold',
      value: dash.ticketsSold.toLocaleString(),
      accent: 'border-l-brand-500',
    },
    {
      label: 'Gross Revenue',
      value: dash.grossRevenue === 0 ? '₦0' : naira(dash.grossRevenue),
      accent: 'border-l-neon-500',
    },
    {
      label: 'Checked In',
      value: `${dash.checkedInCount} / ${dash.totalIssuedTickets}`,
      accent: 'border-l-amber-500',
    },
    {
      label: 'My Events',
      value: String(mine.length),
      accent: 'border-l-coral-500',
    },
  ];

  const tierChartData = mine.flatMap((e) =>
    e.tiers.map((t) => ({
      name: `${e.title.slice(0, 14)} · ${t.name}`,
      sold: Math.max(0, t.total - t.remaining),
    }))
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`border-l-4 ${k.accent} p-4`}>
            <p className="muted text-xs">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {k.value}
            </p>
          </Card>
        ))}
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon="event"
          title="You Haven’t Published Any Events Yet"
          body="Create your first event to start selling cryptographic QR passes, tracking 14-day revenue velocity, and requesting remote venue verification."
          cta={
            <Button onClick={onCreateClick}>
              <Icon name="add_circle" /> Publish Your First Event
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              My Published Events
            </h2>
            <Badge tone="brand">{mine.length} total</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3">#</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Trust Status</th>
                  <th className="px-4 py-3">Date &amp; Venue</th>
                  <th className="px-4 py-3">Sold</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mine.map((e, idx) => {
                  const eventSold = e.tiers.reduce((a, t) => a + Math.max(0, t.total - t.remaining), 0);
                  const eventTotal = e.tiers.reduce((a, t) => a + t.total, 0);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 text-xs text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Cover
                            gradient={e.image}
                            category={e.category}
                            label={e.title}
                            className="h-10 w-14 shrink-0 rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {e.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="muted text-xs">{e.category}</span>
                              {e.regionRestriction?.enabled ? (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                                  <Icon name="public" className="text-[11px]" />
                                  {e.regionRestriction.label}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">· Global IP</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <VerificationBadge status={e.verificationStatus} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-medium">{e.venueName}</div>
                        <div className="muted">
                          {fmtDate(e.start)} · {fmtTime(e.start)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone="neon">
                          {eventSold} / {eventTotal}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRegionModalEvent(e);
                              setDraftRegion(
                                e.regionRestriction ?? {
                                  enabled: false,
                                  mode: 'state',
                                  label:
                                    e.city === 'Lagos'
                                      ? 'Lagos State, Nigeria'
                                      : 'Abuja (FCT), Nigeria',
                                  allowedCountries: ['NG'],
                                  allowedStates:
                                    e.city === 'Lagos' ? ['Lagos', 'LA'] : ['Abuja (FCT)', 'FC'],
                                }
                              );
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300"
                            title="Configure IP Region Lock (COORDINA Plus)"
                          >
                            <Icon name="public" className="text-sm" />
                            <span>Region Lock</span>
                          </button>
                          {e.verificationStatus === 'Unverified' && (
                            <button
                              type="button"
                              onClick={onVerifyClick}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                            >
                              Verify
                            </button>
                          )}
                          <Link
                            to={`/event/${e.id}`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-200"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Revenue Velocity (Last 14 Days)
            </h3>
            <span className="muted text-xs">Live Paid Orders</span>
          </div>
          <div className="h-56" role="img" aria-label="14-day revenue chart">
            <ResponsiveContainer>
              <AreaChart data={dash.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="label" fontSize={11} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" />
                <Tooltip
                  formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fill="#4F46E528"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            Tickets Sold by Tier
          </h3>
          {tierChartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-slate-400">
              Publish an event to view tier velocity.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={tierChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="name" hide />
                  <YAxis fontSize={11} stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="sold" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Live Convex Promo Codes */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Promo Codes
            </h3>
            <p className="muted text-xs">
              Codes created here apply directly during attendee checkout for your events.
            </p>
          </div>
          <Badge tone="brand">{dash.promoCodes.length} codes</Badge>
        </div>

        {dash.promoCodes.length === 0 ? (
          <p className="muted py-3 text-xs">No promo codes created yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dash.promoCodes.map((c: any) => (
              <div key={c._id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {c.code}
                  </span>
                  <Badge tone={c.active ? 'neon' : 'muted'}>
                    {c.active ? `${c.discountPct}% OFF` : 'Paused'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="muted text-xs">{c.uses} redemptions</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await convex.mutation(api.events.togglePromoCode, {
                          userId: user._id as any,
                          promoId: c._id,
                        });
                      } catch (err: any) {
                        toast(err?.message || 'Unable to update promo code.');
                      }
                    }}
                  >
                    {c.active ? 'Pause' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user.emailVerified) {
              setVerifyModalOpen(true);
              return;
            }
            if (!code.trim()) return;
            setSavingPromo(true);
            try {
              await convex.mutation(api.events.createPromoCode, {
                userId: user._id as any,
                code: code.trim(),
                discountPct: pct,
                eventId: selectedPromoEvent ? (selectedPromoEvent as any) : undefined,
              });
              setCode('');
              toast('Promo code saved to Convex!');
            } catch (err: any) {
              toast(err?.message || 'Failed to create promo code.');
            } finally {
              setSavingPromo(false);
            }
          }}
          className="mt-4 flex flex-wrap gap-2 sm:flex-nowrap"
        >
          <input
            aria-label="Promo code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE2026"
            className={`${inputCls} flex-1 font-mono`}
          />
          <select
            aria-label="Target event"
            value={selectedPromoEvent}
            onChange={(e) => setSelectedPromoEvent(e.target.value)}
            className={`${inputCls} sm:w-48`}
          >
            <option value="">All My Events</option>
            {mine.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <input
            aria-label="Discount percent"
            type="number"
            min={1}
            max={90}
            value={pct}
            onChange={(e) => setPct(+e.target.value)}
            className={`${inputCls} w-24`}
          />
          <Button type="submit" disabled={!code.trim() || savingPromo}>
            {savingPromo ? 'Saving…' : 'Add Code'}
          </Button>
        </form>
      </Card>

      <BottomSheet
        open={Boolean(regionModalEvent)}
        onClose={() => setRegionModalEvent(null)}
        title={
          regionModalEvent
            ? `IP Region Lock — ${regionModalEvent.title}`
            : 'Configure IP Region Lock'
        }
      >
        {regionModalEvent && (
          <div className="space-y-4">
            <RegionLockConfigurator
              hasCoordinaPlus={hasPlus}
              eventCity={regionModalEvent.city}
              value={draftRegion}
              onChange={setDraftRegion}
              onUpgradeClick={() => {
                setRegionModalEvent(null);
                onUpgradePlus();
              }}
            />
            {hasPlus && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRegionModalEvent(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={savingRegion}
                  onClick={async () => {
                    if (!user.emailVerified) {
                      setVerifyModalOpen(true);
                      return;
                    }
                    setSavingRegion(true);
                    try {
                      await convex.mutation(api.events.updateEventRegionRestriction, {
                        userId: user._id as any,
                        eventId: regionModalEvent.id as any,
                        regionRestriction: draftRegion,
                      });
                      toast(
                        draftRegion.enabled
                          ? `IP Region Lock saved: ${draftRegion.label}`
                          : 'IP Region Lock disabled — tickets open globally.'
                      );
                      setRegionModalEvent(null);
                    } catch (err: any) {
                      toast(cleanErrorMessage(err, 'Unable to update IP region lock.'));
                    } finally {
                      setSavingRegion(false);
                    }
                  }}
                >
                  {savingRegion ? 'Saving…' : 'Save Region Rule'}
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function Create({
  user,
  onDone,
  onUpgradePlus,
}: {
  user: SessionUser;
  onDone: () => void;
  onUpgradePlus: () => void;
}) {
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const { spaces } = useSpacesQuery();
  const hasPlus = isUserCoordinaPlus(user);

  const tomorrowIso = useMemo(() => {
    const d = new Date(Date.now() + 3 * 86400000);
    return d.toISOString().slice(0, 10);
  }, []);

  const [useRegisteredSpace, setUseRegisteredSpace] = useState(spaces.length > 0);
  const [f, setF] = useState({
    title: '',
    category: 'Concerts' as Category,
    vibe: 'Energetic' as Vibe,
    area: 'Wuse',
    spaceId: '',
    customVenueName: '',
    customAddress: '',
    date: tomorrowIso,
    startTime: '19:00',
    endTime: '23:00',
    description: '',
    imageUrl: '',
  });
  const [tiers, setTiers] = useState([{ name: 'Regular', price: 10000, qty: 150 }]);
  const [regionRestriction, setRegionRestriction] = useState<RegionRestriction>({
    enabled: false,
    mode: 'state',
    label: 'Abuja (FCT), Nigeria',
    allowedCountries: ['NG'],
    allowedStates: ['Abuja (FCT)', 'FC'],
  });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (spaces.length > 0 && !f.spaceId) {
      setF((prev) => ({ ...prev, spaceId: spaces[0].id, area: spaces[0].area }));
      setUseRegisteredSpace(true);
    }
  }, [spaces, f.spaceId]);

  const postingFee = computeOrganiserPostingFee(tiers);

  const handleFlyerUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 960;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setF((prev) => ({ ...prev, imageUrl: canvas.toDataURL('image/jpeg', 0.82) }));
          toast('Event flyer attached.');
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const publishToConvex = async () => {
    const selectedSpace = useRegisteredSpace
      ? spaces.find((s) => s.id === f.spaceId)
      : undefined;

    const areaKey = selectedSpace ? selectedSpace.area : f.area;
    const areaMeta = AREAS[areaKey] ?? AREAS.Wuse;
    const venueName = selectedSpace ? selectedSpace.name : f.customVenueName.trim();
    const address = selectedSpace ? selectedSpace.address : f.customAddress.trim();

    if (!venueName || !address) {
      toast('Please specify a valid venue name and street address.');
      return;
    }

    const startDate = new Date(`${f.date}T${f.startTime}:00`);
    let endDate = new Date(`${f.date}T${f.endTime}:00`);
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 4 * 3600 * 1000);
    }

    const formattedTiers = tiers.map((t, idx) => ({
      id: `tier_${idx + 1}_${Date.now().toString(36)}`,
      name: t.name.trim() || `Tier ${idx + 1}`,
      price: Math.max(0, Number(t.price) || 0),
      total: Math.max(1, Number(t.qty) || 1),
      remaining: Math.max(1, Number(t.qty) || 1),
    }));

    const totalCap = formattedTiers.reduce((s, t) => s + t.total, 0);

    await convex.mutation(api.events.create, {
      userId: user._id as any,
      title: f.title.trim(),
      description:
        f.description.trim() || `${f.title.trim()} hosted at ${venueName}, ${areaKey}.`,
      category: f.category,
      city: selectedSpace ? selectedSpace.city : areaMeta.city,
      area: areaKey,
      spaceId: selectedSpace ? (selectedSpace.id as any) : undefined,
      venueName,
      address,
      lat: selectedSpace ? selectedSpace.lat : areaMeta.lat,
      lng: selectedSpace ? selectedSpace.lng : areaMeta.lng,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      image: f.imageUrl.trim() || CATEGORY_PHOTO[f.category],
      tags: [f.category, areaKey],
      clashTags: [f.category],
      vibe: f.vibe,
      tiers: formattedTiers,
      isFree: postingFee.isFree,
      expectedAttendance: totalCap,
      regionRestriction:
        hasPlus && regionRestriction.enabled ? regionRestriction : undefined,
    });

    toast('Event published to Convex! Complete remote KYC & venue verification next.');
    onDone();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.emailVerified) {
      toast('Verify your organizer email before publishing events.');
      setVerifyModalOpen(true);
      return;
    }
    if (!f.title.trim()) return;

    setPublishing(true);
    try {
      if (postingFee.isFree && postingFee.postingFee > 0) {
        const ref = `CRD-HOST-${Date.now()}`;
        const payRes = await payWithPaystack({
          email: user.email,
          amountKobo: postingFee.postingFee * 100,
          reference: ref,
          metadata: {
            purpose: 'free_event_capacity_fee',
            organizerId: user.organizerId,
            eventTitle: f.title.trim(),
          },
          onSuccess: async () => {
            try {
              await publishToConvex();
            } catch (err: any) {
              toast(err?.message || 'Payment succeeded, but event creation failed.');
            } finally {
              setPublishing(false);
            }
          },
          onCancel: () => {
            setPublishing(false);
            toast('Capacity hosting fee payment cancelled.');
          },
        });
        if (!payRes.launched) {
          setPublishing(false);
          toast(payRes.error || 'Paystack gateway unavailable.');
        }
        return;
      }

      await publishToConvex();
    } catch (err: any) {
      toast(err?.message || 'Unable to publish event.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Event Details
          </h3>
          <Badge tone="brand">Live Convex Listing</Badge>
        </div>

        <input
          aria-label="Event title"
          required
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Event title"
          className={inputCls}
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            aria-label="Category"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value as Category })}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Vibe"
            value={f.vibe}
            onChange={(e) => setF({ ...f, vibe: e.target.value as Vibe })}
            className={inputCls}
          >
            {(['Chill', 'Energetic', 'Intimate', 'Family'] as Vibe[]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Venue Selection: Registered Space vs Custom Venue */}
        <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Venue Location
            </span>
            {spaces.length > 0 && (
              <button
                type="button"
                onClick={() => setUseRegisteredSpace((v) => !v)}
                className="text-xs font-semibold text-brand-500 hover:underline"
              >
                {useRegisteredSpace ? 'Enter custom venue instead' : 'Choose from registered spaces'}
              </button>
            )}
          </div>

          {useRegisteredSpace && spaces.length > 0 ? (
            <select
              aria-label="Venue"
              value={f.spaceId}
              onChange={(e) => {
                const sp = spaces.find((s) => s.id === e.target.value);
                setF({
                  ...f,
                  spaceId: e.target.value,
                  area: sp ? sp.area : f.area,
                });
              }}
              className={inputCls}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.area}, {s.city} {s.verified ? '(Verified)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                aria-label="District"
                value={f.area}
                onChange={(e) => setF({ ...f, area: e.target.value })}
                className={inputCls}
              >
                {Object.entries(AREAS).map(([area, meta]) => (
                  <option key={area} value={area}>
                    {area} ({meta.city})
                  </option>
                ))}
              </select>
              <input
                required
                value={f.customVenueName}
                onChange={(e) => setF({ ...f, customVenueName: e.target.value })}
                placeholder="Venue / Hall Name"
                className={inputCls}
              />
              <input
                required
                value={f.customAddress}
                onChange={(e) => setF({ ...f, customAddress: e.target.value })}
                placeholder="Full street address"
                className={`${inputCls} sm:col-span-2`}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <input
            aria-label="Date"
            type="date"
            required
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
            className={inputCls}
          />
          <input
            aria-label="Start time"
            type="time"
            required
            value={f.startTime}
            onChange={(e) => setF({ ...f, startTime: e.target.value })}
            className={inputCls}
          />
          <input
            aria-label="End time"
            type="time"
            required
            value={f.endTime}
            onChange={(e) => setF({ ...f, endTime: e.target.value })}
            className={inputCls}
          />
        </div>

        <textarea
          aria-label="Description"
          rows={3}
          required
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="Describe the lineup, dress code, parking, and guest experience…"
          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Upload Event Flyer (JPG/PNG)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFlyerUpload(e.target.files?.[0])}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-600 dark:file:bg-brand-500/15 dark:file:text-brand-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Or Flyer Image URL
            </label>
            <input
              value={f.imageUrl.startsWith('data:') ? '' : f.imageUrl}
              onChange={(e) => setF({ ...f, imageUrl: e.target.value })}
              placeholder="https://..."
              className={inputCls}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Ticket Tiers
          </h3>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTiers([...tiers, { name: 'VIP', price: 30000, qty: 40 }])}
          >
            <Icon name="add" /> Add Tier
          </Button>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-2">
            <input
              aria-label={`Tier ${i + 1} name`}
              value={t.name}
              onChange={(e) =>
                setTiers(tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
              placeholder="Tier"
              className={`${inputCls} col-span-5`}
            />
            <input
              aria-label={`Tier ${i + 1} price`}
              type="number"
              min={0}
              value={t.price}
              onChange={(e) =>
                setTiers(tiers.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))
              }
              placeholder="₦ Price"
              className={`${inputCls} col-span-4`}
            />
            <input
              aria-label={`Tier ${i + 1} quantity`}
              type="number"
              min={1}
              value={t.qty}
              onChange={(e) =>
                setTiers(tiers.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))
              }
              placeholder="Qty"
              className={`${inputCls} col-span-2`}
            />
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                className="col-span-1 flex h-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Icon name="delete" className="text-base" />
              </button>
            )}
          </div>
        ))}
      </Card>

      <RegionLockConfigurator
        hasCoordinaPlus={hasPlus}
        eventCity={
          useRegisteredSpace
            ? spaces.find((s) => s.id === f.spaceId)?.city || 'Abuja'
            : (AREAS[f.area] ?? AREAS.Wuse).city
        }
        value={regionRestriction}
        onChange={setRegionRestriction}
        onUpgradeClick={onUpgradePlus}
      />

      <Card
        className={`p-5 ${
          postingFee.isFree ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                postingFee.isFree
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Icon name={postingFee.isFree ? 'groups' : 'verified'} />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {postingFee.isFree
                  ? 'Free Event Organiser Hosting Fee'
                  : 'Paid Event — ₦0 Upfront Organiser Fee'}
              </h4>
              <p className="muted mt-1 text-xs leading-relaxed">
                {postingFee.isFree
                  ? `Free events are billed ₦${FREE_EVENT_RATE_PER_100.toLocaleString()} per 100 attendees capacity (${postingFee.totalCapacity} capacity = ${postingFee.hundredBlocks} × ₦${FREE_EVENT_RATE_PER_100.toLocaleString()}). Attendees RSVP free.`
                  : 'Paid events cost ₦0 upfront to publish. Standard platform service fees are transparently handled at attendee checkout.'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="muted block text-[11px]">Due on Publish</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {postingFee.postingFee === 0 ? '₦0' : naira(postingFee.postingFee)}
            </span>
          </div>
        </div>
      </Card>

      <Button full size="lg" type="submit" disabled={publishing}>
        {publishing
          ? 'Publishing…'
          : postingFee.isFree && postingFee.postingFee > 0
          ? `Pay ${naira(postingFee.postingFee)} & Publish Event`
          : 'Publish Event'}
      </Button>
    </form>
  );
}

function OrganizerVerificationPortal({
  user,
  onCreateClick,
}: {
  user: SessionUser;
  onCreateClick: () => void;
}) {
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const verState = useQuery(api.verification.getOrganizerVerificationState, {
    userId: user._id as any,
  });
  const dash = useQuery(api.events.getOrganizerDashboard, { userId: user._id as any });
  const mine = useMemo(() => (dash?.events ?? []).map(mapConvexEvent), [dash?.events]);

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [cac, setCac] = useState('');
  const [director, setDirector] = useState('');
  const [nin, setNin] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [venueEmail, setVenueEmail] = useState('');
  const [venuePhone, setVenuePhone] = useState('');
  const [biometricScan, setBiometricScan] = useState<BiometricScanResult | null>(null);
  const [docs, setDocs] = useState<
    { id: string; name: string; type: string; url: string; uploadedAt: string; verified: boolean }[]
  >([]);
  const [docType, setDocType] = useState('Venue Booking');
  const [submitting, setSubmitting] = useState(false);
  const [hydratedOrg, setHydratedOrg] = useState(false);

  // Hydrate ONLY from this authenticated organizer's own Convex record
  useEffect(() => {
    if (verState?.organizer && !hydratedOrg) {
      const org = verState.organizer;
      setBusinessName(org.businessName || user.name || '');
      setCac(org.cacNumber || '');
      setDirector(org.directorName || '');
      setNin(org.nin || '');
      setPhone(org.contactPhone || user.phone || '');
      if (user.phoneVerified && (org.contactPhone || user.phone)) {
        setOtpVerified(true);
      }
      if (org.faceBiometricVerified && org.faceSnapshotUrl) {
        setBiometricScan({
          verified: true,
          faceSnapshotUrl: org.faceSnapshotUrl,
          biometricToken: org.biometricToken || '',
          confidence: org.biometricConfidence || 98.8,
          scannedAt: new Date().toISOString(),
        });
      }
      setHydratedOrg(true);
    }
  }, [verState?.organizer, hydratedOrg, user.name, user.phone, user.phoneVerified]);

  useEffect(() => {
    if (mine.length > 0 && !selectedEventId) {
      const unverifiedFirst = mine.find((e) => e.verificationStatus === 'Unverified') ?? mine[0];
      setSelectedEventId(unverifiedFirst.id);
    }
  }, [mine, selectedEventId]);

  const blacklistCheck = useQuery(
    api.reports.checkIdentityIsBlacklisted,
    user.email || phone || nin
      ? {
          email: user.email,
          phone: phone.trim() || undefined,
          nin: nin.trim() || undefined,
        }
      : 'skip'
  );

  const selectedEvent = mine.find((e) => e.id === selectedEventId) ?? mine[0];

  const liveRisk = calculateRiskAssessment({
    isNewOrganizer: verState?.organizer?.status !== 'verified',
    hasCacNumber: cac.trim().length > 3,
    isBvnNinVerified: nin.trim().length >= 10 && otpVerified && Boolean(biometricScan?.verified),
    isVenueConfirmed: false,
    maxTicketPrice: selectedEvent
      ? Math.max(0, ...selectedEvent.tiers.map((t) => t.price))
      : 0,
    startDate: selectedEvent?.start || new Date().toISOString(),
    hasFlyer: true,
    hasVenueAgreement: docs.some((d) => d.type === 'Venue Booking'),
    organizerTrustScore: verState?.organizer?.status === 'verified' ? 4.8 : 4.1,
  });

  const handleSendOtp = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      toast('Enter a valid phone number first.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await convex.mutation(api.auth.requestPhoneOtp, {
        userId: user._id as any,
        phone: phone.trim(),
      });
      await sendEmail({
        to: res.email,
        subject: `Organizer Contact Verification Code: ${res.code} — COORDINA`,
        html: `<p>Hi ${res.name},</p><p>Your 6-digit COORDINA Organizer KYC contact verification code for <strong>${res.phone}</strong> is:</p><h2 style="letter-spacing:4px;font-family:monospace;color:#4f46e5;">${res.code}</h2><p>Enter this code in the Organiser Studio Verification tab within 30 minutes.</p>`,
      });
      setOtpSent(true);
      toast(`6-digit OTP sent to ${res.email} for ${res.phone}.`);
    } catch (err: any) {
      toast(err?.message || 'Unable to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setVerifyingOtp(true);
    try {
      await convex.mutation(api.auth.verifyPhoneOtp, {
        userId: user._id as any,
        phone: phone.trim(),
        code: otpCode.trim(),
      });
      setOtpVerified(true);
      setOtpSent(false);
      setOtpCode('');
      toast('Organizer phone & contact OTP verified!');
    } catch (err: any) {
      toast(err?.message || 'Invalid OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDocFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Please upload a PDF or image under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocs((prev) => [
        ...prev,
        {
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: docType,
          url: String(reader.result),
          uploadedAt: new Date().toISOString(),
          verified: false,
        },
      ]);
      toast(`Attached ${file.name} (${docType}).`);
    };
    reader.readAsDataURL(file);
  };

  const isKycComplete =
    Boolean(selectedEvent) &&
    businessName.trim().length >= 2 &&
    cac.trim().length > 3 &&
    director.trim().length > 2 &&
    nin.trim().length >= 8 &&
    otpVerified &&
    Boolean(biometricScan?.verified) &&
    venueEmail.trim().includes('@') &&
    docs.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      return;
    }
    if (!selectedEvent || !biometricScan?.verified) return;
    if (blacklistCheck?.blacklisted) {
      toast(`Restricted: ${blacklistCheck.reason}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await convex.mutation(api.verification.submitEventVerification, {
        userId: user._id as any,
        eventId: selectedEvent.id as any,
        businessName: businessName.trim(),
        cacNumber: cac.trim(),
        directorName: director.trim(),
        nin: nin.trim(),
        phone: phone.trim(),
        phoneOtpVerified: otpVerified,
        biometricScan: {
          verified: biometricScan.verified,
          snapshotDataUrl: biometricScan.faceSnapshotUrl,
          token: biometricScan.biometricToken,
          confidenceScore: biometricScan.confidence,
        },
        venueEmail: venueEmail.trim(),
        venuePhone: venuePhone.trim() || undefined,
        documents: docs,
      });

      await sendVenueConfirmationRequestEmail({
        venueEmail: venueEmail.trim(),
        venueName: res.venueName,
        eventTitle: res.eventTitle,
        organizerName: res.organizerName,
        date: fmtDate(selectedEvent.start),
        token: res.token,
      });

      toast('Remote KYC & Venue Confirmation token dispatched!');
    } catch (err: any) {
      toast(err?.message || 'Failed to submit verification dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  if (verState === undefined || dash === undefined) {
    return <Skeleton className="h-72" />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-brand-500 p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Remote Event &amp; Organizer Verification
        </h2>
        <p className="muted mt-1 text-xs leading-relaxed">
          All event planners must pass basic KYC verification—including CAC registration, NIN/BVN check, live camera facial liveness scan, contact OTP, and direct venue confirmation—to earn Verified badges and unlock bank payouts.
        </p>
      </Card>

      {/* Submitted Verifications for THIS Organizer Only */}
      {verState?.verifications && verState.verifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            My Verification Submissions
          </h3>
          {verState.verifications.map((v: any) => (
            <Card key={v._id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {v.eventTitle}
                    </span>
                    <VerificationBadge status={v.eventVerificationStatus} size="sm" />
                  </div>
                  <p className="muted mt-1 text-xs">
                    Venue: <strong>{v.venueName}</strong> ({v.venueEmail}) · Venue Response:{' '}
                    <strong
                      className={
                        v.venueConfirmationStatus === 'confirmed'
                          ? 'text-emerald-600'
                          : v.venueConfirmationStatus === 'disputed'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }
                    >
                      {v.venueConfirmationStatus}
                    </strong>
                  </p>
                  {v.reviewerNotes && (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      Compliance Note: {v.reviewerNotes}
                    </p>
                  )}
                </div>
                {v.venueToken && (
                  <Link
                    to={`/venue-portal/${v.venueToken}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
                  >
                    <Icon name="open_in_new" className="text-sm" />
                    Venue Token Link
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {mine.length === 0 ? (
        <EmptyState
          icon="verified_user"
          title="Create an Event Before Requesting Verification"
          body="Publish your event schedule and venue first, then submit your KYC & venue booking confirmation dossier here."
          cta={
            <Button onClick={onCreateClick}>
              <Icon name="add_circle" /> Create Event
            </Button>
          }
        />
      ) : (
        <Card className="p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Submit Event for Remote Verification
          </h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {blacklistCheck?.blacklisted && (
              <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <div className="flex items-start gap-3">
                  <Icon name="gpp_bad" className="mt-0.5 shrink-0 text-2xl text-rose-600" />
                  <div>
                    <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Identity Restricted ({blacklistCheck.matchedField})
                    </span>
                    <p className="mt-2 text-xs font-medium">"{blacklistCheck.reason}"</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Your Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className={inputCls}
                >
                  {mine.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.venueName}, {e.city}) — {e.verificationStatus}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Registered Business / Brand Name
                </label>
                <input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Registered corporate or brand name"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  CAC Registration (RC / BN)
                </label>
                <input
                  required
                  value={cac}
                  onChange={(e) => setCac(e.target.value)}
                  placeholder="RC-0000000 or BN-0000000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Director Full Legal Name
                </label>
                <input
                  required
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="Full legal name on ID"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Director NIN / BVN
                </label>
                <input
                  required
                  value={nin}
                  onChange={(e) => setNin(e.target.value)}
                  placeholder="11-digit NIN or BVN"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Real Contact Phone + Convex 6-Digit OTP */}
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Organizer Contact Phone &amp; 6-Digit OTP Verification
                </label>
                {otpVerified ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ Contact Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={handleSendOtp}
                    className="text-xs font-semibold text-brand-500 hover:underline"
                  >
                    {sendingOtp ? 'Sending Code…' : otpSent ? 'Resend 6-Digit Code' : 'Send Verification Code'}
                  </button>
                )}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setOtpVerified(false);
                  }}
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
                {otpSent && !otpVerified && (
                  <div className="flex gap-2">
                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className={`${inputCls} font-mono`}
                    />
                    <Button
                      type="button"
                      disabled={verifyingOtp || otpCode.trim().length < 6}
                      onClick={handleVerifyOtp}
                    >
                      {verifyingOtp ? 'Checking…' : 'Verify'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Venue Representative Contact */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Venue Manager Official Email (Receives Confirmation Link)
                </label>
                <input
                  type="email"
                  required
                  value={venueEmail}
                  onChange={(e) => setVenueEmail(e.target.value)}
                  placeholder="bookings@venue-domain.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Venue Desk Phone
                </label>
                <input
                  type="tel"
                  required
                  value={venuePhone}
                  onChange={(e) => setVenuePhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Supporting KYC & Venue Receipt Upload */}
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Supporting KYC &amp; Venue Booking Evidence ({docs.length} attached)
                  </h4>
                  <p className="muted text-[11px]">
                    Attach your CAC certificate, Government ID, or signed Venue Booking Receipt (PDF/JPG/PNG under 2 MB).
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className={`${inputCls} sm:w-52`}
                >
                  <option value="Venue Booking">Venue Booking</option>
                  <option value="CAC Certificate">CAC Certificate</option>
                  <option value="Government ID">Government ID</option>
                  <option value="Event Flyer">Event Flyer</option>
                </select>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleDocFileSelect(e.target.files?.[0])}
                  className="text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-600 dark:file:bg-brand-500/15 dark:file:text-brand-300"
                />
              </div>

              {docs.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {docs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-midnight-950"
                    >
                      <span>
                        <strong>{d.type}:</strong> {d.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocs(docs.filter((x) => x.id !== d.id))}
                        className="text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Device Camera Face Biometric Scanner */}
            <FaceLivenessScanner
              directorName={director}
              nin={nin}
              onComplete={(res) => {
                setBiometricScan(res);
                toast('Live facial biometric liveness captured.');
              }}
              initialSnapshot={biometricScan?.faceSnapshotUrl}
              initialToken={biometricScan?.biometricToken}
              initialConfidence={biometricScan?.confidence}
            />

            {/* Pre-submission Automated Risk Preview */}
            <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 dark:bg-brand-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Automated Risk Engine Estimate: {liveRisk.score}/100 ({liveRisk.level} Risk)
                  </p>
                  <p className="muted mt-0.5 text-[11px]">
                    Venue confirmation &amp; compliance review determine your final trust badge.
                  </p>
                </div>
              </div>
            </div>

            <Button
              full
              size="lg"
              type="submit"
              disabled={!isKycComplete || submitting || Boolean(blacklistCheck?.blacklisted)}
            >
              {submitting
                ? 'Submitting Verification Dossier…'
                : !biometricScan?.verified
                ? 'Complete Live Camera Face Scan to Continue'
                : !otpVerified
                ? 'Verify Contact OTP to Continue'
                : docs.length === 0
                ? 'Attach At Least One Supporting Document'
                : 'Submit for Remote Verification'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function Payouts({
  user,
  onGoVerify,
}: {
  user: SessionUser;
  onGoVerify: () => void;
}) {
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const summary = useQuery(api.payouts.getFinanceSummary, { userId: user._id as any });

  const [bankCode, setBankCode] = useState(COMMON_NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [recipientCode, setRecipientCode] = useState('');
  const [resolving, setResolving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [disbursing, setDisbursing] = useState(false);
  const [bankHydrated, setBankHydrated] = useState(false);

  useEffect(() => {
    if (summary?.bankDetails && !bankHydrated) {
      setBankCode(summary.bankDetails.bankCode || COMMON_NIGERIAN_BANKS[0].code);
      setAccountNumber(summary.bankDetails.accountNumber);
      setAccountName(summary.bankDetails.accountName);
      setRecipientCode(summary.bankDetails.recipientCode || '');
      setBankHydrated(true);
    }
  }, [summary?.bankDetails, bankHydrated]);

  if (summary === undefined) {
    return <Skeleton className="h-64" />;
  }

  const available = summary?.availableBalance ?? 0;
  const grossEarned = summary?.grossEarned ?? 0;
  const totalDisbursed = summary?.totalDisbursed ?? 0;
  const selectedBank =
    COMMON_NIGERIAN_BANKS.find((b) => b.code === bankCode) ?? COMMON_NIGERIAN_BANKS[0];

  const handleResolveAndSaveBank = async () => {
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      return;
    }
    if (accountNumber.trim().length !== 10) {
      toast('Enter a valid 10-digit Nigerian NUBAN account number.');
      return;
    }
    setResolving(true);
    try {
      const resolved = await resolveAccount(accountNumber.trim(), bankCode);
      if (!resolved.success || !resolved.accountName) {
        toast(resolved.error || 'Could not resolve account name via Paystack NIBSS.');
        return;
      }

      setAccountName(resolved.accountName);
      setSavingBank(true);

      const rec = await createTransferRecipient({
        name: resolved.accountName,
        accountNumber: accountNumber.trim(),
        bankCode,
      });

      const finalRecipientCode = rec.recipientCode || recipientCode || undefined;
      if (finalRecipientCode) setRecipientCode(finalRecipientCode);

      await convex.mutation(api.payouts.saveBankAccount, {
        userId: user._id as any,
        bankName: selectedBank.name,
        bankCode,
        accountNumber: accountNumber.trim(),
        accountName: resolved.accountName,
        recipientCode: finalRecipientCode,
      });

      toast(`Verified & saved: ${resolved.accountName} (${selectedBank.name})`);
    } catch (err: any) {
      toast(err?.message || 'Unable to verify settlement bank account.');
    } finally {
      setResolving(false);
      setSavingBank(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      return;
    }
    if (summary?.organizerStatus !== 'verified') {
      toast('Your organizer KYC must be verified before withdrawing funds.');
      onGoVerify();
      return;
    }
    if (!accountName || accountNumber.length !== 10) {
      toast('Verify and save your NUBAN settlement account first.');
      return;
    }
    const amt = Math.round(Number(withdrawAmount) || 0);
    if (amt <= 0 || amt > available) {
      toast(`Enter a valid amount up to ${naira(available)}.`);
      return;
    }

    setDisbursing(true);
    try {
      let activeRecipient = recipientCode;
      if (!activeRecipient) {
        const rec = await createTransferRecipient({
          name: accountName,
          accountNumber,
          bankCode,
        });
        if (!rec.success || !rec.recipientCode) {
          toast(rec.error || 'Paystack transfer recipient setup failed.');
          setDisbursing(false);
          return;
        }
        activeRecipient = rec.recipientCode;
        setRecipientCode(activeRecipient);
      }

      const ref = `PAYOUT-${Date.now()}`;
      const trf = await initiateTransfer({
        amountNaira: amt,
        recipientCode: activeRecipient,
        reason: `COORDINA Organizer Settlement (${user.organizer?.businessName || user.name})`,
        reference: ref,
      });

      if (!trf.success) {
        toast(trf.error || 'Paystack transfer could not be initiated.');
        setDisbursing(false);
        return;
      }

      await convex.mutation(api.payouts.recordPayout, {
        userId: user._id as any,
        amount: amt,
        bankName: selectedBank.name,
        bankCode,
        accountNumber,
        accountName,
        reference: trf.transferCode || ref,
        status: trf.status === 'success' ? 'paid' : 'pending',
      });

      setWithdrawAmount('');
      toast(`Settlement of ${naira(amt)} initiated to ${accountName}!`);
    } catch (err: any) {
      toast(err?.message || 'Failed to record payout.');
    } finally {
      setDisbursing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500 p-4">
          <p className="muted text-xs">Available Balance</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {available === 0 ? '₦0' : naira(available)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            {summary?.paidOrderCount ?? 0} settled ticket order(s)
          </span>
        </Card>
        <Card className="border-l-4 border-l-brand-500 p-4">
          <p className="muted text-xs">Gross Ticket Earnings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {grossEarned === 0 ? '₦0' : naira(grossEarned)}
          </p>
          <span className="muted text-[11px]">100% of your ticket face value</span>
        </Card>
        <Card className="border-l-4 border-l-slate-400 p-4">
          <p className="muted text-xs">Total Disbursed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {totalDisbursed === 0 ? '₦0' : naira(totalDisbursed)}
          </p>
          <span className="muted text-[11px]">Settled to your bank</span>
        </Card>
      </div>

      {summary?.organizerStatus !== 'verified' && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <strong>KYC Verification Required for Withdrawals:</strong> Complete your Organizer KYC &amp; live facial liveness check to unlock Paystack NUBAN settlements.
          </div>
          <Button size="sm" onClick={onGoVerify}>
            Complete KYC
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bank Account Configuration */}
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Nigerian Settlement Bank (Paystack NIBSS)
            </h3>
            <p className="muted text-xs">
              Verify your 10-digit NUBAN account number against live NIBSS records.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Select Bank</label>
            <select
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setAccountName('');
              }}
              className={inputCls}
            >
              {COMMON_NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">10-Digit NUBAN Account Number</label>
            <input
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ''));
                setAccountName('');
              }}
              placeholder="Enter 10-digit account number"
              className={`${inputCls} font-mono`}
            />
          </div>

          {accountName && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <span className="muted block text-[10px] uppercase">Resolved Account Name</span>
              <strong className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
                {accountName}
              </strong>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            full
            disabled={resolving || savingBank || accountNumber.length !== 10}
            onClick={handleResolveAndSaveBank}
          >
            {resolving || savingBank
              ? 'Verifying with NIBSS…'
              : 'Verify & Save Settlement Account'}
          </Button>
        </Card>

        {/* Withdraw Funds */}
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Request Payout Settlement
            </h3>
            <p className="muted text-xs">
              Disburse cleared ticket revenue directly to your verified bank account.
            </p>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium">Withdrawal Amount (₦)</label>
              <input
                type="number"
                min={100}
                max={Math.max(100, available)}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={available > 0 ? `Up to ${available}` : '0'}
                className={inputCls}
              />
            </div>

            <Button
              type="submit"
              full
              disabled={
                disbursing ||
                available <= 0 ||
                !accountName ||
                summary?.organizerStatus !== 'verified'
              }
            >
              {disbursing ? 'Initiating Transfer…' : 'Disburse via Paystack'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Real Payout Ledger */}
      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          Settlement History
        </h3>
        {!summary?.payouts.length ? (
          <p className="muted text-xs">No payouts have been disbursed on your account yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.payouts.map((p: any) => (
              <div key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {naira(p.amount)} → {p.bankName} ({p.accountName})
                  </p>
                  <p className="muted font-mono text-[11px]">
                    Ref: {p.reference} · {new Date(p.createdAt).toLocaleString('en-NG')}
                  </p>
                </div>
                <Badge
                  tone={
                    p.status === 'paid' ? 'neon' : p.status === 'failed' ? 'coral' : 'amber'
                  }
                >
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RegionLockConfigurator({
  hasCoordinaPlus,
  eventCity,
  value,
  onChange,
  onUpgradeClick,
}: {
  hasCoordinaPlus: boolean;
  eventCity: string;
  value: RegionRestriction;
  onChange: (next: RegionRestriction) => void;
  onUpgradeClick: () => void;
}) {
  const { geo: organizerGeo } = useVisitorGeo(hasCoordinaPlus);
  const [customMode, setCustomMode] = useState(
    value.enabled &&
      !REGION_PRESETS.some((p) => p.restriction.label === value.label)
  );
  const [customCityInput, setCustomCityInput] = useState(
    (value.allowedCities ?? []).join(', ')
  );

  if (!hasCoordinaPlus) {
    return (
      <Card className="border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
              <Icon name="public" className="text-2xl" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audience IP Region Lock &amp; Geo-Fencing
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <Icon name="workspace_premium" className="text-[11px]" /> COORDINA Plus
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Lock ticket sales to a specific state, city, or country using live attendee IP
                verification (e.g. <strong>Abuja FCT Only</strong>, <strong>Lagos Only</strong>, or{' '}
                <strong>Nigeria Nationwide</strong>). Attendees outside your chosen region cannot
                buy tickets.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onUpgradeClick}
            className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Icon name="workspace_premium" /> Unlock with COORDINA Plus
          </Button>
        </div>
      </Card>
    );
  }

  const toggleEnabled = () => {
    if (!value.enabled) {
      const defaultCityPreset =
        eventCity.toLowerCase() === 'lagos'
          ? REGION_PRESETS.find((p) => p.id === 'lagos_state')!
          : REGION_PRESETS.find((p) => p.id === 'abuja_fct')!;
      onChange({
        enabled: true,
        ...defaultCityPreset.restriction,
      });
    } else {
      onChange({ ...value, enabled: false });
    }
  };

  const toggleCountryInCustom = (code: string) => {
    const exists = value.allowedCountries.includes(code);
    const nextCountries = exists
      ? value.allowedCountries.filter((c) => c !== code)
      : [...value.allowedCountries, code];
    if (nextCountries.length === 0) return;

    const countryLabels = nextCountries
      .map((c) => SUPPORTED_COUNTRIES.find((s) => s.code === c)?.name || c)
      .join(', ');
    const statePart =
      value.allowedStates && value.allowedStates.length > 0
        ? `${value.allowedStates.join(' & ')} (${countryLabels})`
        : countryLabels;

    onChange({
      ...value,
      enabled: true,
      mode:
        value.allowedStates && value.allowedStates.length > 0
          ? 'state'
          : nextCountries.length > 1
            ? 'multi'
            : 'country',
      allowedCountries: nextCountries,
      label: statePart,
    });
  };

  const toggleStateInCustom = (stateName: string) => {
    const current = value.allowedStates ?? [];
    const exists = current.includes(stateName);
    const nextStates = exists
      ? current.filter((s) => s !== stateName)
      : [...current, stateName];

    const countryLabels = value.allowedCountries
      .map((c) => SUPPORTED_COUNTRIES.find((s) => s.code === c)?.name || c)
      .join(', ');

    const nextLabel =
      nextStates.length > 0
        ? `${nextStates.join(', ')} (${countryLabels || 'Nigeria'})`
        : countryLabels || 'Nigeria';

    onChange({
      ...value,
      enabled: true,
      mode: nextStates.length > 0 ? 'state' : value.allowedCountries.length > 1 ? 'multi' : 'country',
      allowedStates: nextStates.length > 0 ? nextStates : undefined,
      label: nextLabel,
    });
  };

  return (
    <Card className="space-y-4 border-2 border-indigo-500/35 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Icon name="public" className="text-xl" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                IP Region Lock (Geo-Fenced Ticketing)
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                COORDINA Plus Active
              </span>
            </div>
            <p className="muted text-xs">
              Verify buyer IP address before allowing Add to Plan or Ticket Checkout.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleEnabled}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${
            value.enabled
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          <Icon name={value.enabled ? 'lock' : 'lock_open'} className="text-sm" />
          <span>{value.enabled ? 'Region Lock ON' : 'Open Globally (Off)'}</span>
        </button>
      </div>

      {value.enabled && (
        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {organizerGeo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-midnight-950 dark:text-slate-300">
              <span>
                Your current organizer IP:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {formatVisitorLocation(organizerGeo)}
                </strong>
                {organizerGeo.ip ? ` (${organizerGeo.ip})` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  const stateLabel = organizerGeo.regionName || organizerGeo.city || organizerGeo.countryName;
                  onChange({
                    enabled: true,
                    mode: organizerGeo.regionName ? 'state' : 'country',
                    label: `${stateLabel}, ${organizerGeo.countryName || organizerGeo.countryCode}`,
                    allowedCountries: [organizerGeo.countryCode],
                    allowedStates: organizerGeo.regionName
                      ? [organizerGeo.regionName, ...(organizerGeo.regionCode ? [organizerGeo.regionCode] : [])]
                      : undefined,
                  });
                }}
                className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Use My Current IP Region
              </button>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Allowed Buyer IP Region
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {REGION_PRESETS.map((preset) => {
                const active = !customMode && value.label === preset.restriction.label;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      onChange({
                        enabled: true,
                        ...preset.restriction,
                      });
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15'
                        : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.title}
                      </span>
                      {active && (
                        <Icon name="check_circle" filled className="text-sm text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="muted mt-0.5 text-[11px]">{preset.subtitle}</p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCustomMode(true);
                  if (!value.allowedCountries.length) {
                    onChange({
                      enabled: true,
                      mode: 'country',
                      label: 'Nigeria',
                      allowedCountries: ['NG'],
                    });
                  }
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  customMode
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15'
                    : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Custom Country / State Rule
                  </span>
                  {customMode && (
                    <Icon name="tune" className="text-sm text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="muted mt-0.5 text-[11px]">
                  Pick specific countries, Nigerian states, or cities
                </p>
              </button>
            </div>
          </div>

          {customMode && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-midnight-950/60">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Allowed Countries (ISO IP Match)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_COUNTRIES.map((c) => {
                    const selected = value.allowedCountries.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => toggleCountryInCustom(c.code)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          selected
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-300'
                        }`}
                      >
                        {c.name} ({c.code})
                      </button>
                    );
                  })}
                </div>
              </div>

              {value.allowedCountries.includes('NG') && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    2. Optional Nigerian State Filter (leave unselected to allow all of Nigeria)
                  </p>
                  <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {NIGERIAN_STATES.map((st) => {
                      const selected = (value.allowedStates ?? []).includes(st.name);
                      return (
                        <button
                          key={st.code}
                          type="button"
                          onClick={() => toggleStateInCustom(st.name)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                            selected
                              ? 'bg-violet-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-400 dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-300'
                          }`}
                        >
                          {st.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Optional Specific Cities (comma-separated)
                  </label>
                  <input
                    value={customCityInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCustomCityInput(raw);
                      const parsed = raw
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean);
                      onChange({
                        ...value,
                        allowedCities: parsed.length > 0 ? parsed : undefined,
                      });
                    }}
                    placeholder="e.g. Abuja, Ikeja, Accra"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Public Region Badge Label
                  </label>
                  <input
                    value={value.label}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        label: e.target.value || 'Selected Region',
                      })
                    }
                    placeholder="e.g. Lagos & Ogun Residents"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-950 dark:text-indigo-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Icon name="verified_user" className="text-sm text-indigo-600 dark:text-indigo-300" />
              <span>Active Enforcement: {value.label}</span>
            </div>
            <p className="mt-1 text-[11px] opacity-90">
              Attendees with an IP address outside <strong>{value.label}</strong> cannot add this
              event to their Plan Cart or buy tickets at Checkout (enforced on both Edge IP &amp;
              Convex backend).
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function CoordinaPlusPanel({
  user,
  onCreateClick,
  onDashboardClick,
}: {
  user: SessionUser;
  onCreateClick: () => void;
  onDashboardClick: () => void;
}) {
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const { geo, loading: geoLoading, refreshGeo } = useVisitorGeo(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [subscribing, setSubscribing] = useState(false);

  const hasPlus = isUserCoordinaPlus(user);
  const expiresAt = user.organizer?.coordinaPlusExpiresAt;
  const priceNaira = selectedPlan === 'annual' ? 144000 : 15000;

  const activateOnBackend = async (txRef: string) => {
    try {
      await convex.mutation(api.events.activateCoordinaPlus, {
        userId: user._id as any,
        plan: selectedPlan,
        transactionRef: txRef,
      });
      toast('Welcome to COORDINA Plus! IP Region Lock is now unlocked on your studio.');
    } catch (err: any) {
      toast(cleanErrorMessage(err, 'Unable to activate COORDINA Plus.'));
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user.emailVerified) {
      toast('Please verify your organizer email first.');
      setVerifyModalOpen(true);
      return;
    }

    setSubscribing(true);
    const ref = `CRD-PLUS-${selectedPlan.toUpperCase()}-${Date.now()}`;

    const payRes = await payWithPaystack({
      email: user.email,
      amountKobo: priceNaira * 100,
      reference: ref,
      metadata: {
        purpose: 'coordina_plus_subscription',
        plan: selectedPlan,
        userId: user._id,
        organizerName: user.organizer?.businessName || user.name,
      },
      onSuccess: (res) => {
        activateOnBackend(res.reference);
      },
      onCancel: () => {
        setSubscribing(false);
        toast('COORDINA Plus checkout window closed.');
      },
    });

    if (!payRes.launched) {
      setSubscribing(false);
      toast(payRes.error || 'Paystack checkout unavailable.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="relative overflow-hidden border-2 border-indigo-500/40 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200">
              <Icon name="workspace_premium" className="text-sm" /> COORDINA Plus for Organizers
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Geo-Fence Your Ticket Sales by Attendee IP Region
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100/90 sm:text-sm">
              Keep neighbourhood, campus, city, and national events exclusively in the hands of
              local attendees. Block out-of-region buyers, foreign bots, and ticket scalpers
              automatically using real-time IP geolocation.
            </p>
          </div>
          {hasPlus && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Active Membership
              </span>
              <span className="text-sm font-bold text-white">COORDINA Plus</span>
              {expiresAt && (
                <span className="mt-0.5 block text-[11px] text-emerald-200">
                  Valid thru {new Date(expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: 'public',
              title: 'State & Country IP Locks',
              desc: 'Target Abuja (FCT), Lagos, Rivers, all 36 Nigerian states, or international hubs.',
            },
            {
              icon: 'gpp_good',
              title: 'Server-Verified Checkout',
              desc: 'Enforced on Event Detail, Plan Cart, and Convex Order creation—zero bypass.',
            },
            {
              icon: 'tune',
              title: 'Live Rule Switching',
              desc: 'Toggle or update regional IP rules anytime on already-published events.',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs"
            >
              <Icon name={feat.icon} className="text-xl text-indigo-300" />
              <h4 className="mt-2 text-xs font-bold text-white">{feat.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-indigo-100/80">{feat.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Live IP Inspector Preview */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Icon name="my_location" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Live Attendee IP Telemetry Preview
            </p>
            <p className="muted text-xs">
              {geoLoading
                ? 'Resolving your current IP region…'
                : `Detected Location: ${formatVisitorLocation(geo)}${geo?.ip ? ` · IP ${geo.ip}` : ''}`}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={geoLoading} onClick={() => refreshGeo()}>
          <Icon name="refresh" className="text-sm" /> Re-detect IP
        </Button>
      </Card>

      {hasPlus ? (
        <Card className="border-l-4 border-l-emerald-500 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                COORDINA Plus is Unlocked on Your Studio
              </h3>
              <p className="muted mt-1 text-xs">
                Configure IP Region Lock when publishing a new event or click{' '}
                <strong>Region Lock</strong> next to any published event in your Dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={onCreateClick}>
                <Icon name="add_circle" /> Create Geo-Locked Event
              </Button>
              <Button variant="outline" onClick={onDashboardClick}>
                Manage Published Events
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Choose Your COORDINA Plus Plan
              </h3>
              <p className="muted text-xs">
                Instant activation via Paystack · Applies across all events in your studio.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                selectedPlan === 'monthly'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/15'
                  : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Studio Plus
                </span>
                <Badge tone="brand">Flexible</Badge>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {naira(15000)}
                <span className="muted text-xs font-normal"> / 30 days</span>
              </p>
              <p className="muted mt-1 text-xs">
                Unlimited region-locked events, Plus host badge &amp; live geo controls.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('annual')}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                selectedPlan === 'annual'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/15'
                  : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Annual Studio Plus
                </span>
                <Badge tone="neon">Save 20%</Badge>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {naira(144000)}
                <span className="muted text-xs font-normal"> / year</span>
              </p>
              <p className="muted mt-1 text-xs">
                Equivalent to {naira(12000)}/mo · Full year of IP Geo-Fencing protection.
              </p>
            </button>
          </div>

          <Button
            full
            size="lg"
            disabled={subscribing}
            onClick={handleSubscribe}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Icon name="workspace_premium" />
            {subscribing
              ? 'Opening Secure Checkout…'
              : `Subscribe to COORDINA Plus — ${naira(priceNaira)}`}
          </Button>
        </Card>
      )}
    </div>
  );
}
