import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Button, Card, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useStore } from '../../store';
import { computeFees, fmtDate, naira } from '../../lib/format';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

type Method = 'Card' | 'Bank transfer' | 'USSD';

export default function Checkout() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const all = useAllEvents();
  const cart = useStore((s) => s.cart);
  const saved = useStore((s) => s.savedCard);
  const complete = useStore((s) => s.completeOrder);
  const [provider, setProvider] = useState<'Paystack' | 'Flutterwave'>('Paystack');
  const [method, setMethod] = useState<Method>('Card');
  const [paying, setPaying] = useState(false);
  const [ussd, setUssd] = useState('GTBank');
  const [card, setCard] = useState({ num: saved ? '4242 4242 4242 4242' : '', exp: '08/28', cvv: '242' });

  const only = sp.get('only');
  const lines = only ? [{ eventId: only, tierId: sp.get('tier')!, qty: Number(sp.get('qty') ?? 1) }] : cart;
  const rows = lines.flatMap((l) => {
    const event = all.find((e) => e.id === l.eventId);
    const tier = event?.tiers.find((t) => t.id === l.tierId);
    return event && tier ? [{ event, tier, qty: l.qty }] : [];
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="shopping_bag"
        title="Nothing to check out"
        action={<Button onClick={() => nav('/home')}>Explore Events</Button>}
      />
    );
  }

  const sub = rows.reduce((s, r) => s + r.tier.price * r.qty, 0);
  const f = computeFees(sub, rows.length);
  const orgs = new Set(rows.map((r) => r.event.organiserId)).size;
  const cardOk =
    method !== 'Card' ||
    saved ||
    (card.num.replace(/\s/g, '').length >= 12 && card.exp.length >= 4 && card.cvv.length >= 3);

  const pay = async () => {
    setPaying(true);
    const o = complete(lines, f.total, f.fees, sub === 0 ? 'Free' : method);
    try {
      await convex.mutation(api.orders.createOrder, {
        orderId: o.id,
        items: rows.map((r) => ({
          eventId: r.event.id.startsWith('event') ? undefined : (r.event.id as any),
          tierId: r.tier.id,
          tierName: r.tier.name,
          quantity: r.qty,
          unitPrice: r.tier.price,
        })),
        subtotal: sub,
        total: f.total,
        paymentMethod: sub === 0 ? 'free' : method === 'Card' ? 'card' : 'bank_transfer',
        customerName: 'Guest Attendee',
        customerEmail: 'attendee@coordina.app',
      });
    } catch (e) {
      console.warn('Convex order sync:', e);
    }
    nav(`/success/${o.id}`, { replace: true });
  };

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100';

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 md:py-8">
      <button
        type="button"
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <Icon name="arrow_back" className="text-base" /> Back
      </button>

      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Detail Order &amp; Payment</h1>
      <p className="muted text-xs">
        Single checkout for {rows.length} event{rows.length > 1 ? 's' : ''} across {orgs} organiser{orgs > 1 ? 's' : ''}.
      </p>

      {/* Itemized Ticket Preview */}
      <Card className="mt-5 divide-y divide-[var(--border)] p-4">
        {rows.map((r) => (
          <div key={r.event.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <Cover gradient={r.event.image} category={r.event.category} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.event.title}</p>
              <p className="muted text-xs">
                {fmtDate(r.event.start)} · {r.tier.name} × {r.qty}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{naira(r.tier.price * r.qty)}</span>
          </div>
        ))}
      </Card>

      {sub > 0 && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payment Gateway</h2>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-midnight-900">
              {(['Paystack', 'Flutterwave'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  aria-pressed={provider === p}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${provider === p
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {(['Card', 'Bank transfer', 'USSD'] as Method[]).map((m) => {
              const active = method === m;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${active
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
                    name={m === 'Card' ? 'credit_card' : m === 'Bank transfer' ? 'account_balance' : 'dialpad'}
                    className="text-base text-brand-500"
                  />
                  <span>{m}</span>
                </label>
              );
            })}
          </div>

          {method === 'Card' && (
            <div className="mt-4 space-y-2.5">
              {saved ? (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-midnight-900 dark:text-slate-300">
                  Paying with saved card <strong>{saved}</strong> via {provider}.
                </p>
              ) : (
                <>
                  <input
                    aria-label="Card number"
                    inputMode="numeric"
                    placeholder="Card number (4242 •••• •••• 4242)"
                    value={card.num}
                    onChange={(e) => setCard({ ...card, num: e.target.value })}
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      aria-label="Expiry"
                      placeholder="MM/YY"
                      value={card.exp}
                      onChange={(e) => setCard({ ...card, exp: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      aria-label="CVV"
                      placeholder="CVV"
                      inputMode="numeric"
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {method === 'Bank transfer' && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-slate-50/70 p-3.5 text-xs leading-relaxed dark:bg-midnight-900">
              Transfer <strong className="text-slate-900 dark:text-white">{naira(f.total)}</strong> to{' '}
              <strong className="text-slate-900 dark:text-white">Wema Bank · 7912 345 678</strong> (COORDINA / {provider}). Valid for 30 minutes.
            </div>
          )}

          {method === 'USSD' && (
            <div className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-slate-50/70 p-3.5 text-xs dark:bg-midnight-900">
              <label htmlFor="bank" className="block font-medium text-slate-700 dark:text-slate-300">
                Select Bank
              </label>
              <select id="bank" value={ussd} onChange={(e) => setUssd(e.target.value)} className={inputCls}>
                {['GTBank', 'Access', 'Zenith', 'First Bank', 'UBA', 'Kuda'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <p className="pt-1 text-slate-600 dark:text-slate-300">
                Dial{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {ussd === 'GTBank' ? '*737*000*' : ussd === 'Access' ? '*901*000*' : '*966*000*'}
                  {Math.round(f.total)}#
                </strong>{' '}
                to complete payment.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Fee Summary */}
      <Card className="mt-4 space-y-2.5 p-5 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Order Summary</h3>
          {sub === 0 && (
            <span className="rounded-full bg-neon-50 px-2.5 py-0.5 text-[11px] font-semibold text-neon-700 dark:bg-neon-500/15 dark:text-neon-400">
              Free Admission · ₦0 Fee
            </span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="muted">Tickets Subtotal</span>
          <span className="font-medium text-slate-900 dark:text-white">{naira(sub)}</span>
        </div>
        {sub === 0 ? (
          <div className="rounded-xl border border-neon-500/20 bg-neon-50/50 p-2.5 text-slate-700 dark:bg-neon-500/10 dark:text-slate-300">
            <p className="flex items-center gap-1.5 font-medium text-neon-700 dark:text-neon-400">
              <Icon name="check_circle" className="text-sm" />
              <span>No Processing Fees for Free Events</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Free events carry ₦0 attendee service or processing charge. Organisers cover hosting and verification fees directly.
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
          <span className={sub === 0 ? 'text-neon-600 dark:text-neon-400' : 'text-slate-900 dark:text-white'}>
            {naira(f.total)}
          </span>
        </div>
      </Card>

      {/* Docked Bottom Checkout Bar (Mobile tab bar is hidden on /checkout -> zero overlap!) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl dark:bg-midnight-900/95">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="muted text-[11px]">Total due</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{naira(f.total)}</p>
          </div>
          <Button size="lg" className="px-8" disabled={paying || !cardOk} onClick={pay}>
            {paying ? 'Confirming…' : sub === 0 ? 'Confirm Free RSVP' : `Pay ${naira(f.total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
