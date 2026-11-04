import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Icon } from '../../design-system/Icon';
import { Button, Card, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useAuth, usePlanItems, useStore } from '../../store';
import { computeFees, fmtDate, naira } from '../../lib/format';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendBookingConfirmationEmail } from '../../lib/email';
import { payWithPaystack, isPaystackConfigured } from '../../lib/paystack';
import { toast } from '../../lib/fx';
import { cleanErrorMessage } from '../../lib/errors';
import {
  detectVisitorGeo,
  evaluateEventRegionAccess,
  formatVisitorLocation,
  toConvexBuyerGeo,
  useVisitorGeo,
} from '../../lib/geo';

type Method = 'Card' | 'Bank transfer' | 'USSD';

export default function Checkout() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const all = useAllEvents();
  const planItems = usePlanItems();
  const { user, isLoading } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const removeFromCart = useStore((s) => s.removeFromCart);

  const [method, setMethod] = useState<Method>('Card');
  const [paying, setPaying] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const only = sp.get('only');
  const onlyTier = sp.get('tier');
  const onlyQty = Number(sp.get('qty') ?? 1);

  const rows = useMemo(() => {
    if (only) {
      const event = all.find((e) => e.id === only);
      const tier =
        event?.tiers.find((t) => t.id === onlyTier) ?? event?.tiers[0];
      return event && tier ? [{ event, tier, qty: Math.max(1, onlyQty) }] : [];
    }
    return planItems;
  }, [only, onlyTier, onlyQty, all, planItems]);

  const eventIds = useMemo(() => rows.map((r) => r.event.id as any), [rows]);
  const hasAnyRegionLockedEvent = useMemo(
    () => rows.some((r) => Boolean(r.event.regionRestriction?.enabled)),
    [rows]
  );
  const {
    geo: visitorGeo,
    loading: geoLoading,
    refreshGeo,
  } = useVisitorGeo(hasAnyRegionLockedEvent);

  const blockedRows = useMemo(() => {
    if (!hasAnyRegionLockedEvent) return [];
    return rows.filter((r) => {
      if (!r.event.regionRestriction?.enabled) return false;
      const check = evaluateEventRegionAccess(r.event.regionRestriction, visitorGeo);
      return !check.allowed;
    });
  }, [rows, hasAnyRegionLockedEvent, visitorGeo]);
  const promoCheck = useQuery(
    api.events.validatePromoCode,
    appliedCode && eventIds.length > 0
      ? { code: appliedCode, eventIds }
      : 'skip'
  );

  if (!isLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon="lock"
          title="Sign in to complete checkout"
          text="Tickets are cryptographically bound to your verified COORDINA account."
          action={
            <Button
              onClick={() =>
                nav(
                  `/auth?mode=signin&redirect=${encodeURIComponent(
                    loc.pathname + loc.search
                  )}`
                )
              }
            >
              Log In to Checkout
            </Button>
          }
        />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="shopping_bag"
        title="Nothing to check out"
        action={<Button onClick={() => nav('/home')}>Explore Events</Button>}
      />
    );
  }

  const rawSub = rows.reduce((s, r) => s + r.tier.price * r.qty, 0);
  const discountAmount =
    promoCheck?.valid && promoCheck.discountPct
      ? rows.reduce((sum, r) => {
          if (promoCheck.applicableEventIds?.includes(r.event.id)) {
            return sum + Math.round((r.tier.price * r.qty * promoCheck.discountPct!) / 100);
          }
          return sum;
        }, 0)
      : 0;

  const sub = Math.max(0, rawSub - discountAmount);
  const f = computeFees(sub, rows.length);
  const orgs = new Set(rows.map((r) => r.event.organiserId)).size;
  const isUnverified = !user || !user.emailVerified;

  const finalizeOrder = async (txRef: string) => {
    if (!user) return;
    try {
      const latestGeo = visitorGeo ?? (await detectVisitorGeo());
      const orderRes = await convex.mutation(api.orders.createOrder, {
        userId: user._id as any,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        promoCode: promoCheck?.valid ? promoCheck.code : undefined,
        buyerGeo: toConvexBuyerGeo(latestGeo),
        transactionRef: txRef,
        paymentMethod:
          method === 'Card' ? 'card' : method === 'USSD' ? 'ussd' : 'transfer',
        items: rows.map((r) => ({
          eventId: r.event.id as any,
          eventTitle: r.event.title,
          tierId: r.tier.id,
          tierName: r.tier.name,
          price: r.tier.price,
          qty: r.qty,
        })),
      });

      sendBookingConfirmationEmail({
        to: user.email,
        name: user.name,
        orderId: orderRes.orderId,
        eventTitle: rows[0]?.event.title || 'COORDINA Live Event',
        venueName: rows[0]?.event.venueName || rows[0]?.event.area || 'Venue',
        date: fmtDate(rows[0]?.event.start || new Date().toISOString()),
        tierName: rows.map((r) => `${r.tier.name} (${r.qty})`).join(', '),
        qty: rows.reduce((s, r) => s + r.qty, 0),
        total: orderRes.total,
      });

      setPaying(false);
      nav(`/success/${orderRes.orderId}`, { replace: true });
    } catch (err: any) {
      setPaying(false);
      const cleanMsg = cleanErrorMessage(
        err,
        'Unable to issue tickets. Please contact support with your reference.'
      );
      setGatewayError(cleanMsg);
      toast(cleanMsg);
    }
  };

  const pay = async () => {
    setGatewayError(null);
    if (!user) {
      nav(`/auth?mode=signin&redirect=${encodeURIComponent(loc.pathname + loc.search)}`);
      return;
    }
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Please verify your email address before purchasing tickets.');
      return;
    }

    if (hasAnyRegionLockedEvent) {
      const latestGeo = visitorGeo ?? (await refreshGeo());
      for (const r of rows) {
        if (r.event.regionRestriction?.enabled) {
          const check = evaluateEventRegionAccess(r.event.regionRestriction, latestGeo);
          if (!check.allowed) {
            const msg =
              check.reason ||
              `Ticket sales for "${r.event.title}" are restricted to ${r.event.regionRestriction.label}.`;
            setGatewayError(msg);
            toast(msg);
            return;
          }
        }
      }
    }

    setPaying(true);

    // Free RSVP (₦0 total)
    if (f.total === 0) {
      await finalizeOrder(`FREE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);
      return;
    }

    const channels =
      method === 'Card'
        ? ['card']
        : method === 'Bank transfer'
          ? ['bank_transfer', 'bank']
          : ['ussd'];

    const result = await payWithPaystack({
      email: user.email,
      amountKobo: Math.round(f.total * 100),
      reference: `CD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      channels,
      metadata: {
        userId: user._id,
        customerName: user.name,
        itemCount: rows.length,
        events: rows.map((r) => r.event.title).join(', '),
      },
      onSuccess: (res) => {
        finalizeOrder(res.reference);
      },
      onCancel: () => {
        setPaying(false);
        toast('Payment window closed. Your plan items are still saved.');
      },
    });

    if (!result.launched) {
      setPaying(false);
      setGatewayError(
        result.error || 'Unable to launch Paystack checkout. Please retry.'
      );
      toast(result.error || 'Paystack gateway unavailable.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 md:py-8">
      <button
        type="button"
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <Icon name="arrow_back" className="text-base" /> Back
      </button>

      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        Order Review &amp; Payment
      </h1>
      <p className="muted text-xs">
        Checkout as <strong className="text-slate-800 dark:text-slate-200">{user?.email}</strong> ·{' '}
        {rows.length} event{rows.length > 1 ? 's' : ''} across {orgs} organiser
        {orgs > 1 ? 's' : ''}.
      </p>

      {/* Itemized Ticket Preview */}
      <Card className="mt-5 divide-y divide-[var(--border)] p-4">
        {rows.map((r) => (
          <div
            key={r.event.id}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <Cover
              gradient={r.event.image}
              category={r.event.category}
              className="h-14 w-14 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {r.event.title}
              </p>
              <p className="muted text-xs">
                {fmtDate(r.event.start)} · {r.tier.name} × {r.qty}
              </p>
              {r.event.regionRestriction?.enabled && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Icon name="public" className="text-[11px]" />
                  IP Region: {r.event.regionRestriction.label}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {r.tier.price === 0 ? 'Free' : naira(r.tier.price * r.qty)}
            </span>
          </div>
        ))}
      </Card>

      {/* IP Region Lock Enforcement Banner */}
      {hasAnyRegionLockedEvent && blockedRows.length > 0 && !geoLoading && (
        <Card className="mt-4 border-2 border-rose-500/60 bg-gradient-to-r from-rose-500/15 via-amber-500/5 to-transparent p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 font-bold text-white shadow-sm">
                <Icon name="location_disabled" className="text-xl" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Regional IP Restriction Active
                  </h4>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                    Purchase Blocked
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Your current IP location (
                  <strong>{formatVisitorLocation(visitorGeo)}</strong>
                  {visitorGeo?.ip ? ` · ${visitorGeo.ip}` : ''}) is outside the allowed ticket
                  purchase region for:
                </p>
                <ul className="mt-2 space-y-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {blockedRows.map((br) => (
                    <li key={br.event.id} className="flex items-center gap-1.5">
                      <Icon name="public" className="text-xs" />
                      <span>
                        <strong>{br.event.title}</strong> — Restricted to{' '}
                        {br.event.regionRestriction?.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => refreshGeo()}>
                <Icon name="refresh" className="text-sm" /> Re-check IP
              </Button>
              {!only && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    for (const br of blockedRows) {
                      await removeFromCart(br.event.id);
                    }
                    toast('Removed region-restricted event(s) from your plan.');
                  }}
                >
                  Remove Restricted
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Email Verification Blocker Banner */}
      {isUnverified && (
        <Card className="mt-4 border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-bold text-white shadow-sm">
                <Icon name="lock" className="text-xl" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Email Verification Required
                  </h4>
                  <span className="rounded-full bg-coral-500/20 px-2 py-0.5 text-[10px] font-bold text-coral-700 dark:text-coral-300">
                    Checkout Restricted
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Verify <strong>{user?.email}</strong> before purchasing tickets so your QR passes are cryptographically bound to your wallet.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 text-white shadow-sm hover:bg-amber-700"
              onClick={() => setVerifyModalOpen(true)}
            >
              <Icon name="verified" /> Verify Email Now
            </Button>
          </div>
        </Card>
      )}

      {/* Promo Code Input */}
      {rawSub > 0 && (
        <Card className="mt-4 p-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Have an Organiser Promo Code?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-xs uppercase text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!promoInput.trim()}
              onClick={() => setAppliedCode(promoInput.trim().toUpperCase())}
            >
              Apply
            </Button>
          </div>
          {appliedCode && promoCheck && (
            <p
              className={`mt-2 text-xs font-medium ${
                promoCheck.valid
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {promoCheck.valid
                ? `Applied ${promoCheck.code} (${promoCheck.discountPct}% off eligible tickets — saved ${naira(discountAmount)})`
                : promoCheck.message}
            </p>
          )}
        </Card>
      )}

      {/* Payment Channel Selection */}
      {f.total > 0 && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Payment Channel
              </h2>
              <p className="muted text-xs">
                Processed securely inside Paystack&apos;s PCI-DSS checkout window
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Icon name="verified_user" className="text-sm" /> Secured by Paystack
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {(['Card', 'Bank transfer', 'USSD'] as Method[]).map((m) => {
              const active = method === m;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                    active
                      ? 'border-brand-500 bg-brand-50/70 text-brand-700 dark:bg-brand-500/15 dark:text-white'
                      : 'border-[var(--border)] text-slate-700 hover:border-slate-300 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    className="h-4 w-4 accent-[#4F46E5]"
                    checked={active}
                    onChange={() => setMethod(m)}
                  />
                  <Icon
                    name={
                      m === 'Card'
                        ? 'credit_card'
                        : m === 'Bank transfer'
                          ? 'account_balance'
                          : 'dialpad'
                    }
                    className="text-base text-brand-500"
                  />
                  <span>{m}</span>
                </label>
              );
            })}
          </div>

          <p className="muted mt-3.5 text-xs leading-relaxed">
            {method === 'Card'
              ? 'Supports Nigerian Verve, Mastercard, and Visa cards via 3D Secure.'
              : method === 'Bank transfer'
                ? 'Paystack generates a dedicated dynamic virtual NUBAN account for your exact order total.'
                : 'Paystack provides an instant USSD string for GTBank, Access, Zenith, UBA, First Bank, and Kuda.'}
          </p>

          {!isPaystackConfigured() && (
            <div className="mt-3 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>Configuration Notice:</strong> Add{' '}
              <code className="font-mono">VITE_PAYSTACK_PUBLIC_KEY</code> in Vercel Environment Variables to enable live Naira card/transfer payments.
            </div>
          )}
        </Card>
      )}

      {gatewayError && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {gatewayError}
        </div>
      )}

      {/* Fee Summary */}
      <Card className="mt-4 space-y-2.5 p-5 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Order Summary
          </h3>
          {f.total === 0 && (
            <span className="rounded-full bg-neon-50 px-2.5 py-0.5 text-[11px] font-semibold text-neon-700 dark:bg-neon-500/15 dark:text-neon-400">
              Free Admission · ₦0 Fee
            </span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="muted">Tickets Subtotal</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {rawSub === 0 ? 'Free' : naira(rawSub)}
          </span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Promo Discount ({promoCheck?.code})</span>
            <span>−{naira(discountAmount)}</span>
          </div>
        )}
        {f.total === 0 ? (
          <div className="rounded-xl border border-neon-500/20 bg-neon-50/50 p-2.5 text-slate-700 dark:bg-neon-500/10 dark:text-slate-300">
            <p className="flex items-center gap-1.5 font-medium text-neon-700 dark:text-neon-400">
              <Icon name="check_circle" className="text-sm" />
              <span>No Processing Fees for Free Events</span>
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="muted">Platform service fee (5%)</span>
              <span>{naira(f.service)}</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">Payment processing fee</span>
              <span>{naira(f.processing)}</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">VAT (7.5% on fees)</span>
              <span>{naira(f.vat)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t border-[var(--border)] pt-2.5 text-base font-bold text-slate-900 dark:text-white">
          <span>Total</span>
          <span
            className={
              f.total === 0
                ? 'text-neon-600 dark:text-neon-400'
                : 'text-slate-900 dark:text-white'
            }
          >
            {f.total === 0 ? 'Free' : naira(f.total)}
          </span>
        </div>
      </Card>

      {/* Docked Bottom Checkout Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl dark:bg-midnight-900/95">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="muted text-[11px]">Total due</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {f.total === 0 ? 'Free' : naira(f.total)}
            </p>
          </div>
          {isUnverified ? (
            <Button
              size="lg"
              className="bg-amber-600 px-6 font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700"
              onClick={pay}
            >
              <Icon name="lock" /> Verify Email to Pay
            </Button>
          ) : (
            <Button
              size="lg"
              className="px-8"
              disabled={paying || (hasAnyRegionLockedEvent && (geoLoading || blockedRows.length > 0))}
              onClick={pay}
            >
              {paying
                ? 'Processing…'
                : hasAnyRegionLockedEvent && geoLoading
                  ? 'Verifying IP Region…'
                  : blockedRows.length > 0
                    ? 'Restricted in Your Region'
                    : f.total === 0
                      ? 'Confirm Free RSVP'
                      : `Pay ${naira(f.total)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
