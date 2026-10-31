import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip } from '../../design-system/ui';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import { useStore } from '../../store';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendVerificationStatusEmail } from '../../lib/email';
import type { EventVerificationRecord, VerificationStatus } from '../../types';

type AdminTab = 'Verification Desk' | 'Risk Engine' | 'Audit Logs' | 'Fraud & Alerts' | 'Analytics';

export default function Admin() {
  const verifications = useStore((s) => s.verifications);
  const auditLogs = useStore((s) => s.auditLogs);
  const flags = useStore((s) => s.flags);
  const reviewVerification = useStore((s) => s.adminReviewVerification);
  const resolve = useStore((s) => s.resolveFlag);
  const blacklistedIdentities = useStore((s) => s.blacklistedIdentities);
  const addBlacklistIdentity = useStore((s) => s.addBlacklistIdentity);
  const pardonBlacklistIdentity = useStore((s) => s.pardonBlacklistIdentity);
  const [tab, setTab] = useState<AdminTab>('Verification Desk');
  const [selectedRecord, setSelectedRecord] = useState<EventVerificationRecord | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSeeding, setIsSeeding] = useState(false);

  const [communityReports, setCommunityReports] = useState([
    {
      id: 'rep-101',
      eventTitle: 'Afrobeats Rooftop Festival 2026',
      reason: 'Ticket Scalping / Extortion',
      details: 'Unauthorized secondary broker demanding ₦35,000 for regular tickets outside official Paystack checkout.',
      reporter: 'Tunde A. (tunde@example.ng)',
      time: '45 mins ago',
      status: 'pending',
    },
    {
      id: 'rep-102',
      eventTitle: 'Wuse Secret Gallery Vernissage',
      reason: 'Venue Location Mismatch',
      details: 'Venue manager on ground claims they have private maintenance scheduled and no event agreement.',
      reporter: 'Fatima M.',
      time: '2 hours ago',
      status: 'pending',
    },
  ]);

  const [flagModalTarget, setFlagModalTarget] = useState<{
    organizerName: string;
    email: string;
    phone: string;
    nin: string;
    cacNumber: string;
    eventTitle: string;
    reportId?: string;
  } | null>(null);

  const [blacklistReason, setBlacklistReason] = useState('Substantiated venue booking fraud & ticket scalping');

  const handleResolveReport = (id: string, action: 'suspend' | 'dismiss') => {
    setCommunityReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: action === 'suspend' ? 'action_taken' : 'dismissed' } : r
      )
    );
    if (action === 'suspend') {
      toast('Event suspended: Ticket sales frozen and organizer escrow locked.');
    } else {
      toast('Report dismissed after review.');
    }
  };

  const handleConfirmBlacklist = async () => {
    if (!flagModalTarget) return;

    const newRecord = {
      id: `blk-${Date.now()}`,
      organizerName: flagModalTarget.organizerName,
      email: flagModalTarget.email,
      phone: flagModalTarget.phone,
      nin: flagModalTarget.nin,
      cacNumber: flagModalTarget.cacNumber,
      reason: blacklistReason,
      eventTitle: flagModalTarget.eventTitle,
      flaggedAt: 'Just now',
      status: 'active_blacklist' as const,
    };

    addBlacklistIdentity(newRecord);

    if (flagModalTarget.reportId) {
      handleResolveReport(flagModalTarget.reportId, 'suspend');
    }

    try {
      await convex.mutation((api as any).reports?.flagAndBlacklistOrganizer, {
        organizerName: flagModalTarget.organizerName,
        email: flagModalTarget.email,
        phone: flagModalTarget.phone,
        nin: flagModalTarget.nin,
        cacNumber: flagModalTarget.cacNumber,
        reason: blacklistReason,
        eventTitle: flagModalTarget.eventTitle,
        adminName: 'Compliance Officer',
      });
    } catch {
      // Local optimistic update
    }

    toast(`Organizer ${flagModalTarget.organizerName} flagged! Email, Phone & NIN blacklisted.`);
    setFlagModalTarget(null);
  };

  const handlePardonIdentity = (id: string) => {
    pardonBlacklistIdentity(id);
    toast('Organizer identity pardoned and restrictions lifted.');
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const res = (await convex.mutation('seed:seedDatabase' as any, {})) as any;
      toast(res?.message || 'Database seeded successfully!');
    } catch (err: any) {
      console.error('Seed error:', err);
      toast(err?.message || 'Failed to seed database. Check Convex deployment URL.');
    } finally {
      setIsSeeding(false);
    }
  };

  const pendingCount = verifications.filter((v) => v.status === 'Verification Pending').length;
  const highRiskCount = verifications.filter((v) => v.riskAssessment.level === 'High').length;
  const verifiedCount = verifications.filter((v) => v.status === 'Event Verified' || v.status === 'Venue Confirmed').length;

  const filteredVerifications = verifications.filter((v) => {
    if (filterStatus === 'all') return true;
    return v.status === filterStatus;
  });

  const handleDecision = async (id: string, status: VerificationStatus) => {
    reviewVerification(id, status, reviewNote.trim() || undefined);
    if (selectedRecord) {
      sendVerificationStatusEmail({
        to: 'contact@eclipseliveafrica.com',
        organizerName: selectedRecord.organizerName,
        eventTitle: selectedRecord.eventTitle,
        status,
        reviewerNotes: reviewNote.trim() || undefined,
      });
    }
    try {
      await convex.mutation('verification:reviewEvent' as any, {
        verificationId: id.startsWith('vr-') ? undefined : (id as any),
        decision: status === 'Event Verified' || status === 'Venue Confirmed' ? 'approved' : status === 'Event Suspended' ? 'suspended' : 'rejected',
        reviewerNotes: reviewNote.trim() || undefined,
        trustLevel: status === 'Event Verified' ? 'Coordina Trusted' : 'Unverified',
      });
    } catch (e) {
      console.warn('Convex review sync:', e);
    }
    toast(`Verification updated: ${status}`);
    setSelectedRecord(null);
    setReviewNote('');
  };

  return (
    <div className="px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Verification &amp; Compliance Console</h1>
          <p className="muted mt-0.5 text-sm">
            Remote verification desk for event organizers, venue bookings, rule-based fraud scoring, and audit monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            className="flex items-center gap-1.5"
          >
            <Icon name={isSeeding ? 'hourglass_top' : 'database'} className="text-base" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Cloud DB'}</span>
          </Button>
          <Badge tone="brand">Compliance Desk · Abuja/Lagos</Badge>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 p-4">
          <p className="muted text-xs">Pending Reviews</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{pendingCount}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">Needs officer review</span>
        </Card>
        <Card className="border-l-4 border-l-rose-500 p-4">
          <p className="muted text-xs">High Risk Submissions</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{highRiskCount}</p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400">Risk score &gt; 65/100</span>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 p-4">
          <p className="muted text-xs">Verified Live Events</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{verifiedCount}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Venue &amp; CAC Confirmed</span>
        </Card>
        <Card className="border-l-4 border-l-brand-500 p-4">
          <p className="muted text-xs">Audit Logs Logged</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{auditLogs.length}</p>
          <span className="text-[10px] text-brand-600 dark:text-brand-400">Immutable trail</span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {(['Verification Desk', 'Risk Engine', 'Audit Logs', 'Fraud & Alerts', 'Analytics'] as AdminTab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Chip>
        ))}
      </div>

      {/* 1. Verification Desk */}
      {tab === 'Verification Desk' && (
        <div className="mt-4 space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="muted font-medium">Filter Status:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'Verification Pending', label: 'Pending' },
              { id: 'Event Verified', label: 'Event Verified' },
              { id: 'Venue Confirmed', label: 'Venue Confirmed' },
              { id: 'Event Suspended', label: 'Suspended' },
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

          <div className="space-y-3">
            {filteredVerifications.map((v) => (
              <Card key={v.id} className="p-4 transition hover:border-brand-400">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name="verified_user" className="text-xl" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{v.eventTitle}</h3>
                        <VerificationBadge status={v.status} size="sm" />
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            v.riskAssessment.level === 'Low'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : v.riskAssessment.level === 'Medium'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Risk: {v.riskAssessment.score}/100 ({v.riskAssessment.level})
                        </span>
                      </div>
                      <p className="muted mt-1 text-xs">
                        Organizer: <strong className="text-slate-800 dark:text-slate-200">{v.organizerName}</strong> · Venue:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">{v.venueName}</strong> ({v.area}, {v.city})
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Icon name="badge" className="text-xs text-brand-500" />
                          CAC: {v.organizerIdentity.cacNumber}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Icon name="storefront" className="text-xs text-neon-500" />
                          Venue:{' '}
                          <span
                            className={
                              v.venueConfirmation.status === 'Confirmed'
                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                : v.venueConfirmation.status === 'Declined'
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {v.venueConfirmation.status}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Icon name="description" className="text-xs text-slate-400" />
                          {v.documents.length} verified doc(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* 2. Rule-Based Risk Engine Visualizer */}
      {tab === 'Risk Engine' && (
        <div className="mt-4 space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Automated Rule-Based Fraud Scoring Matrix
            </h2>
            <p className="muted mt-1 text-xs leading-relaxed">
              COORDINA runs every submission through an automated risk evaluation engine before routing to human compliance
              officers. Submissions above 65 risk score trigger freeze holds and direct venue manager outreach.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="domain_verification" className="text-brand-500 text-lg" />
                  <span>CAC &amp; Identity Check (+30 pts)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Checks Corporate Affairs Commission database for registered enterprise status, director NIN, and phone OTP match.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="storefront" className="text-neon-500 text-lg" />
                  <span>Venue Direct Confirmation (+25 pts)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Sends an encrypted confirmation token to venue management. If unconfirmed or declined, flags immediate risk.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="payments" className="text-amber-500 text-lg" />
                  <span>High-Value Escrow Alert (+10 pts)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Events with VIP tables or ticket tiers &gt; ₦50,000 are subject to multi-day payout escrow holds until event ends.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="history_toggle_off" className="text-coral-500 text-lg" />
                  <span>Short Notice Threshold (+15 pts)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Submissions created less than 72 hours before start date are flagged for urgent identity verification.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="person_add" className="text-blue-500 text-lg" />
                  <span>First-Time Organizer (+15 pts)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Organizers with 0 prior completed events require manual document review and director proof of address.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-midnight-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Icon name="security" className="text-emerald-500 text-lg" />
                  <span>Fast-Track Threshold (Score &le; 30)</span>
                </div>
                <p className="muted mt-1.5 leading-relaxed">
                  Verified organizers booking verified venues with confirmed leases are auto-approved in sub-seconds.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Audit & Monitoring Logs */}
      {tab === 'Audit Logs' && (
        <div className="mt-4 space-y-3">
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Immutable Verification Audit Trail
            </div>
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon name="policy" className="text-sm" />
                    </span>
                    <strong className="text-slate-900 dark:text-white">{log.actor}</strong>
                    <Badge tone={log.action.includes('Approved') || log.action.includes('Verified') ? 'neon' : log.action.includes('Suspended') ? 'coral' : 'brand'}>
                      {log.action}
                    </Badge>
                  </div>
                  <span className="muted font-mono">{new Date(log.timestamp).toLocaleString('en-NG')}</span>
                </div>
                <p className="mt-2 text-slate-700 dark:text-slate-300">{log.details}</p>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* 4. Fraud & Alerts & Community Reports */}
      {tab === 'Fraud & Alerts' && (
        <div className="mt-4 space-y-5">
          {/* Community Reports Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Community Fraud Reports ({communityReports.filter(r => r.status === 'pending').length} Action Required)</h3>
                <p className="muted text-xs">Flagged by verified attendees &amp; venue managers.</p>
              </div>
              <Badge tone="coral">Zero Tolerance</Badge>
            </div>

            <div className="space-y-3">
              {communityReports.map((r) => (
                <Card
                  key={r.id}
                  className={`p-4 transition ${
                    r.status === 'action_taken'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : r.status === 'dismissed'
                      ? 'opacity-60'
                      : 'border-l-4 border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{r.eventTitle}</span>
                        <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          {r.reason}
                        </span>
                      </div>
                      <p className="muted text-xs mt-0.5">Reported by {r.reporter} · {r.time}</p>
                    </div>

                    <Badge tone={r.status === 'pending' ? 'coral' : r.status === 'action_taken' ? 'coral' : 'muted'}>
                      {r.status === 'pending' ? 'Pending Review' : r.status === 'action_taken' ? 'Event Suspended' : 'Dismissed'}
                    </Badge>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-midnight-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    "{r.details}"
                  </p>

                  {r.status === 'pending' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="coral"
                        onClick={() => handleResolveReport(r.id, 'suspend')}
                      >
                        <Icon name="block" className="text-sm" /> Suspend Event &amp; Freeze Escrow
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        onClick={() => {
                          setFlagModalTarget({
                            organizerName: r.id === 'rep-101' ? 'Eclipse Live Africa' : 'Wuse Arts Promoters Ltd',
                            email: r.id === 'rep-101' ? 'contact@eclipseliveafrica.com' : 'contact@wuseartsgallery.ng',
                            phone: r.id === 'rep-101' ? '+234 803 555 1234' : '+234 809 111 2233',
                            nin: r.id === 'rep-101' ? 'NIN-8910248192' : 'NIN-5910294821',
                            cacNumber: r.id === 'rep-101' ? 'RC-1849204' : 'RC-3910482',
                            eventTitle: r.eventTitle,
                            reportId: r.id,
                          });
                        }}
                      >
                        <Icon name="person_off" className="text-sm" /> Flag Organizer KYC (Email, Phone &amp; NIN)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveReport(r.id, 'dismiss')}
                      >
                        Dismiss as False Alarm
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Platform Blacklisted Identities Registry */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Blacklisted Organizers &amp; Identities ({blacklistedIdentities.filter(b => b.status === 'active_blacklist').length} Active Bans)
                </h3>
                <p className="muted text-xs">Blocked across platform by Email, Phone Number, and NIN.</p>
              </div>
              <Badge tone="coral">NIN Blocked</Badge>
            </div>

            <div className="space-y-3">
              {blacklistedIdentities.map((b) => (
                <Card
                  key={b.id}
                  className={`p-4 border-l-4 ${
                    b.status === 'active_blacklist'
                      ? 'border-l-rose-600 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-l-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{b.organizerName}</span>
                        <Badge tone={b.status === 'active_blacklist' ? 'coral' : 'muted'}>
                          {b.status === 'active_blacklist' ? 'Identity Blacklisted' : 'Pardoned'}
                        </Badge>
                      </div>
                      <p className="muted text-xs mt-0.5">
                        Flagged for: <strong>{b.reason}</strong> · {b.flaggedAt}
                      </p>
                    </div>

                    {b.status === 'active_blacklist' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePardonIdentity(b.id)}
                      >
                        Pardon Identity
                      </Button>
                    )}
                  </div>

                  {/* KYC Fingerprint Tokens */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                      <span className="muted text-[10px] block font-semibold uppercase tracking-wider">Flagged Email</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{b.email}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                      <span className="muted text-[10px] block font-semibold uppercase tracking-wider">Flagged Phone</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{b.phone}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-midnight-900">
                      <span className="muted text-[10px] block font-semibold uppercase tracking-wider">Flagged NIN</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{b.nin}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Automated System Risk Flags */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">System Automated Flags</h3>
            <div className="space-y-3">
              {flags.map((f) => (
                <Card key={f.id} className={`p-4 transition-opacity ${f.resolved ? 'opacity-55' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon name="warning" className={f.level === 'high' ? 'text-coral-500' : 'text-amber-500'} />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{f.target}</span>
                    </div>
                    <Badge tone={f.level === 'high' ? 'coral' : 'brand'}>
                      {f.resolved ? 'resolved' : `${f.level} risk`}
                    </Badge>
                  </div>
                  <p className="muted mt-1.5 text-sm">{f.reason}</p>
                  {!f.resolved && (
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={() => resolve(f.id)}>
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Analytics */}
      {tab === 'Analytics' && (
        <div className="mt-4 space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              Platform Weekly GMV (₦ Millions)
            </h3>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart
                  data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
                    d,
                    gmv: [4, 5, 6, 8, 14, 21, 12][i],
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="d" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="gmv" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Dossier Review Inspector Modal */}
      {selectedRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-midnight-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                  Verification Dossier #{selectedRecord.id}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRecord.eventTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Risk Assessment Score Card */}
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                selectedRecord.riskAssessment.level === 'Low'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : selectedRecord.riskAssessment.level === 'Medium'
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-rose-500/30 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Risk Engine Score: {selectedRecord.riskAssessment.score}/100 ({selectedRecord.riskAssessment.level} Risk)
                  </p>
                  <p className="muted text-xs mt-0.5">Automated fraud flags and document cross-reference</p>
                </div>
                <VerificationBadge status={selectedRecord.status} size="md" />
              </div>

              <ul className="mt-3 space-y-1 text-xs">
                {selectedRecord.riskAssessment.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                    <Icon name="info" className="text-sm shrink-0 text-slate-400 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Organizer & Venue Details */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-midnight-950">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon name="business" className="text-brand-500" />
                  Organizer Credentials
                </p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <p>Organization: <strong>{selectedRecord.organizerName}</strong></p>
                  <p>CAC Number: <strong>{selectedRecord.organizerIdentity.cacNumber}</strong></p>
                  <p>Director: <strong>{selectedRecord.organizerIdentity.directorName}</strong></p>
                  <p>Identity Verification: <strong className="text-emerald-600 dark:text-emerald-400">NIN/BVN Validated</strong></p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-midnight-950">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon name="storefront" className="text-neon-500" />
                  Venue Independent Status
                </p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <p>Venue: <strong>{selectedRecord.venueName}</strong></p>
                  <p>Confirmation: <strong className="text-brand-600 dark:text-brand-400">{selectedRecord.venueConfirmation.status}</strong></p>
                  <p>Contact: {selectedRecord.venueConfirmation.contactEmail}</p>
                  <p className="truncate">Token: <span className="font-mono text-[10px]">{selectedRecord.venueConfirmation.token}</span></p>
                </div>
              </div>
            </div>

            {/* Attached Documents */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Uploaded Verification Evidence ({selectedRecord.documents.length})</h4>
              <div className="mt-2 space-y-2">
                {selectedRecord.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Icon name="description" className="text-brand-500" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{d.name}</p>
                        <p className="muted text-[10px]">{d.type} · Uploaded {new Date(d.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Icon name="open_in_new" className="text-xs" /> View Document
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviewer Note Input */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Officer Decision Notes</label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter audit notes explaining approval, rejection, or required clarification..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-950 dark:text-slate-100"
              />
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecision(selectedRecord.id, 'Verification Rejected')}
              >
                Reject Submission
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 hover:bg-amber-50"
                onClick={() => handleDecision(selectedRecord.id, 'Event Suspended')}
              >
                Suspend Event
              </Button>
              <Button
                size="sm"
                onClick={() => handleDecision(selectedRecord.id, 'Event Verified')}
              >
                Approve (Event Verified)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Organizer KYC Flagging & Blacklist Modal */}
      {flagModalTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setFlagModalTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-white p-6 shadow-2xl dark:border-rose-500/30 dark:bg-midnight-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                  <Icon name="person_off" className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Flag &amp; Blacklist Organizer KYC</h3>
                  <p className="muted text-xs">Permanent platform restriction by Email, Phone &amp; NIN.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFlagModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-midnight-800">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Organizer KYC Identity Dossier</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="muted text-[10px]">Company / Name</span>
                    <p className="font-bold text-slate-900 dark:text-white">{flagModalTarget.organizerName}</p>
                  </div>
                  <div>
                    <span className="muted text-[10px]">CAC Registration</span>
                    <p className="font-mono text-slate-900 dark:text-white">{flagModalTarget.cacNumber}</p>
                  </div>
                  <div>
                    <span className="muted text-[10px]">Flagged Email</span>
                    <p className="font-mono text-slate-900 dark:text-white">{flagModalTarget.email}</p>
                  </div>
                  <div>
                    <span className="muted text-[10px]">Flagged Phone</span>
                    <p className="font-mono text-slate-900 dark:text-white">{flagModalTarget.phone}</p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">National Identification Number (NIN)</span>
                    <p className="font-mono font-extrabold text-sm text-rose-600 dark:text-rose-400">{flagModalTarget.nin}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Blacklist Reason &amp; Compliance Notes
                </label>
                <textarea
                  aria-label="Blacklist reason"
                  rows={2}
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
                />
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Icon name="warning" className="text-sm" />
                  <span>Enforcement Impact:</span>
                </p>
                <p className="mt-0.5 leading-relaxed">
                  The organizer's current event will be suspended, pending payouts held, and any future attempts to register or publish with this <strong>Email</strong>, <strong>Phone</strong>, or <strong>NIN</strong> will be blocked automatically.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFlagModalTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="coral"
                className="flex-1"
                disabled={!blacklistReason.trim()}
                onClick={handleConfirmBlacklist}
              >
                <Icon name="gpp_bad" className="text-sm" /> Enforce Identity Blacklist
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
