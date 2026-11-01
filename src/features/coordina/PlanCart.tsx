import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../../design-system/Icon';
import { Badge, BottomSheet, Button, Card, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useAuth, usePlanItems, useStore } from '../../store';
import { bestOrder, detectClashes, suggestAlternative } from '../../lib/clash';
import { computeFees, dayKey, fmtDate, fmtTime, naira } from '../../lib/format';
import type { Clash, CEvent } from '../../types';
import { toast } from '../../lib/fx';

const ICON: Record<Clash['type'], string> = {
  hard: 'schedule',
  travel: 'directions_car',
  budget: 'account_balance_wallet',
  soldout: 'bolt',
  fatigue: 'bedtime',
};
const TITLE: Record<Clash['type'], string> = {
  hard: 'Time Overlap',
  travel: 'Tight Travel Window',
  budget: 'Above Target Budget',
  soldout: 'Low Ticket Availability',
  fatigue: 'Late-Night Streak',
};

export default function PlanCart() {
  const items = usePlanItems();
  const all = useAllEvents();
  const nav = useNavigate();
  const { user } = useAuth();
  const budget = user?.budget ?? 100000;
  const setBudget = useStore((s) => s.setBudget);
  const remove = useStore((s) => s.removeFromCart);
  const setQty = useStore((s) => s.setQty);
  const swap = useStore((s) => s.swapInCart);
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const [kept, setKept] = useState<string[]>([]);
  const [sheet, setSheet] = useState<{ clash: Clash; mode: 'swap' | 'alt' } | null>(null);
  const [editBudget, setEditBudget] = useState(false);
  const [draftBudget, setDraftBudget] = useState<number | null>(null);

  const handleProceedToCheckout = () => {
    if (!user) {
      toast('Please log in to checkout your plan.');
      nav('/auth?mode=signin&redirect=/checkout');
      return;
    }
    if (!user.emailVerified) {
      toast('Please verify your email address before checkout.');
      setVerifyModalOpen(true);
      return;
    }
    nav('/checkout');
  };

  const clashes = useMemo(() => detectClashes(items, budget), [items, budget]);
  const active = clashes.filter((c) => !kept.includes(c.id));
  const ordered = bestOrder(items);
  const days = useMemo(() => {
    const m = new Map<string, typeof ordered>();
    ordered.forEach((i) => {
      const k = dayKey(i.event.start);
      m.set(k, [...(m.get(k) ?? []), i]);
    });
    return [...m.values()];
  }, [ordered]);

  const sub = items.reduce((s, i) => s + i.tier.price * i.qty, 0);
  const fees = computeFees(sub, items.length);
  const over = budget > 0 && fees.total > budget;
  const hardOpen = active.some((c) => c.type === 'hard');
  const pct = budget > 0 ? Math.min(100, Math.round((fees.total / budget) * 100)) : 0;

  if (!user) {
    return (
      <div className="px-4 py-6 md:px-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Plan</h1>
        <EmptyState
          icon="lock"
          title="Sign in to build your itinerary"
          text="Your saved events, budget limits, and smart clash detection are synced securely to your COORDINA account."
          action={
            <Link to="/auth?mode=signin&redirect=/plan">
              <Button>Log In to Continue</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-6 md:px-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Plan</h1>
        <EmptyState
          icon="event_note"
          title="Your weekend plan is empty"
          text="Browse events and tap Add to Plan. Time overlaps, travel gaps, and budget limits are checked automatically."
          action={
            <Link to="/home">
              <Button>Explore Events</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const eventOf = (id: string) => items.find((i) => i.event.id === id)?.event;
  const currentSliderBudget = draftBudget ?? budget;

  return (
    <div className="px-4 py-5 pb-36 md:px-0 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Plan</h1>
          <p className="muted text-xs">
            {items.length} event{items.length > 1 ? 's' : ''} · Synced to {user.name}
          </p>
        </div>
        <Link to="/squad">
          <Button variant="outline" size="sm">
            <Icon name="groups" className="text-base text-brand-500" /> Vote with Squad
          </Button>
        </Link>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-12">
        <div className="space-y-5 md:col-span-7">
          {/* Budget Bar Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="muted font-medium">Budget usage</span>
              <button
                type="button"
                onClick={() => {
                  setDraftBudget(budget);
                  setEditBudget(true);
                }}
                className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-brand-500 dark:text-white"
              >
                <span className={over ? 'text-coral-500' : ''}>{naira(fees.total)}</span>
                <span className="muted font-normal">/ {naira(budget)}</span>
                <Icon name="edit" className="text-sm text-slate-400" />
              </button>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  over ? 'bg-coral-500' : 'bg-brand-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </Card>

          {/* Clash Resolution Cards */}
          {active.length > 0 ? (
            <div className="space-y-3" aria-live="polite">
              <AnimatePresence>
                {active.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`rounded-2xl border p-4 ${
                      c.severity === 'warn'
                        ? 'border-coral-400/40 bg-coral-50/70 dark:border-coral-500/30 dark:bg-coral-500/10'
                        : 'border-amber-300/60 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          c.severity === 'warn'
                            ? 'bg-coral-100 text-coral-600 dark:bg-coral-500/20 dark:text-coral-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        <Icon name={ICON[c.type]} className="text-lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {TITLE[c.type]}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {c.message}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(c.type === 'hard' || c.type === 'travel') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setKept([...kept, c.id]);
                                  toast('Kept both events in your plan');
                                }}
                              >
                                Keep both
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSheet({ clash: c, mode: 'swap' })}
                              >
                                Remove one
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setSheet({ clash: c, mode: 'alt' })}
                              >
                                Suggest alternative
                              </Button>
                            </>
                          )}
                          {c.type === 'budget' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDraftBudget(budget);
                                  setEditBudget(true);
                                }}
                              >
                                Adjust budget
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setSheet({ clash: c, mode: 'swap' })}
                              >
                                Remove an event
                              </Button>
                            </>
                          )}
                          {c.type === 'soldout' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setKept([...kept, c.id])}
                            >
                              Dismiss
                            </Button>
                          )}
                          {c.type === 'fatigue' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setKept([...kept, c.id])}
                              >
                                Keep lineup
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setSheet({ clash: c, mode: 'swap' })}
                              >
                                Drop one
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-2xl border border-neon-400/30 bg-neon-50 px-4 py-3 text-xs font-medium text-neon-700 dark:bg-neon-500/10 dark:text-neon-400">
              <Icon name="check_circle" filled className="text-base" />
              <span>Schedule verified — no overlaps, tight transfers, or budget issues.</span>
            </div>
          )}

          {/* Day-by-Day Timeline */}
          <div className="space-y-6 pt-1">
            {days.map((d) => (
              <section key={dayKey(d[0].event.start)}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-500">
                  {fmtDate(d[0].event.start, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </h2>
                <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-800">
                  {d.map((i) => {
                    const hasClash = active.some(
                      (c) => c.eventIds.includes(i.event.id) && c.type !== 'soldout'
                    );
                    return (
                      <li key={i.event.id} className="relative">
                        <span
                          className={`absolute -left-[1.42rem] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--bg)] ${
                            hasClash ? 'bg-coral-500' : 'bg-brand-500'
                          }`}
                        />
                        <Card className="flex items-center gap-3.5 p-3">
                          <Link to={`/event/${i.event.id}`} className="shrink-0">
                            <Cover
                              gradient={i.event.image}
                              category={i.event.category}
                              className="h-20 w-20 rounded-xl"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p className="muted text-xs">
                              {fmtTime(i.event.start)} – {fmtTime(i.event.end)} · {i.event.area}
                            </p>
                            <Link
                              to={`/event/${i.event.id}`}
                              className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                            >
                              {i.event.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone="muted">{i.tier.name}</Badge>
                              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-1.5 py-0.5 text-xs">
                                <button
                                  type="button"
                                  className="px-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                  aria-label="Fewer tickets"
                                  onClick={() =>
                                    i.qty <= 1
                                      ? remove(i.event.id)
                                      : setQty(i.event.id, i.qty - 1)
                                  }
                                >
                                  −
                                </button>
                                <span className="font-semibold">{i.qty}</span>
                                <button
                                  type="button"
                                  className="px-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                  aria-label="More tickets"
                                  onClick={() => setQty(i.event.id, i.qty + 1)}
                                >
                                  +
                                </button>
                              </div>
                              <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-white">
                                {naira(i.tier.price * i.qty)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-slate-400 hover:bg-slate-100 hover:text-coral-500 dark:hover:bg-slate-800"
                            aria-label={`Remove ${i.event.title}`}
                            onClick={() => remove(i.event.id)}
                          >
                            <Icon name="close" className="text-base" />
                          </button>
                        </Card>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="md:col-span-5">
          <Card className="p-5 md:sticky md:top-22">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Order Summary
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              {ordered.map((i) => (
                <div key={i.event.id} className="flex justify-between gap-2">
                  <span className="muted truncate">
                    {i.event.title} × {i.qty}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {naira(i.tier.price * i.qty)}
                  </span>
                </div>
              ))}
              <hr className="my-2 border-[var(--border)]" />
              <div className="flex justify-between">
                <span className="muted">Subtotal</span>
                <span>{naira(sub)}</span>
              </div>
              {sub === 0 ? (
                <div className="rounded-xl border border-neon-500/20 bg-neon-50/50 p-2.5 text-[11px] text-neon-700 dark:bg-neon-500/10 dark:text-neon-400">
                  <span className="font-semibold">Free RSVP</span> · ₦0 attendee processing fee
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="muted">Platform service fee (5%)</span>
                    <span>{naira(fees.service)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="muted">Payment processing</span>
                    <span>{naira(fees.processing)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="muted">VAT (7.5% on fees)</span>
                    <span>{naira(fees.vat)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-[var(--border)] pt-2.5 text-base font-bold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>{naira(fees.total)}</span>
              </div>
            </div>

            {!user.emailVerified && (
              <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-semibold">Email Verification Required</p>
                <p className="mt-0.5 text-[11px]">
                  Verify your email address before completing ticket checkout.
                </p>
              </div>
            )}

            <Button
              full
              size="lg"
              className="mt-5 hidden md:inline-flex"
              onClick={handleProceedToCheckout}
            >
              {!user.emailVerified
                ? 'Verify Email to Checkout'
                : hardOpen
                  ? 'Proceed Anyway'
                  : `Checkout · ${naira(fees.total)}`}
            </Button>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur-xl dark:bg-midnight-900/95 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="muted text-[11px]">
              {items.length} event{items.length > 1 ? 's' : ''}
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {naira(fees.total)}
            </p>
          </div>
          <Button size="lg" className="px-7" onClick={handleProceedToCheckout}>
            {!user.emailVerified
              ? 'Verify Email'
              : hardOpen
                ? 'Checkout Anyway'
                : 'Checkout'}
          </Button>
        </div>
      </div>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet?.mode === 'alt' ? 'Suggested Alternative' : 'Select Event to Remove'}
      >
        {sheet && (
          <SheetBody
            sheet={sheet}
            eventOf={eventOf}
            all={all}
            items={items}
            budget={budget}
            onRemove={(id) => {
              remove(id);
              setSheet(null);
              toast('Removed from plan');
            }}
            onSwap={(oldId, newId) => {
              swap(oldId, newId);
              setSheet(null);
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={editBudget}
        onClose={() => setEditBudget(false)}
        title="Adjust Plan Budget"
      >
        <p className="text-center text-3xl font-bold text-brand-500">
          {naira(currentSliderBudget)}
        </p>
        <input
          type="range"
          min={5000}
          max={500000}
          step={5000}
          value={currentSliderBudget}
          onChange={(e) => setDraftBudget(+e.target.value)}
          className="my-5 h-2 w-full cursor-pointer accent-[#4F46E5]"
          aria-label="Budget"
        />
        <Button
          full
          size="lg"
          onClick={async () => {
            await setBudget(currentSliderBudget);
            setEditBudget(false);
            toast('Plan budget updated');
          }}
        >
          Save Budget
        </Button>
      </BottomSheet>
    </div>
  );
}

function SheetBody({
  sheet,
  eventOf,
  all,
  items,
  budget,
  onRemove,
  onSwap,
}: {
  sheet: { clash: Clash; mode: 'swap' | 'alt' };
  eventOf: (id: string) => CEvent | undefined;
  all: CEvent[];
  items: ReturnType<typeof usePlanItems>;
  budget: number;
  onRemove: (id: string) => void;
  onSwap: (o: string, n: string) => void;
}) {
  const ids = sheet.clash.eventIds.length
    ? sheet.clash.eventIds
    : items.map((i) => i.event.id);
  if (sheet.mode === 'swap') {
    return (
      <div className="space-y-2.5">
        {ids.map((id) => {
          const e = eventOf(id);
          return e ? (
            <button
              key={id}
              type="button"
              onClick={() => onRemove(id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3.5 text-left hover:border-coral-400"
            >
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-slate-900 dark:text-white">
                  {e.title}
                </strong>
                <span className="muted text-xs">
                  {fmtDate(e.start)} · {fmtTime(e.start)} · {e.area}
                </span>
              </span>
              <span className="text-xs font-semibold text-coral-500">Remove</span>
            </button>
          ) : null;
        })}
      </div>
    );
  }

  const target = eventOf(ids[ids.length - 1]);
  const alt = target && suggestAlternative(target, items, all, budget);
  if (!target || !alt) {
    return (
      <p className="muted text-sm">
        No conflict-free alternative with a matching vibe right now. Try removing one manually.
      </p>
    );
  }
  return (
    <div>
      <p className="muted mb-3 text-xs leading-relaxed">
        Replace{' '}
        <strong className="text-slate-900 dark:text-white">{target.title}</strong> with a
        conflict-free {alt.vibe.toLowerCase()} option:
      </p>
      <Card className="flex items-center gap-3.5 p-3">
        <Cover
          gradient={alt.image}
          category={alt.category}
          className="h-20 w-20 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {alt.title}
          </p>
          <p className="muted text-xs">
            {fmtDate(alt.start)} · {fmtTime(alt.start)} · {alt.area}
          </p>
          <p className="mt-1 text-xs font-semibold text-brand-500">
            {naira(Math.min(...alt.tiers.map((t) => t.price)))}
          </p>
        </div>
      </Card>
      <Button full size="lg" className="mt-4" onClick={() => onSwap(target.id, alt.id)}>
        Swap into Plan
      </Button>
    </div>
  );
}
