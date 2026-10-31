import { Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';

interface Executive {
  role: string;
  code: string;
  name: string;
  location: string;
  bio: string;
  image: string;
  linkedin?: string;
  twitter?: string;
}

const EXECUTIVES: Executive[] = [
  {
    role: 'Chief Executive Officer',
    code: 'CEO',
    name: 'Mohammed Hashiru',
    location: 'Abuja, Nigeria',
    bio: 'Championing the corporate vision, strategic partnerships, and Nigeria-first event discovery ecosystem. Obsessed with building trusted infrastructure that connects millions of event-goers with verified organizers and premier social spaces.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85',
    linkedin: 'https://linkedin.com',
    twitter: 'https://x.com',
  },
  {
    role: 'Chief Technology Officer',
    code: 'CTO',
    name: 'Samuel Onuegbu',
    location: 'Abuja & Lagos, Nigeria',
    bio: 'Architecting COORDINA’s real-time schedule conflict engine, offline cryptographic ticket wallets, remote verification framework, and low-data mobile performance optimized for African networks.',
    image: '/team/samuel-onuegbu.jpg',
    linkedin: 'https://linkedin.com/in/samuelonuegbu',
    twitter: 'https://x.com/samuelonuegbu',
  },
  {
    role: 'Chief Operating Officer',
    code: 'COO',
    name: 'Okafor Ifeanyi',
    location: 'Abuja, Nigeria',
    bio: 'Directing cross-city operational execution, venue partnership onboarding, physical inspection workflows, gate management infrastructure, and on-ground trust standards across clubs, lounges, and festival grounds.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85',
    linkedin: 'https://linkedin.com',
    twitter: 'https://x.com',
  },
  {
    role: 'Chief Financial Officer',
    code: 'CFO',
    name: 'Sumayya Suleiman',
    location: 'Abuja, Nigeria',
    bio: 'Leading financial governance, multi-rail Naira settlement systems (Card, Instant Bank Transfer, USSD), organizer payout escrow, and transaction security against ticket scalping.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=85',
    linkedin: 'https://linkedin.com',
    twitter: 'https://x.com',
  },
  {
    role: 'Chief Marketing Officer',
    code: 'CMO',
    name: 'Deinbo Krukrubo',
    location: 'Abuja, Nigeria',
    bio: 'Spearheading brand identity, community growth, creator partnerships, and cultural resonance across music festivals, art exhibitions, nightlife, and culinary scenes nationwide.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=85',
    linkedin: 'https://linkedin.com',
    twitter: 'https://x.com',
  },
];

const VALUES = [
  {
    icon: 'verified_user',
    title: 'Zero Fraud Tolerance',
    desc: 'Every space and event on COORDINA is physically vetted or verified with registered corporate KYC before tickets go live.',
  },
  {
    icon: 'bolt',
    title: 'Low-Data by Design',
    desc: 'Our interfaces and ticket wallets load in sub-seconds even on congested 3G/4G networks without consuming unnecessary megabytes.',
  },
  {
    icon: 'payments',
    title: 'Transparent Naira Pricing',
    desc: 'No hidden gateway charges or surprise booking markups at checkout. What you see on the listing is what you pay.',
  },
];

export default function Team() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur-xl dark:bg-midnight-900/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={30} />
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white">Home</Link>
            <Link to="/home" className="hover:text-slate-900 dark:hover:text-white">Web App</Link>
            <Link to="/team" className="font-semibold text-brand-600 dark:text-brand-400">Team</Link>
            <a href="/#download" className="hover:text-slate-900 dark:hover:text-white">Android APK</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/home">
              <Button size="sm">Launch App</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-2xl">
          <Badge tone="brand">Leadership Team</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Meet the team building COORDINA.
          </h1>
          <p className="muted mt-4 text-base leading-relaxed sm:text-lg">
            We are builders, operators, and cultural enthusiasts based in Lagos and Abuja, reimagining how Nigeria plans social experiences and discovers verified spaces.
          </p>
        </div>

        {/* Executive Cards Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXECUTIVES.map((exec) => (
            <Card key={exec.code} className="group overflow-hidden border border-slate-200 transition-all hover:border-brand-400 hover:shadow-float dark:border-slate-800">
              <div className="relative h-72 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={exec.image}
                  alt={exec.name}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="rounded-md bg-white/95 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-950 shadow-xs">
                      {exec.code}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-white drop-shadow-sm">{exec.role}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-slate-200 drop-shadow-sm">
                    <Icon name="location_on" className="text-xs text-brand-300" /> {exec.location.split(',')[0]}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{exec.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400">
                    {exec.linkedin && (
                      <a href={exec.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-brand-500">
                        <Icon name="link" className="text-sm" />
                      </a>
                    )}
                    {exec.twitter && (
                      <a href={exec.twitter} target="_blank" rel="noreferrer" aria-label="X / Twitter" className="hover:text-brand-500">
                        <Icon name="share" className="text-sm" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="muted mt-2 text-xs leading-relaxed">
                  {exec.bio}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Mission & Values */}
      <section className="border-t border-[var(--border)] bg-slate-50/60 py-16 dark:bg-midnight-950/40">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Operating Principles</h2>
            <p className="muted mt-1.5 text-sm">
              How we approach event discovery, venue verification, and ticketing for Nigeria.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {VALUES.map((v) => (
              <Card key={v.title} className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={v.icon} className="text-xl" />
                </div>
                <h3 className="mt-3.5 text-base font-semibold text-slate-900 dark:text-white">{v.title}</h3>
                <p className="muted mt-1.5 text-xs leading-relaxed">{v.desc}</p>
              </Card>
            ))}
          </div>

          {/* Join Us Banner */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-midnight-900 sm:flex sm:items-center sm:justify-between sm:p-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Want to build with us?</h3>
              <p className="muted mt-1 max-w-md text-xs">
                We are actively looking for mobile engineers, venue account managers, and community leads in Lagos and Abuja.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <a href="mailto:careers@coordina.ng">
                <Button>
                  <Icon name="mail" /> Contact Leadership
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-midnight-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-12 sm:flex-row sm:items-center md:px-6">
          <div>
            <Logo size={28} tone="light" />
            <p className="mt-2 max-w-xs text-xs text-slate-400">
              Nigeria’s event and social-space discovery platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}

