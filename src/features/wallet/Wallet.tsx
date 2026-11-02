import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../../convex/_generated/api';
import { convex } from '../../lib/convex';
import { Icon } from '../../design-system/Icon';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Cover,
  EmptyState,
  SkeletonCard,
} from '../../design-system/ui';
import { useAuth, useStore, mapConvexEvent } from '../../store';
import { fmtDate, fmtTime, mapLink } from '../../lib/format';
import { toast } from '../../lib/fx';
import { googleCalLink } from '../../lib/calendar';
import type { Ticket, CEvent } from '../../types';

interface HydratedTicket extends Ticket {
  eventObj?: CEvent;
}

export default function Wallet() {
  const { user, isLoading: authLoading } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const offlineTicketsByUser = useStore((s) => s.offlineTicketsByUser);
  const setOfflineTicketsForUser = useStore((s) => s.setOfflineTicketsForUser);

  const [tab, setTab] = useState<'upcoming' | 'other'>('upcoming');
  const [view, setView] = useState<HydratedTicket | null>(null);
  const [bright, setBright] = useState(false);
  const [xfer, setXfer] = useState<HydratedTicket | null>(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const walletData = useQuery(
    api.orders.getUserTickets,
    user ? { userId: user._id as any } : 'skip'
  );

  const mapRow = (t: any): HydratedTicket => ({
    id: String(t._id),
    ticketCode: t.ticketCode,
    orderId: String(t.orderId),
    eventId: String(t.eventId),
    tierName: t.tierName,
    price: t.price,
    owner: t.wasTransferredAway
      ? t.transferredToName || 'Transferred'
      : t.attendeeName || user?.name || 'You',
    qrHash: t.qrHash,
    status: t.status,
    refundRequested: Boolean(t.refundRequested),
    wasTransferredAway: Boolean(t.wasTransferredAway),
    eventObj: t.event ? mapConvexEvent(t.event) : undefined,
  });

  const liveActive = useMemo(
    () => (walletData?.active ?? []).map(mapRow),
    [walletData?.active, user?.name]
  );
  const liveHistory = useMemo(
    () => (walletData?.history ?? []).map(mapRow),
    [walletData?.history, user?.name]
  );

  // Sync active passes to per-user offline cache whenever online query resolves
  useEffect(() => {
    if (user && walletData) {
      setOfflineTicketsForUser(user._id, liveActive);
    }
  }, [user?._id, walletData]);

  if (!authLoading && !user) {
    return (
      <div className="px-4 py-6 md:px-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
        <EmptyState
          icon="lock"
          title="Sign in to access your Ticket Wallet"
          text="Your cryptographic QR passes, transfers, and offline check-in wallet are linked strictly to your COORDINA account."
          action={
            <Link to="/auth?mode=signin&redirect=/tickets">
              <Button>Log In</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (authLoading || (online && walletData === undefined)) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-0">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cachedOffline = user
    ? ((offlineTicketsByUser[user._id] ?? []) as HydratedTicket[])
    : [];
  const activePasses = walletData ? liveActive : cachedOffline;
  const historyPasses = walletData ? liveHistory : [];
  const totalCount = activePasses.length + historyPasses.length;

  const canScanGate =
    user?.role === 'organiser' ||
    user?.role === 'venue_manager' ||
    user?.role === 'admin';

  if (totalCount === 0) {
    return (
      <div className="px-4 py-6 md:px-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
          {canScanGate && (
            <Link
              to="/scanner"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
            >
              <Icon name="qr_code_scanner" className="text-sm" /> Gate Scanner
            </Link>
          )}
        </div>
        <EmptyState
          icon="confirmation_number"
          title="No tickets in your wallet yet"
          text="Passes you purchase or receive via ticket transfer appear here automatically and cache offline for gate entry."
          action={
            <Link to="/home">
              <Button>Discover Events</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const activeList = tab === 'upcoming' ? activePasses : historyPasses;

  const handleTransfer = async () => {
    if (!user || !xfer || !to.trim()) return;
    setBusy(true);
    try {
      const res = await convex.mutation(api.orders.transferTicket, {
        ticketId: xfer.id as any,
        fromUserId: user._id as any,
        recipient: to.trim(),
      });
      setXfer(null);
      setTo('');
      toast(
        res.deliveredInApp
          ? `Ticket transferred directly to ${res.recipientName}'s wallet!`
          : `Ticket reissued (${res.newCode}) to ${res.recipientName}.`
      );
    } catch (err: any) {
      toast(err?.message || 'Unable to transfer ticket.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async (ticketId: string) => {
    if (!user) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Verify your email before requesting a refund.');
      return;
    }
    try {
      await convex.mutation(api.orders.requestRefund, {
        ticketId: ticketId as any,
        userId: user._id as any,
      });
      toast('Refund request submitted for review.');
    } catch (err: any) {
      toast(err?.message || 'Unable to submit refund request.');
    }
  };

  return (
    <div className="px-4 py-5 md:px-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
          <p className="muted text-xs">
            {activePasses.length} active pass{activePasses.length === 1 ? '' : 'es'} ·{' '}
            {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canScanGate && (
            <Link
              to="/scanner"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200 dark:hover:text-white"
            >
              <Icon name="qr_code_scanner" className="text-sm" /> Gate Scanner
            </Link>
          )}
          <Badge tone={online ? 'neon' : 'brand'}>
            {online ? 'Offline Ready' : 'Offline Mode'}
          </Badge>
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-midnight-800">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`h-8 rounded-lg px-4 text-xs font-medium transition ${
            tab === 'upcoming'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Active Passes ({activePasses.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('other')}
          className={`h-8 rounded-lg px-4 text-xs font-medium transition ${
            tab === 'other'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Used / Transferred / Refunded ({historyPasses.length})
        </button>
      </div>

      {activeList.length === 0 ? (
        <EmptyState
          icon="confirmation_number"
          title={
            tab === 'upcoming'
              ? 'No active passes'
              : 'No used, transferred, or refunded tickets'
          }
        />
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {activeList.map((t) => {
            const e = t.eventObj;
            if (!e) return null;
            const inactive =
              Boolean(t.wasTransferredAway) ||
              Boolean(t.refundRequested) ||
              t.status === 'used' ||
              t.status === 'cancelled';

            return (
              <Card key={t.id} className={`overflow-hidden ${inactive ? 'opacity-70' : ''}`}>
                <div className="relative h-36">
                  <Cover
                    gradient={e.image}
                    category={e.category}
                    className="h-full w-full"
                    label={e.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900">
                    {t.tierName}
                  </span>
                  <span className="absolute right-3 top-3 rounded-lg bg-slate-950/75 px-2.5 py-1 font-mono text-[11px] font-semibold text-white backdrop-blur-md">
                    {t.ticketCode}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="truncate text-base font-bold">{e.title}</h3>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="muted">Date</p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                        {fmtDate(e.start)}
                      </p>
                    </div>
                    <div>
                      <p className="muted">Time</p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                        {fmtTime(e.start)}
                      </p>
                    </div>
                    <div>
                      <p className="muted">Holder</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">
                        {t.owner}
                      </p>
                    </div>
                    <div>
                      <p className="muted">Location</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">
                        {e.venueName || e.area}
                      </p>
                    </div>
                  </div>

                  {inactive && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.wasTransferredAway && (
                        <Badge tone="muted">Transferred to {t.owner}</Badge>
                      )}
                      {t.status === 'used' && <Badge tone="neon">Checked In at Gate</Badge>}
                      {t.refundRequested && <Badge tone="coral">Refund Requested</Badge>}
                    </div>
                  )}

                  <div className="my-3.5 border-t border-dashed border-slate-200 dark:border-slate-700" />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" disabled={inactive} onClick={() => setView(t)}>
                        <Icon name="qr_code_2" className="text-base" /> View QR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={inactive || !online}
                        onClick={() => {
                          if (user && !user.emailVerified) {
                            setVerifyModalOpen(true);
                            toast('Email verification required to transfer tickets.');
                            return;
                          }
                          setXfer(t);
                        }}
                      >
                        Transfer
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        className="font-medium text-brand-500 hover:underline"
                        href={mapLink(e)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Map
                      </a>
                      <a
                        className="text-slate-500 hover:text-brand-500 dark:text-slate-400"
                        href={googleCalLink(e)}
                        target="_blank"
                        rel="noreferrer"
                        title="Add to Google Calendar"
                      >
                        + Cal
                      </a>
                      {!inactive && online && (
                        <button
                          type="button"
                          onClick={() => handleRefund(t.id)}
                          className="text-slate-400 hover:text-coral-500"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fullscreen High-Contrast Ticket QR Modal */}
      {view && view.eventObj && (
        <div
          className={`fixed inset-0 z-[70] flex flex-col items-center justify-center p-6 transition-colors ${
            bright ? 'bg-white text-slate-900' : 'bg-slate-950/95 text-white backdrop-blur-xl'
          }`}
        >
          <button
            type="button"
            className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full ${
              bright
                ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            onClick={() => {
              setView(null);
              setBright(false);
            }}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>

          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center text-slate-900 shadow-float">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">
              {view.tierName}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{view.eventObj.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {fmtDate(view.eventObj.start)} · {fmtTime(view.eventObj.start)} ·{' '}
              {view.eventObj.area}
            </p>

            <div className="my-5 flex justify-center rounded-2xl border border-slate-100 bg-white p-4">
              <QRCodeSVG
                value={view.qrHash || view.ticketCode || view.id}
                size={200}
              />
            </div>

            <p className="font-mono text-xs font-bold tracking-[0.2em] text-slate-700">
              {view.ticketCode}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Holder: {view.owner}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setBright(!bright)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold transition ${
                bright
                  ? 'border border-slate-200 bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              <Icon name="light_mode" className="text-base" />
              {bright ? 'Standard Screen Mode' : 'Boost Brightness'}
            </button>
            <a
              href={googleCalLink(view.eventObj)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Icon name="event" className="text-base" />
              Add to Calendar
            </a>
          </div>
        </div>
      )}

      <BottomSheet open={!!xfer} onClose={() => setXfer(null)} title="Transfer Ticket">
        <p className="muted mb-3 text-xs leading-relaxed">
          Enter your friend&apos;s COORDINA email address (or full name). Your current QR signature will be revoked immediately and a fresh pass issued to them.
        </p>
        <input
          aria-label="Recipient"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="friend@example.com"
          className="mb-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
        />
        <Button full size="lg" disabled={!to.trim() || busy} onClick={handleTransfer}>
          {busy ? 'Transferring...' : 'Confirm Transfer'}
        </Button>
      </BottomSheet>
    </div>
  );
}
