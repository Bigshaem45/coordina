import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip, EmptyState, Skeleton } from '../../design-system/ui';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import { useAuth } from '../../store';
import { naira } from '../../lib/format';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendVerificationStatusEmail } from '../../lib/email';
import { cleanErrorMessage } from '../../lib/errors';

type AdminTab =
  | 'Verification Desk'
  | 'Risk Engine'
  | 'Audit Logs'
  | 'Fraud & Alerts'
  | 'Analytics';

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('Verification Desk');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [flagModalTarget, setFlagModalTarget] = useState<{
    organizerName: string;
    email: string;
    phone: string;
    nin: string;
    cacNumber: string;
    eventId?: string;
    eventTitle: string;
    reportId?: string;
  } | null>(null);
  const [blacklistReason, setBlacklistReason] = useState(
    'Confirmed compliance violation following investigation'
  );

  const isAdmin = Boolean(user && user.role === 'admin');

  const verifications = useQuery(
    api.verification.listAllVerifications,
    isAdmin ? { adminUserId: user!._id as any } : 'skip'
  );
  const auditLogs = useQuery(
    api.verification.listAuditLogs,
    isAdmin ? { adminUserId: user!._id as any } : 'skip'
  );
  const analytics = useQuery(
    api.verification.getAdminAnalytics,
    isAdmin ? { adminUserId: user!._id as any } : 'skip'
  );
  const reports = useQuery(
    api.reports.getReports,
    isAdmin ? { adminUserId: user!._id as any } : 'skip'
  );
  const blacklistedIdentities = useQuery(
    api.reports.getBlacklistedIdentities,
    isAdmin ? { adminUserId: user!._id as any } : 'skip'
  );

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-8">
        <Skeleton className="h-14" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Strict RBAC Gate: Admin Only
  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
          <Icon name="gpp_bad" className="text-3xl" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Compliance Console Restricted
        </h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          {user
            ? `Your account (${user.email}) is signed in with role "${user.role}". Only authorized COORDINA Compliance Administrators can access KYC dossiers, fraud blacklists, and audit trails.`
            : 'Please sign in with an authorized COORDINA Compliance Administrator account.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!user ? (
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          ) : null}
          <Link to="/home">
            <Button variant="outline">Return to Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allVers = verifications ?? [];
  const filteredVerifications = allVers.filter((v: any) => {
    if (filterStatus === 'all') return true;
    return v.status === filterStatus;
  });

  const handleDecision = async (verificationId: string, decision: 'approved' | 'rejected') => {
    setSubmittingReview(true);
    try {
      const res = await convex.mutation(api.verification.reviewEventVerification, {
        adminUserId: user._id as any,
        verificationId: verificationId as any,
        decision,
        reviewerNotes:
          reviewNote.trim() ||
          (decision === 'approved'
            ? 'Verified by COORDINA Compliance Desk.'
            : 'Rejected following compliance review.'),
      });

      if (res.organizerEmail) {
        await sendVerificationStatusEmail({
          to: res.organizerEmail,
          organizerName: res.organizerName,
          eventTitle: res.eventTitle,
          status: res.assignedBadge,
          reviewerNotes: reviewNote.trim() || undefined,
        });
      }

      toast(`Dossier ${decision}: ${res.assignedBadge}`);
      setSelectedRecord(null);
      setReviewNote('');
    } catch (err: any) {
      toast(err?.message || 'Failed to record compliance decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'suspend' | 'dismiss') => {
    try {
      await convex.mutation(api.reports.resolveReport, {
        adminUserId: user._id as any,
        reportId: reportId as any,
        status: action === 'suspend' ? 'action_taken' : 'dismissed',
        actionTaken: action === 'suspend' ? 'suspend_event' : 'dismissed',
      });
      toast(
        action === 'suspend'
          ? 'Event suspended and removed from active discovery.'
          : 'Report marked as dismissed.'
      );
    } catch (err: any) {
      toast(err?.message || 'Unable to update report.');
    }
  };

  const handleConfirmBlacklist = async () => {
    if (!flagModalTarget) return;
    try {
      await convex.mutation(api.reports.flagAndBlacklistOrganizer, {
        adminUserId: user._id as any,
        organizerName: flagModalTarget.organizerName,
        email: flagModalTarget.email,
        phone: flagModalTarget.phone,
        nin: flagModalTarget.nin,
        cacNumber: flagModalTarget.cacNumber || undefined,
        reason: blacklistReason.trim(),
        eventId: flagModalTarget.eventId,
        eventTitle: flagModalTarget.eventTitle,
      });

      if (flagModalTarget.reportId) {
        await convex.mutation(api.reports.resolveReport, {
          adminUserId: user._id as any,
          reportId: flagModalTarget.reportId as any,
          status: 'action_taken',
          actionTaken: 'suspend_event',
        });
      }

      toast(`Blacklisted ${flagModalTarget.organizerName} across Email, Phone & NIN.`);
      setFlagModalTarget(null);
    } catch (err: any) {
      toast(err?.message || 'Failed to blacklist identity.');
    }
  };

  const handlePardonIdentity = async (blacklistId: string) => {
    try {
      await convex.mutation(api.reports.pardonBlacklistedIdentity, {
        adminUserId: user._id as any,
        blacklistId: blacklistId as any,
        reason: 'Pardoned by Compliance Administrator',
      });
      toast('Identity pardoned.');
    } catch (err: any) {
      toast(err?.message || 'Unable to pardon record.');
    }
  };

  return (
    <div className="px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Verification &amp; Compliance Console
          </h1>
          <p className="muted mt-0.5 text-sm">
            Live Convex KYC verification desk, venue confirmation audit, community reports, and platform telemetry.
          </p>
        </div>
        <Badge tone="brand">Admin · {user.name}</Badge>
      </div>

      {/* Live KPI Strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 p-4">
          <p className="muted text-xs">Pending KYC Dossiers</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {analytics?.pendingVerificationsCount ?? 0}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            Awaiting officer decision
          </span>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 p-4">
          <p className="muted text-xs">Verified Live Events</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {analytics?.verifiedEventsCount ?? 0} / {analytics?.publishedEventsCount ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            Published on COORDINA
          </span>
        </Card>
        <Card className="border-l-4 border-l-rose-500 p-4">
          <p className="muted text-xs">Active Identity Bans</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {analytics?.activeBlacklistCount ?? 0}
          </p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400">
            Blocked across NIN / Email
          </span>
        </Card>
        <Card className="border-l-4 border-l-brand-500 p-4">
          <p className="muted text-xs">Total Platform GMV</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {(analytics?.totalGmv ?? 0) === 0 ? '₦0' : naira(analytics?.totalGmv ?? 0)}
          </p>
          <span className="text-[10px] text-brand-600 dark:text-brand-400">
            {analytics?.totalOrders ?? 0} paid orders · {analytics?.totalUsers ?? 0} users
          </span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            'Verification Desk',
            'Risk Engine',
            'Audit Logs',
            'Fraud & Alerts',
            'Analytics',
          ] as AdminTab[]
        ).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Chip>
        ))}
      </div>

      {/* 1. Verification Desk */}
      {tab === 'Verification Desk' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="muted font-medium">Filter:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  filterStatus === f.id
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {verifications === undefined ? (
            <Skeleton className="h-48" />
          ) : filteredVerifications.length === 0 ? (
            <EmptyState
              icon="verified_user"
              title="No Verification Dossiers Found"
              body="Organizer KYC and remote venue submissions will appear here in real time."
            />
          ) : (
            <div className="space-y-3">
              {filteredVerifications.map((v: any) => (
                <Card key={v._id} className="p-4 transition hover:border-brand-400">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        <Icon name="verified_user" className="text-xl" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {v.event?.title ?? 'Event'}
                          </h3>
                          <VerificationBadge
                            status={v.event?.verificationStatus ?? v.trustLevelAssigned}
                            size="sm"
                          />
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              v.riskLevel === 'Low'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : v.riskLevel === 'Medium'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            Risk: {v.riskScore ?? 0}/100 ({v.riskLevel ?? 'Low'})
                          </span>
                        </div>
                        <p className="muted mt-1 text-xs">
                          Organizer:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {v.organizer?.businessName ?? v.directorName}
                          </strong>{' '}
                          {v.organizer?.isCoordinaPlus && (
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Plus
                            </span>
                          )}{' '}
                          · Venue:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {v.venueName}
                          </strong>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                          <span>CAC: {v.cacNumber || '—'}</span>
                          <span>
                            Venue Token Status:{' '}
                            <strong
                              className={
                                v.venueConfirmation?.status === 'confirmed'
                                  ? 'text-emerald-600'
                                  : v.venueConfirmation?.status === 'disputed'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }
                            >
                              {v.venueConfirmation?.status ?? 'pending'}
                            </strong>
                          </span>
                          <span>{(v.documents ?? []).length} doc(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {v.organizer?._id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const nextEnabled = !v.organizer.isCoordinaPlus;
                              await convex.mutation(api.verification.adminSetCoordinaPlus, {
                                adminUserId: user._id as any,
                                organizerId: v.organizer._id,
                                enabled: nextEnabled,
                              });
                              toast(
                                nextEnabled
                                  ? `Granted COORDINA Plus to ${v.organizer.businessName}`
                                  : `Revoked COORDINA Plus for ${v.organizer.businessName}`
                              );
                            } catch (err: any) {
                              toast(cleanErrorMessage(err, 'Unable to update Plus status.'));
                            }
                          }}
                        >
                          <Icon name="workspace_premium" className="text-sm" />
                          {v.organizer.isCoordinaPlus ? 'Revoke Plus' : 'Grant Plus'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setSelectedRecord(v)}>
                        Inspect Dossier
                      </Button>
                    </div>
                  </div>

                  {v.reviewerNotes && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-midnight-950 dark:text-slate-300">
                      <strong>Officer Notes:</strong> {v.reviewerNotes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Risk Engine Rules */}
      {tab === 'Risk Engine' && (
        <div className="mt-4 space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Automated Rule-Based Fraud Scoring Matrix
            </h2>
            <p className="muted mt-1 text-xs leading-relaxed">
              Every KYC dossier is scored automatically in Convex before human compliance approval.
            </p>
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">
                  CAC &amp; NIN Validation (+20–25 pts)
                </p>
                <p className="muted mt-1">
                  Checks RC/BN corporate prefix, director NIN length, and verified phone OTP.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Live Camera Face Liveness (Mandatory)
                </p>
                <p className="muted mt-1">
                  Requires live device camera capture; static or fallback portraits are blocked.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Independent Venue Token (+15 pts)
                </p>
                <p className="muted mt-1">
                  Dispatches cryptographic confirmation link to the venue representative.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Live Audit Logs */}
      {tab === 'Audit Logs' && (
        <div className="mt-4">
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Immutable Platform Audit Trail ({auditLogs?.length ?? 0})
            </div>
            {!auditLogs?.length ? (
              <div className="p-6 text-center text-xs text-slate-400">No audit entries yet.</div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log._id} className="p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-white">{log.actorName}</strong>
                      <Badge tone="brand">{log.action}</Badge>
                      <span className="muted">({log.actorRole})</span>
                    </div>
                    <span className="muted font-mono">
                      {new Date(log.timestamp).toLocaleString('en-NG')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-700 dark:text-slate-300">{log.details}</p>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* 4. Fraud & Alerts (Real Convex Reports + Real Blacklist + Live Risk Alerts) */}
      {tab === 'Fraud & Alerts' && (
        <div className="mt-4 space-y-6">
          {/* Live Risk Alerts */}
          {analytics?.riskAlerts && analytics.riskAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Automated Risk Alerts ({analytics.riskAlerts.length})
              </h3>
              {analytics.riskAlerts.map((al: any) => (
                <Card key={al.id} className="border-l-4 border-l-amber-500 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{al.title}</span>
                    <Badge tone={al.severity === 'High' ? 'coral' : 'amber'}>
                      {al.severity} Risk
                    </Badge>
                  </div>
                  <p className="muted mt-1 text-xs">{al.detail}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Real Community Reports */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
              Community Fraud &amp; Trust Reports ({reports?.length ?? 0})
            </h3>
            {!reports?.length ? (
              <EmptyState
                icon="shield"
                title="Zero Open Community Reports"
                body="Reports submitted by verified attendees on event pages appear here in real time."
              />
            ) : (
              <div className="space-y-3">
                {reports.map((r: any) => (
                  <Card key={r._id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {r.eventTitle}
                          </span>
                          <Badge tone="coral">{r.reason}</Badge>
                        </div>
                        <p className="muted mt-0.5 text-xs">
                          Reported by {r.reporterName} ({r.reporterEmail || 'verified user'}) ·{' '}
                          {new Date(r.createdAt).toLocaleString('en-NG')}
                        </p>
                      </div>
                      <Badge
                        tone={
                          r.status === 'pending'
                            ? 'amber'
                            : r.status === 'action_taken'
                            ? 'coral'
                            : 'muted'
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>

                    <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-midnight-950 dark:text-slate-300">
                      "{r.details}"
                    </p>

                    {r.status === 'pending' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="coral"
                          onClick={() => handleResolveReport(r._id, 'suspend')}
                        >
                          <Icon name="block" className="text-sm" /> Suspend Event
                        </Button>
                        {r.organizer && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setFlagModalTarget({
                                organizerName: r.organizer.businessName,
                                email: r.organizer.contactEmail,
                                phone: r.organizer.contactPhone || '',
                                nin: r.organizer.nin || 'UNSUBMITTED',
                                cacNumber: r.organizer.cacNumber || '',
                                eventId: String(r.eventId),
                                eventTitle: r.eventTitle,
                                reportId: String(r._id),
                              })
                            }
                          >
                            <Icon name="person_off" className="text-sm" /> Blacklist Organizer KYC
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveReport(r._id, 'dismiss')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Blacklisted Identities */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
              Blacklisted Identities ({blacklistedIdentities?.length ?? 0})
            </h3>
            {!blacklistedIdentities?.length ? (
              <p className="muted text-xs">No organizer identities are currently blacklisted.</p>
            ) : (
              <div className="space-y-3">
                {blacklistedIdentities.map((b: any) => (
                  <Card key={b._id} className="border-l-4 border-l-rose-600 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {b.organizerName}
                        </span>
                        <p className="muted text-xs">
                          {b.email} · {b.phone} · NIN: {b.nin} · Reason: {b.reason}
                        </p>
                      </div>
                      {b.status === 'active_blacklist' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePardonIdentity(b._id)}
                        >
                          Pardon Identity
                        </Button>
                      ) : (
                        <Badge tone="muted">Pardoned</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Live Platform Analytics */}
      {tab === 'Analytics' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <p className="muted text-xs">Attendees</p>
              <p className="mt-1 text-xl font-bold">{analytics?.attendeeCount ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="muted text-xs">Organizers</p>
              <p className="mt-1 text-xl font-bold">{analytics?.organiserCount ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="muted text-xs">Venue Managers</p>
              <p className="mt-1 text-xl font-bold">{analytics?.venueManagerCount ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="muted text-xs">Platform Fees Earned</p>
              <p className="mt-1 text-xl font-bold">
                {(analytics?.totalPlatformFees ?? 0) === 0
                  ? '₦0'
                  : naira(analytics?.totalPlatformFees ?? 0)}
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              Platform Daily GMV — Last 7 Days (₦)
            </h3>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={analytics?.gmvByDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="label" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip
                    formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, 'Daily GMV']}
                  />
                  <Bar dataKey="gmv" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Dossier Review Modal */}
      {selectedRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-midnight-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                  KYC &amp; Venue Dossier
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedRecord.event?.title ?? 'Event Submission'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">Organizer KYC</p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <p>
                    Business: <strong>{selectedRecord.organizer?.businessName}</strong>
                  </p>
                  <p>
                    CAC: <strong>{selectedRecord.cacNumber}</strong>
                  </p>
                  <p>
                    Director: <strong>{selectedRecord.directorName}</strong>
                  </p>
                  <p>
                    NIN: <strong className="font-mono">{selectedRecord.nin}</strong>
                  </p>
                  <p>
                    Phone: <strong>{selectedRecord.phone}</strong>
                  </p>
                  {selectedRecord.faceSnapshotUrl && (
                    <div className="mt-2 flex items-center gap-2 pt-1">
                      <img
                        src={selectedRecord.faceSnapshotUrl}
                        alt="Director live scan"
                        className="h-12 w-12 rounded-full border-2 border-emerald-500 object-cover"
                      />
                      <div>
                        <span className="block font-bold text-emerald-600">
                          Liveness Authenticated
                        </span>
                        <span className="font-mono text-[10px]">
                          {selectedRecord.biometricToken}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">Venue Status</p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <p>
                    Venue: <strong>{selectedRecord.venueName}</strong>
                  </p>
                  <p>
                    Status:{' '}
                    <strong>{selectedRecord.venueConfirmation?.status ?? 'pending'}</strong>
                  </p>
                  <p>Venue Email: {selectedRecord.venueEmail}</p>
                  {selectedRecord.venueConfirmation?.notes && (
                    <p>Venue Notes: {selectedRecord.venueConfirmation.notes}</p>
                  )}
                </div>
              </div>
            </div>

            {selectedRecord.documents && selectedRecord.documents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Supporting Documents ({selectedRecord.documents.length})
                </h4>
                <div className="mt-2 space-y-1.5">
                  {selectedRecord.documents.map((d: any) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-midnight-800"
                    >
                      <span>
                        <strong>{d.type}:</strong> {d.name}
                      </span>
                      <Icon name="open_in_new" className="text-xs text-brand-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Compliance Decision Notes
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter audit notes for the organizer…"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-950 dark:text-slate-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                disabled={submittingReview}
                onClick={() => handleDecision(selectedRecord._id, 'rejected')}
              >
                Reject Dossier
              </Button>
              <Button
                size="sm"
                disabled={submittingReview}
                onClick={() => handleDecision(selectedRecord._id, 'approved')}
              >
                Approve Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {flagModalTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setFlagModalTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-white p-6 shadow-2xl dark:bg-midnight-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Blacklist Organizer KYC
            </h3>
            <p className="muted mt-1 text-xs">
              Blocks <strong>{flagModalTarget.organizerName}</strong> ({flagModalTarget.email}) across Email, Phone, and NIN.
            </p>
            <textarea
              rows={2}
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-midnight-800"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFlagModalTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="coral"
                className="flex-1"
                disabled={!blacklistReason.trim()}
                onClick={handleConfirmBlacklist}
              >
                Enforce Blacklist
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
