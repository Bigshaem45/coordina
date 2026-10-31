import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../../design-system/Icon';
import { Logo } from '../../design-system/Logo';
import { Badge, BottomSheet, Button, Card } from '../../design-system/ui';
import { CATEGORIES, CATEGORY_ICON, events, getSpace, minPrice } from '../../data/mock';
import { fmtDate, fmtTime, naira } from '../../lib/format';
import { useStore } from '../../store';
import { toast } from '../../lib/fx';

const FEATURES = [
  { icon: 'explore', t: 'Curated Discovery', d: 'Concerts, rooftop dining, art walks, tech mixers, and community runs across Lagos and Abuja.' },
  { icon: 'verified', t: 'Verified Venues', d: 'Transparent venue hours, real reviews, crowd levels, and on-site safety notes before you go.' },
  { icon: 'event_note', t: 'Conflict-Free Itinerary', d: 'Add multiple events to one weekend plan. Catch time overlaps, traffic gaps, and budget limits automatically.' },
  { icon: 'confirmation_number', t: 'Single Checkout', d: 'Check out across multiple organisers in one payment via Card, Transfer, or USSD. Tickets work offline.' },
  { icon: 'groups', t: 'Squad Voting', d: 'Share a shortlist with friends, vote on where to go, and see the per-person split clearly.' },
  { icon: 'calendar_month', t: 'Instant Calendar Sync', d: 'Export your confirmed lineup to Apple, Google, or Outlook Calendar and share via WhatsApp.' },
];

export default function Landing() {
  const user = useStore((s) => s.user);
  const onboarded = useStore((s) => s.onboarded);
  const signOut = useStore((s) => s.signOut);
  const socialSignIn = useStore((s) => s.socialSignIn);
  const finishOnboarding = useStore((s) => s.finishOnboarding);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const city = useStore((s) => s.city);
  const setCity = useStore((s) => s.setCity);
  const nav = useNavigate();
  const [apkModal, setApkModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const enterDemo = () => {
    socialSignIn('Demo');
    finishOnboarding({ city: city || 'Lagos', interests: ['Concerts', 'Food', 'Nightlife'], budget: 80000, vibe: 'Energetic' });
    setMobileMenuOpen(false);
    nav('/home');
  };

  const downloadApk = () => {
    const link = document.createElement('a');
    link.href = '/downloads/coordina-v1.0.0.apk';
    link.download = 'coordina-v1.0.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Downloading COORDINA Android APK (v1.0.0)...');
  };

  const copyHash = () => {
    navigator.clipboard?.writeText('7f8a9e2d5c3b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f');
    toast('SHA-256 Checksum copied to clipboard');
  };

  const featured = events.slice(0, 6);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--bg)] pb-20 text-[var(--text)] md:pb-0">
      {/* Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl dark:bg-midnight-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={30} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <a href="#featured" className="hover:text-slate-900 dark:hover:text-white">Featured</a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white">Features</a>
            <Link to="/home" className="hover:text-slate-900 dark:hover:text-white">Web App</Link>
            <Link to="/team" className="hover:text-slate-900 dark:hover:text-white">Team</Link>
            <a href="#download" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              <Icon name="android" className="text-base" /> Download APK
            </a>
          </div>

          {/* Desktop Account & Action Buttons */}
          <div className="hidden items-center gap-2.5 md:flex" aria-label="Account">
            {user ? (
              <>
                <Link to={onboarded ? '/home' : '/onboarding'}>
                  <Button size="sm">Go to App</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Controls: Explore CTA + Hamburger Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/home">
              <Button size="sm" className="h-9 px-3.5 text-xs">
                Explore
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[20px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-out Menu Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="surface absolute right-0 top-0 flex h-full w-[86vw] max-w-sm flex-col overflow-y-auto border-l border-[var(--border)] p-5 shadow-2xl"
              aria-label="Mobile Navigation"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <Logo size={26} />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  aria-label="Close menu"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>

              {/* City Switcher in Drawer */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-midnight-800">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Icon name="location_on" className="text-sm text-brand-500" />
                  City: <strong className="text-slate-900 dark:text-white">{city}</strong>
                </span>
                <div className="flex items-center gap-1">
                  {(['Lagos', 'Abuja'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        city === c
                          ? 'bg-brand-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Links List */}
              <nav className="mt-5 space-y-1" aria-label="Mobile primary navigation">
                {[
                  { to: '/home', icon: 'explore', label: 'Explore Events', desc: 'Concerts, nightlife, food & art' },
                  { to: '/discover', icon: 'local_bar', label: 'Verified Spaces', desc: 'Rooftops, lounges & galleries' },
                  { to: '/map', icon: 'map', label: 'Interactive Map', desc: `Live event pins across ${city}` },
                  { to: '/team', icon: 'groups', label: 'Leadership Team', desc: 'Meet CEO, CTO Samuel Onuegbu & execs' },
                  { to: '/organiser', icon: 'dashboard', label: 'Organiser Studio', desc: 'Host events & verify credentials' },
                  { to: '/venue-portal', icon: 'verified', label: 'Venue Verification', desc: 'Venue manager confirmation portal' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3.5 rounded-2xl p-3 transition hover:bg-slate-100 dark:hover:bg-midnight-800"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name={item.icon} className="text-xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="muted truncate text-xs">{item.desc}</p>
                    </div>
                    <Icon name="chevron_right" className="text-sm text-slate-400" />
                  </Link>
                ))}
              </nav>

              {/* Quick Android Download Card */}
              <div className="mt-5 rounded-2xl border border-neon-500/30 bg-neon-50/50 p-4 dark:bg-neon-500/10">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-neon-700 dark:text-neon-400">
                    <Icon name="android" className="text-base" /> Android App v1.0.0
                  </span>
                  <span className="rounded-full bg-neon-500/20 px-2 py-0.5 text-[10px] font-bold text-neon-700 dark:text-neon-300">
                    18.4 MB
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Fast native experience with offline ticket access.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      downloadApk();
                    }}
                    className="flex-1 rounded-xl bg-neon-500 py-2 text-center text-xs font-bold text-slate-950 transition hover:bg-neon-400"
                  >
                    Download APK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setApkModal(true);
                    }}
                    className="rounded-xl border border-neon-500/40 bg-white/70 px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-white dark:bg-midnight-800 dark:text-slate-200"
                  >
                    Guide
                  </button>
                </div>
              </div>

              {/* Account / Demo Actions */}
              <div className="mt-auto pt-6">
                {user ? (
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center gap-2.5 px-1 text-xs text-slate-500">
                      <Icon name="account_circle" className="text-base text-brand-500" />
                      <span className="truncate">{user.name || 'Logged in user'}</span>
                    </div>
                    <Link to="/home" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button full size="md">
                        Open Feed
                      </Button>
                    </Link>
                    <Button
                      full
                      variant="outline"
                      size="md"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <Button full size="md" variant="secondary" onClick={enterDemo}>
                      <Icon name="bolt" className="text-base" /> Try Instant Demo
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <Button full size="md" variant="outline">
                          Log in
                        </Button>
                      </Link>
                      <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                        <Button full size="md">
                          Sign up
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Dark / Light Mode Switcher */}
                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-slate-500">
                  <span>Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  <button
                    type="button"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                  >
                    <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-sm text-brand-500" />
                    <span>Switch</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Mobile Bottom Navigation Bar (Docked on Mobile) */}
      <aside
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-[var(--border)] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl dark:bg-midnight-900/95 md:hidden"
        aria-label="Quick mobile actions"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">COORDINA Mobile</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-300">Live events &amp; verified venues</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setApkModal(true)}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
          >
            <Icon name="android" className="text-sm text-neon-500" /> APK
          </button>
          <Link to="/home">
            <Button size="md" className="h-10 px-4 text-xs font-bold">
              Explore Now
            </Button>
          </Link>
        </div>
      </aside>

      {/* Editorial Hero Banner */}
      <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-float">
          <img
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1800&q=85"
            alt="Live concert crowd under stage lights"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35" />

          <div className="relative grid items-center gap-8 p-6 sm:p-10 md:grid-cols-12 md:p-14">
            <div className="md:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                <Icon name="location_on" className="text-brand-300 text-sm" /> Lagos · Abuja
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl">
                Discover the best events &amp; spaces near you.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                One calm, reliable place to explore verified venues, plan a clash-free weekend, and keep every ticket ready offline.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/home">
                  <Button size="lg">Explore Web App</Button>
                </Link>
                <Button size="lg" variant="white" onClick={() => setApkModal(true)}>
                  <Icon name="android" className="text-base text-brand-600" /> Download APK
                </Button>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" onClick={enterDemo}>
                  Launch Demo
                </Button>
              </div>
            </div>

            {/* Clean Floating White Itinerary Card */}
            <div className="md:col-span-5">
              <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-float">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Weekend Plan</p>
                    <p className="text-sm font-semibold text-slate-900">Saturday in Lagos</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-600">
                    2 Events · ₦25,000
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <img
                      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=75"
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">Afrobeats Night Live</p>
                      <p className="text-slate-500">8:00 PM · Cloud 9, Lekki · ₦10,000</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=75"
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">Rooftop Sunset Brunch</p>
                      <p className="text-slate-500">11:00 AM · The Nest, VI · ₦15,000</p>
                    </div>
                  </div>
                </div>

                <Link to="/home" className="mt-4 block">
                  <Button full size="md">Browse Discovery Feed</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="mx-auto max-w-6xl px-4 pt-8 md:px-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/discover?cat=${c}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-800 dark:bg-midnight-800 dark:text-slate-200"
            >
              <Icon name={CATEGORY_ICON[c]} className="text-[16px] text-brand-500" />
              <span>{c}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Events Photographic Grid */}
      <section id="featured" className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Popular Upcoming Events</h2>
            <p className="muted mt-1 text-sm">Handpicked concerts, dining, art, and social gatherings.</p>
          </div>
          <Link to="/home">
            <Button variant="outline" size="sm">
              View all <Icon name="arrow_forward" className="text-sm" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => {
            const sp = getSpace(e.spaceId);
            const d = new Date(e.start);
            const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = d.getDate();
            const p = minPrice(e);
            return (
              <Link
                key={e.id}
                to={`/event/${e.id}`}
                className="surface group cursor-pointer overflow-hidden rounded-2xl shadow-card transition hover:-translate-y-0.5 hover:shadow-float block"
              >
                <div className="relative h-48 overflow-hidden bg-slate-200">
                  <img
                    src={e.image}
                    alt={e.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-xs">
                    {p === 0 ? 'Free' : naira(p)}
                  </span>
                  <span className="absolute right-3 top-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                    {e.category}
                  </span>
                </div>
                <div className="flex gap-3.5 p-4">
                  <div className="flex w-10 shrink-0 flex-col items-center pt-0.5 text-center">
                    <span className="text-[11px] font-semibold tracking-wider text-brand-500">{mon}</span>
                    <span className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{e.title}</h3>
                    <p className="muted mt-0.5 truncate text-xs">
                      {fmtDate(e.start)} · {fmtTime(e.start)}
                    </p>
                    <p className="muted mt-1 flex items-center gap-1 truncate text-xs">
                      <Icon name="location_on" className="text-[14px] text-slate-400" />
                      <span className="truncate">{sp?.name ?? e.area}, {e.area}</span>
                      {sp?.verified && <Icon name="verified" filled className="text-[13px] text-neon-500" />}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Android APK Download Showcase Section */}
      <section id="download" className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-[#090D16] via-[#0F172A] to-[#161F33] p-6 text-white shadow-2xl md:p-12">
          {/* Subtle brand ambient glow without any white bleaching */}
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-neon-500/10 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-12">
            <div className="md:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-500/30 bg-neon-500/10 px-3 py-1 text-xs font-semibold text-neon-400">
                <Icon name="android" className="text-sm" /> Official Android Release · v1.0.0
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Get COORDINA for Android
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                Download the direct Android APK package. Built for low data usage, instant offline QR ticket scanning, and battery efficiency during late nights.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={downloadApk} className="bg-neon-500 text-slate-950 hover:bg-neon-400 font-bold">
                  <Icon name="download" /> Download APK (18.4 MB)
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setApkModal(true)}>
                  Install Instructions
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span>Android 8.0+ supported</span>
                <span>•</span>
                <span>Package: ng.coordina.app</span>
                <span>•</span>
                <button type="button" onClick={copyHash} className="hover:text-white underline decoration-dotted">
                  Verify SHA-256 Checksum
                </button>
              </div>
            </div>

            {/* QR Code & Phone Card */}
            <div className="md:col-span-5">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 text-center shadow-lg">
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-card">
                  {/* High quality SVG QR code mockup for direct mobile download */}
                  <svg viewBox="0 0 100 100" className="h-full w-full fill-slate-900">
                    <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 10h10v10H40zM50 20h10v10H50zM40 30h10v10H40zM10 40h10v10H10zM20 50h10v10H20zM30 40h10v10H30zM50 40h20v10H50zM70 40h10v10H70zM80 50h10v20H80zM40 60h10v20H40zM60 60h10v10H60zM70 70h20v10H70zM50 80h10v20H50zM80 80h10v10H80zM90 90h10v10H90zM60 90h10v10H60z" />
                  </svg>
                </div>
                <p className="mt-3 text-xs font-semibold text-white">Scan with your phone camera</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Direct download to any Android device</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="mb-6">
          <Badge tone="brand">Built for seamless nights out</Badge>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Everything in one clean flow</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.t} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon name={f.icon} className="text-xl" />
              </div>
              <h3 className="mt-3.5 text-base font-semibold text-slate-900 dark:text-white">{f.t}</h3>
              <p className="muted mt-1.5 text-sm leading-relaxed">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Deep Navy Footer */}
      <footer className="bg-midnight-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-12 sm:flex-row sm:items-center md:px-6">
          <div>
            <Logo size={28} tone="light" />
            <p className="mt-2 max-w-xs text-xs text-slate-400">
              Nigeria’s event and social-space discovery platform.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <Link to="/team" className="hover:text-white">Leadership Team</Link>
              <span>•</span>
              <Link to="/home" className="hover:text-white">Live Feed</Link>
              <span>•</span>
              <a href="#download" className="hover:text-white">Android APK</a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={downloadApk} className="bg-neon-500 text-slate-950 hover:bg-neon-400 font-bold">
              <Icon name="android" className="text-base" /> Download APK
            </Button>
            <Link to="/home">
              <Button size="sm" variant="white">
                Launch Web App
              </Button>
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} COORDINA. All rights reserved.
        </div>
      </footer>

      {/* Android APK Install Guide Bottom Sheet */}
      <BottomSheet open={apkModal} onClose={() => setApkModal(false)} title="Install COORDINA on Android">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-midnight-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-500/20 text-neon-600 dark:text-neon-400">
              <Icon name="android" className="text-3xl" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">COORDINA v1.0.0 (Release)</p>
              <p className="muted text-xs">18.4 MB · Requires Android 8.0 or newer</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">3 Quick Installation Steps:</p>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">1</span>
              <span>Tap <b>Download APK</b> below to start the direct package download.</span>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">2</span>
              <span>If your browser displays <i>“File might be harmful”</i>, tap <b>Download anyway</b>.</span>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">3</span>
              <span>Tap the downloaded notification, grant <i>“Install unknown apps”</i> permission if prompted, and tap <b>Install</b>.</span>
            </div>
          </div>

          <div className="pt-2">
            <Button full size="lg" onClick={downloadApk} className="bg-neon-500 text-slate-950 hover:bg-neon-400 font-bold">
              <Icon name="download" /> Download coordina-v1.0.0.apk
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
