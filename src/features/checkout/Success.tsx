import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import confetti from 'canvas-confetti';
import { api } from '../../../convex/_generated/api';
import { Icon } from '../../design-system/Icon';
import { Button, Card, Cover, EmptyState, SkeletonCard } from '../../design-system/ui';
import { useAuth, mapConvexEvent } from '../../store';
import { downloadICS, googleCalLink, whatsappItinerary } from '../../lib/calendar';
import { fmtDate, fmtTime, naira } from '../../lib/format';

export default function Success() {
  const { orderId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const order = useQuery(
    api.orders.getOrderByOrderId,
    orderId && user ? { orderId, userId: user._id as any } : 'skip'
  );

  useEffect(() => {
    if (!order) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#4F46E5', '#818CF8', '#10B981'];
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 }, colors });
  }, [order?._id]);

  if (authLoading || (user && order === undefined)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <SkeletonCard />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        icon="receipt_long"
        title="Order not found"
        text="Sign in with the account that placed this booking to view your receipt and passes."
        action={
          <Link to="/tickets">
            <Button>Go to My Tickets</Button>
          </Link>
        }
      />
    );
  }

  const evs = (order.events ?? []).map(mapConvexEvent);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/20 dark:text-brand-300">
        <Icon name="check_circle" filled className="text-4xl" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        Booking Confirmed
      </h1>
      <p className="muted mt-1 text-xs">
        Order {order.orderId} · {order.total === 0 ? 'Free RSVP' : naira(order.total)} ·{' '}
        {order.paymentMethod.toUpperCase()}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        {order.tickets.length} cryptographic pass{order.tickets.length === 1 ? '' : 'es'} issued to{' '}
        {order.customerEmail}
      </p>

      <Card className="mt-6 divide-y divide-[var(--border)] p-4 text-left">
        {evs.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <Cover
              gradient={e.image}
              category={e.category}
              className="h-12 w-12 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {e.title}
              </p>
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
        {evs.length > 0 && (
          <>
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
          </>
        )}
        <Link to="/tickets" className="block">
          <Button full size="lg" variant="outline">
            <Icon name="confirmation_number" className="text-base" /> View Ticket Wallet
          </Button>
        </Link>
      </div>
    </div>
  );
}
