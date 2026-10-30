import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Icon } from '../../design-system/Icon';
import { Badge, BottomSheet, Button, Card, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useStore } from '../../store';
import { fmtDate, fmtTime, mapLink } from '../../lib/format';
import { toast } from '../../lib/fx';
import type { Ticket } from '../../types';

export default function Wallet() {
  const tickets = useStore((s) => s.tickets);
  const user = useStore((s) => s.user);
  const all = useAllEvents();
  const transfer = useStore((s) => s.transferTicket);
  const refund = useStore((s) => s.refundTicket);
  const [tab, setTab] = useState<'upcoming' | 'other'>('upcoming');
  const [view, setView] = useState<Ticket | null>(null);
  const [bright, setBright] = useState(false);
  const [xfer, setXfer] = useState<Ticket | null>(null);
  const [to, setTo] = useState('');
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (tickets.length === 0) {
    return (
      <div className="px-4 py-6 md:px-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
        <EmptyState
          icon="confirmation_number"
          title="No tickets yet"
          text="Purchased passes are stored locally for instant offline gate access."
          action={
            <Link to="/home">
              <Button>Discover Events</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const activeList = tickets.filter((t) =>
    tab === 'upcoming' ? t.owner === 'You' && !t.refundRequested : t.owner !== 'You' || t.refundRequested,
  );

  return (
    <div className="px-4 py-5 md:px-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tickets</h1>
          <p className="muted text-xs">{tickets.length} pass{tickets.length > 1 ? 'es' : ''} in wallet</p>
        </div>
        <Badge tone={online ? 'neon' : 'brand'}>{online ? 'Offline Ready' : 'Offline Mode'}</Badge>
      </div>

      {/* Evenie-inspired Segmented Tabs */}
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
          Upcoming ({tickets.filter((t) => t.owner === 'You' && !t.refundRequested).length})
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
          Transferred / Refunded
        </button>
      </div>

      {activeList.length === 0 ? (
        <EmptyState
          icon="confirmation_number"
          title={tab === 'upcoming' ? 'No active passes' : 'No transferred or refunded tickets'}
        />
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {activeList.map((t) => {
            const e = all.find((x) => x.id === t.eventId);
            if (!e) return null;
            const gone = t.owner !== 'You';
            return (
              <Card key={t.id} className={`overflow-hidden ${gone ? 'opacity-65' : ''}`}>
                <div className="relative h-36">
                  <Cover gradient={e.image} category={e.category} className="h-full w-full" label={e.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900">
                    {t.tierName}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="truncate text-base font-bold">{e.title}</h3>
                  </div>
                </div>

                {/* Perforated Ticket Body */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="muted">Date</p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{fmtDate(e.start)}</p>
                    </div>
                    <div>
                      <p className="muted">Time</p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{fmtTime(e.start)}</p>
                    </div>
                    <div>
                      <p className="muted">Attendee</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">
                        {gone ? t.owner : user?.name ?? 'You'}
                      </p>
                    </div>
                    <div>
                      <p className="muted">Location</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">{e.area}</p>
                    </div>
                  </div>

                  {(gone || t.refundRequested) && (
                    <div className="mt-3 flex gap-2">
                      {gone && <Badge tone="muted">Transferred to {t.owner}</Badge>}
                      {t.refundRequested && <Badge tone="coral">Refund requested</Badge>}
                    </div>
                  )}

                  <div className="my-3.5 border-t border-dashed border-slate-200 dark:border-slate-700" />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" disabled={gone} onClick={() => setView(t)}>
                        <Icon name="qr_code_2" className="text-base" /> View QR
                      </Button>
                      <Button size="sm" variant="outline" disabled={gone} onClick={() => setXfer(t)}>
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
                      {!gone && !t.refundRequested && (
                        <button
                          type="button"
                          onClick={() => {
                            refund(t.id);
                            toast('Refund request submitted');
                          }}
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
      {view &&
        (() => {
          const e = all.find((x) => x.id === view.eventId)!;
          return (
            <div
              className={`fixed inset-0 z-[70] flex flex-col items-center justify-center p-6 transition-colors ${
                bright ? 'bg-white text-slate-900' : 'bg-slate-950/95 text-white backdrop-blur-xl'
              }`}
            >
              <button
                type="button"
                className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full ${
                  bright ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'
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
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">{view.tierName}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{e.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fmtDate(e.start)} · {fmtTime(e.start)} · {e.area}
                </p>

                <div className="my-5 flex justify-center rounded-2xl border border-slate-100 bg-white p-4">
                  <QRCodeSVG value={`COORDINA:${view.orderId}:${view.id}`} size={200} />
                </div>

                <p className="font-mono text-xs tracking-[0.2em] text-slate-500">{view.id}</p>
              </div>

              <button
                type="button"
                onClick={() => setBright(!bright)}
                className={`mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold transition ${
                  bright
                    ? 'border border-slate-200 bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                <Icon name="light_mode" className="text-base" />
                {bright ? 'Standard Screen Mode' : 'Boost Screen Brightness'}
              </button>
            </div>
          );
        })()}

      <BottomSheet open={!!xfer} onClose={() => setXfer(null)} title="Transfer Ticket">
        <p className="muted mb-3 text-xs leading-relaxed">
          Enter your friend’s name or email. Once transferred, your QR code is deactivated and reissued to them.
        </p>
        <input
          aria-label="Recipient"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Name, phone, or email"
          className="mb-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
        />
        <Button
          full
          size="lg"
          disabled={!to.trim()}
          onClick={() => {
            transfer(xfer!.id, to.trim());
            setXfer(null);
            setTo('');
            toast('Ticket transferred');
          }}
        >
          Confirm Transfer
        </Button>
      </BottomSheet>
    </div>
  );
}
