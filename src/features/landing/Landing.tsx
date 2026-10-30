import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const nav = useNavigate();
  const [apkModal, setApkModal] = useState(false);

  const enterDemo = () => {
    socialSignIn('Demo');
    finishOnboarding({ city: 'Lagos', interests: ['Concerts', 'Food', 'Nightlife'], budget: 80000, vibe: 'Energetic' });
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur-xl dark:bg-midnight-900/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={30} />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <a href="#featured" className="hover:text-slate-900 dark:hover:text-white">Featured</a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white">Features</a>
            <Link to="/home" className="hover:text-slate-900 dark:hover:text-white">Web App</Link>
            <Link to="/team" className="hover:text-slate-900 dark:hover:text-white">Team</Link>
            <a href="#download" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              <Icon name="android" className="text-base" /> Download APK
            </a>
          </div>
          <nav className="flex items-center gap-2" aria-label="Account">
            <button
              type="button"
              onClick={() => setApkModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100 sm:hidden"
            >
              <Icon name="android" className="text-brand-500 text-sm" /> APK
            </button>
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
          </nav>
        </div>
      </header>

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
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-midnight-900 to-brand-950 p-6 text-white shadow-float md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-12">
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
              <div className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl text-center">
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-card">
                  {/* High quality SVG QR code mockup for direct mobile download */}
                  <svg viewBox="0 0 100 100" className="h-full w-full fill-slate-900">
                    <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 10h10v10H40zM50 20h10v10H50zM40 30h10v10H40zM10 40h10v10H10zM20 50h10v10H20zM30 40h10v10H30zM50 40h20v10H50zM70 40h10v10H70zM80 50h10v20H80zM40 60h10v20H40zM60 60h10v10H60zM70 70h20v10H70zM50 80h10v20H50zM80 80h10v10H80zM90 90h10v10H90zM60 90h10v10H60z" />
                  </svg>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-200">Scan with your phone camera</p>
                <p className="muted text-[11px]">Direct download to any Android device</p>
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
