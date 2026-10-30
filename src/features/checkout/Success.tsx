import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Icon } from '../../design-system/Icon';
import { Button, Card, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useStore } from '../../store';
import { downloadICS, googleCalLink, whatsappItinerary } from '../../lib/calendar';
import { fmtDate, fmtTime, naira } from '../../lib/format';

export default function Success() {
  const { orderId } = useParams();
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const tickets = useStore((s) => s.tickets);
  const all = useAllEvents();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#4F46E5', '#818CF8', '#10B981'];
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 }, colors });
  }, []);

  if (!order) {
    return (
      <EmptyState
        icon="receipt_long"
        title="Order not found"
        action={
          <Link to="/home">
            <Button>Back to Home</Button>
          </Link>
        }
      />
    );
  }

  const ids = [...new Set(tickets.filter((t) => order.ticketIds.includes(t.id)).map((t) => t.eventId))];
  const evs = ids.flatMap((id) => all.find((e) => e.id === id) ?? []);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/20 dark:text-brand-300">
        <Icon name="check_circle" filled className="text-4xl" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Payment Successful</h1>
      <p className="muted mt-1 text-xs">
        Order {order.id} · {naira(order.total)} · {order.method}
      </p>

      <Card className="mt-6 divide-y divide-[var(--border)] p-4 text-left">
        {evs.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <Cover gradient={e.image} category={e.category} className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{e.title}</p>
              <p className="muted">
                {fmtDate(e.start)} · {fmtTime(e.start)} · {e.area}
              </p>
            </div>
            <a
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              href={googleCalLink(e)}
              target="_blank"
              rel="noreferrer"
            >
              + Google Cal
            </a>
          </div>
        ))}
      </Card>

      <div className="mt-6 space-y-2.5">
        <Button full size="lg" onClick={() => downloadICS(evs)}>
          <Icon name="calendar_month" className="text-base" /> Add All to Calendar (.ics)
        </Button>
        <a
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#10B981] text-sm font-medium text-white transition hover:bg-[#059669]"
          href={whatsappItinerary(evs)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="chat" className="text-base" /> Share Itinerary on WhatsApp
        </a>
        <Link to="/tickets" className="block">
          <Button full size="lg" variant="outline">
            <Icon name="confirmation_number" className="text-base" /> View Ticket Wallet
          </Button>
        </Link>
      </div>
    </div>
  );
}
