import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../design-system/Icon';
import { Toast, Button, Cover } from '../design-system/ui';
import { Logo } from '../design-system/Logo';
import { useStore, usePlanItems } from '../store';
import { computeFees, naira } from '../lib/format';

const NAV = [
  { to: '/home', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Explore', icon: 'search', end: false },
  { to: '/map', label: 'Map', icon: 'map', end: false },
  { to: '/plan', label: 'Plan', icon: 'event_note', cart: true, end: false },
  { to: '/tickets', label: 'Tickets', icon: 'confirmation_number', end: false },
  { to: '/profile', label: 'Profile', icon: 'person', end: false },
];

const MOBILE_NAV = [
  { to: '/home', label: 'Discover', icon: 'explore', end: true },
  { to: '/map', label: 'Map', icon: 'map', end: false },
  { to: '/plan', label: 'Plan', icon: 'event_note', cart: true, end: false },
  { to: '/tickets', label: 'Tickets', icon: 'confirmation_number', end: false },
  { to: '/profile', label: 'Profile', icon: 'person', end: false },
];

export function Layout() {
  const [msg, setMsg] = useState<string | null>(null);
  const theme = useStore((s) => s.theme);
  const swapNotice = useStore((s) => s.swapNotice);
  const count = useStore((s) => s.cart.length);
  const loc = useLocation();
  const setCartOpen = useStore((s) => s.setCartOpen);
  const done = useCallback(() => setMsg(null), []);

  // Detail & checkout screens have their own docked bottom CTA bar—hide mobile tab bar to prevent overlap
  const hasOwnBottomBar =
    loc.pathname.startsWith('/event/') ||
    loc.pathname.startsWith('/space/') ||
    loc.pathname.startsWith('/checkout') ||
    (loc.pathname.startsWith('/squad/') && loc.pathname !== '/squad');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const h = (e: Event) => setMsg((e as CustomEvent).detail);
    window.addEventListener('cho-toast', h);
    return () => window.removeEventListener('cho-toast', h);
  }, []);

  useEffect(() => {
    if (swapNotice) setMsg(swapNotice);
  }, [swapNotice]);

  return (
    <div
      className={`flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--text)] ${
        hasOwnBottomBar
          ? 'pb-[calc(6rem+env(safe-area-inset-bottom,0px))]'
          : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-12'
      }`}
    >
      {/* Desktop Top Header */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-white/85 backdrop-blur-xl dark:bg-midnight-900/85 md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link to="/home" aria-label="COORDINA home" className="shrink-0">
            <Logo size={30} />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <Icon name={n.icon} className="text-[16px]" />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              to="/organiser"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Icon name="dashboard" className="text-[15px] text-brand-500" />
              Studio
            </Link>
            <button
              type="button"
              data-cart-target
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-brand-500 dark:hover:bg-brand-600"
              onClick={() => setCartOpen(true)}
              aria-label={`Open plan cart, ${count} items`}
            >
              <Icon name="shopping_bag" className="text-[15px]" />
              <span>Plan</span>
              {count > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 md:px-6">
        <Outlet />
      </main>

      {/* Mobile Tab Bar (hidden on detail/checkout screens that mount their own sticky CTA bar) */}
      {!hasOwnBottomBar && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom,0px))] w-full items-center border-t border-[var(--border)] bg-white/95 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl dark:bg-midnight-900/95 md:hidden"
          aria-label="Primary"
        >
          {MOBILE_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-cart-target={n.cart ? true : undefined}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'font-semibold text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : ''
                    }`}
                  >
                    <Icon name={n.icon} filled={isActive} className="text-[20px]" />
                    {n.cart && count > 0 && (
                      <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold leading-none text-white shadow-2xs">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="leading-none">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}

      <CartDrawer />
      <Toast message={msg} onDone={done} />
    </div>
  );
}

function CartDrawer() {
  const open = useStore((s) => s.cartOpen);
  const setOpen = useStore((s) => s.setCartOpen);
  const items = usePlanItems();
  const remove = useStore((s) => s.removeFromCart);
  const nav = useNavigate();
  const sub = items.reduce((s, i) => s + i.tier.price * i.qty, 0);
  const f = computeFees(sub, items.length);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-label="Plan cart"
            className="surface absolute right-0 top-0 flex h-full w-full max-w-sm flex-col p-5 shadow-float"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Your Plan</h2>
                <p className="muted text-xs">{items.length} event{items.length === 1 ? '' : 's'} selected</p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto">
              {items.length === 0 && (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <Icon name="event_note" className="text-2xl" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No events in your plan</p>
                  <p className="muted mt-1 text-xs">Browse events and add them to check clashes.</p>
                </div>
              )}
              {items.map((i) => (
                <div key={i.event.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-2.5">
                  <Cover gradient={i.event.image} category={i.event.category} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{i.event.title}</p>
                    <p className="muted text-xs">
                      {i.tier.name} × {i.qty} · {naira(i.tier.price * i.qty)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-coral-500 dark:hover:bg-slate-800"
                    onClick={() => remove(i.event.id)}
                    aria-label={`Remove ${i.event.title}`}
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="muted">Estimated total</span>
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{naira(f.total)}</span>
              </div>
              <Button
                full
                className="mt-3"
                disabled={!items.length}
                onClick={() => {
                  setOpen(false);
                  nav('/plan');
                }}
              >
                Open Plan & Clash Check
              </Button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
