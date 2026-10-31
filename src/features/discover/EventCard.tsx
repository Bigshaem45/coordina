import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import type { CEvent } from '../../types';
import { getSpace, minPrice } from '../../data/mock';
import { Cover } from '../../design-system/ui';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import { fmtDate, fmtTime, naira } from '../../lib/format';
import { useStore } from '../../store';
import { flyToCart, toast } from '../../lib/fx';

export function useAddToPlan() {
  const addToCart = useStore((s) => s.addToCart);
  return (e: CEvent, from?: DOMRect, tierId?: string, qty = 1) => {
    const tier = e.tiers.find((t) => t.id === tierId) ?? e.tiers.find((t) => t.remaining > 0) ?? e.tiers[0];
    addToCart({ eventId: e.id, tierId: tier.id, qty });
    if (from) flyToCart(from, e.image);
    toast(`Added to plan: ${e.title}`);
  };
}

export function EventCard({
  event,
  compact,
  variant = 'card',
}: {
  event: CEvent;
  compact?: boolean;
  variant?: 'card' | 'row';
}) {
  const add = useAddToPlan();
  const inCart = useStore((s) => s.cart.some((c) => c.eventId === event.id));
  const ref = useRef<HTMLDivElement>(null);
  const sp = getSpace(event.spaceId);
  const low = event.tiers.some((t) => t.remaining > 0 && t.remaining <= 10);
  const p = minPrice(event);
  const d = new Date(event.start);
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();

  if (variant === 'row') {
    return (
      <div ref={ref} className="surface group flex w-full min-w-0 items-center gap-3.5 rounded-2xl p-3 shadow-card transition hover:border-brand-300">
        <Link to={`/event/${event.id}`} className="shrink-0">
          <Cover gradient={event.image} category={event.category} className="h-20 w-20 rounded-xl" label={event.title} />
        </Link>
        <Link to={`/event/${event.id}`} className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium text-brand-500">
            {fmtDate(event.start)} · {fmtTime(event.start)}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h3>
          <p className="muted mt-1 flex items-center gap-1 truncate text-xs">
            <Icon name="location_on" className="shrink-0 text-[14px] text-slate-400" />
            <span className="truncate">{sp?.name ?? event.area}, {event.area}</span>
            {sp?.verified && <Icon name="verified" filled className="shrink-0 text-[13px] text-neon-500" />}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {p === 0 ? 'Free' : naira(p)}
            </span>
            <VerificationBadge status={event.verificationStatus ?? 'Event Verified'} size="sm" />
          </div>
        </Link>
        <button
          type="button"
          onClick={() => !inCart && add(event, ref.current?.getBoundingClientRect())}
          aria-label={inCart ? `${event.title} in plan` : `Add ${event.title} to plan`}
          className={`flex h-9 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-medium transition ${
            inCart
              ? 'border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
        >
          <Icon name={inCart ? 'check' : 'add'} className="text-sm" />
          <span>{inCart ? 'Saved' : 'Plan'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`surface group flex flex-col overflow-hidden rounded-2xl shadow-card transition hover:-translate-y-0.5 hover:shadow-float ${
        compact ? 'w-72 shrink-0' : ''
      }`}
    >
      <Link to={`/event/${event.id}`} className="relative block">
        <Cover gradient={event.image} category={event.category} className="h-44" label={`${event.title} cover`} />
        <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-xs">
          {p === 0 ? 'Free' : naira(p)}
        </span>
        {low ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-coral-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs">
            <Icon name="bolt" className="text-xs" /> Few left
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {event.category}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <Link to={`/event/${event.id}`} className="flex gap-3">
          <div className="flex w-9 shrink-0 flex-col items-center pt-0.5 text-center">
            <span className="text-[10px] font-semibold tracking-wider text-brand-500">{mon}</span>
            <span className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{day}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h3>
            <p className="muted mt-0.5 text-xs">{fmtTime(event.start)}</p>
            <p className="muted mt-1 flex items-center gap-1 truncate text-xs">
              <Icon name="location_on" className="text-[14px] shrink-0 text-slate-400" />
              <span className="truncate">{sp?.name ?? event.area}, {event.area}</span>
              {sp?.verified && <Icon name="verified" filled className="text-[13px] shrink-0 text-neon-500" />}
            </p>
          </div>
        </Link>

        <div className="mt-3.5 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-1.5 truncate">
            <VerificationBadge status={event.verificationStatus ?? 'Event Verified'} size="sm" />
          </div>
          <button
            type="button"
            onClick={() => !inCart && add(event, ref.current?.getBoundingClientRect())}
            aria-label={`Add ${event.title} to plan`}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition ${
              inCart
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            <Icon name={inCart ? 'check' : 'add'} className="text-sm" />
            <span>{inCart ? 'In Plan' : 'Add to Plan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
