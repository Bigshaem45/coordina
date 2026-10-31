import { Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip } from '../../design-system/ui';
import { useStore, useAllSpaces } from '../../store';
import { naira } from '../../lib/format';

export default function Profile() {
  const s = useStore();
  const allSpaces = useAllSpaces();

  const workspaceLinks = [
    { to: '/', icon: 'home', title: 'Landing Page', sub: 'Explore public showcase & features' },
    { to: '/team', icon: 'badge', title: 'Leadership Team', sub: 'Meet the executive leadership' },
    { to: '/squad', icon: 'groups', title: 'Squad Mode', sub: 'Vote with friends & split costs' },
    { to: '/organiser', icon: 'equalizer', title: 'Organiser Studio', sub: 'Publish events, scan QR & payouts' },
    { to: '/admin', icon: 'verified_user', title: 'Admin Console', sub: 'Venue verification & moderation' },
    { to: '/design-system', icon: 'palette', title: 'Design System', sub: 'Minimalist UI tokens & components' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-0">
      {/* Profile summary */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-semibold text-white">
            {(s.user?.name ?? 'Y')[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{s.user?.name ?? 'Guest Explorer'}</h1>
            {s.user?.email && <p className="muted text-xs">{s.user.email}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="brand">{s.city}</Badge>
              <Badge tone="muted">{s.vibe}</Badge>
              <Badge tone="neon">Cap {naira(s.budget)}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance</p>
            <p className="muted text-xs">Switch between crisp light and midnight dark themes</p>
          </div>
          <div className="flex gap-2">
            <Chip active={s.theme === 'light'} onClick={() => s.setTheme('light')}>
              <Icon name="light_mode" className="text-sm" /> Light
            </Chip>
            <Chip active={s.theme === 'dark'} onClick={() => s.setTheme('dark')}>
              <Icon name="dark_mode" className="text-sm" /> Dark
            </Chip>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Primary City</p>
            <p className="muted text-xs">Personalises discovery feeds and neighbourhood clusters</p>
          </div>
          <div className="flex gap-2">
            {(['Abuja', 'Lagos'] as const).map((c) => (
              <Chip key={c} active={s.city === c} onClick={() => s.setCity(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Low-Data Mode</p>
            <p className="muted text-xs">Replaces high-res photography with lightweight placeholders</p>
          </div>
          <Chip active={s.lowData} onClick={s.toggleLowData}>
            {s.lowData ? 'Enabled' : 'Off'}
          </Chip>
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="bud" className="font-medium text-slate-900 dark:text-slate-100">
              Plan Budget Alert Limit
            </label>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{naira(s.budget)}</span>
          </div>
          <input
            id="bud"
            type="range"
            min={5000}
            max={500000}
            step={5000}
            value={s.budget}
            onChange={(e) => s.setBudget(+e.target.value)}
            className="mt-2 h-9 w-full cursor-pointer accent-brand-500"
          />
          {s.savedCard && (
            <p className="muted mt-1 text-xs">
              Saved payment method: <b className="text-slate-800 dark:text-slate-200">{s.savedCard}</b>
            </p>
          )}
        </div>
      </Card>

      {/* Workspaces & Tools */}
      <div className="grid gap-3 sm:grid-cols-2">
        {workspaceLinks.map((w) => (
          <Link key={w.to} to={w.to} className="group block">
            <Card className="flex items-center justify-between gap-3 p-4 transition-all group-hover:border-brand-400">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={w.icon} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{w.title}</p>
                  <p className="muted text-xs">{w.sub}</p>
                </div>
              </div>
              <Icon name="chevron_right" className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
      </div>

      {/* Space Bookings & Orders */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Space Reservations</h2>
          {s.bookings.length === 0 ? (
            <p className="muted text-sm">No reservations yet. Open any verified space to request a table.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {allSpaces.find((x) => x.id === b.spaceId)?.name ?? 'Verified Space'}
                    </p>
                    <p className="muted text-xs">
                      {b.date} · {b.guests} guests
                    </p>
                  </div>
                  <Badge tone="brand">{b.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Order History</h2>
          {s.orders.length === 0 ? (
            <p className="muted text-sm">Completed ticket orders appear here.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{o.id}</p>
                    <p className="muted text-xs">{new Date(o.at).toLocaleDateString('en-NG')}</p>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{naira(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="outline"
          onClick={() => {
            s.signOut();
            location.href = '/';
          }}
        >
          <Icon name="logout" /> Sign Out
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            localStorage.removeItem('cho-store');
            location.href = '/';
          }}
        >
          Reset Demo Data
        </Button>
      </div>
    </div>
  );
}
