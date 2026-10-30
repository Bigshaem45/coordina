import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, Chip, EmptyState } from '../../design-system/ui';
import { useStore } from '../../store';

type AdminTab = 'Verification' | 'Fraud' | 'Reports' | 'Analytics';

export default function Admin() {
  const admin = useStore((s) => s.admin);
  const flags = useStore((s) => s.flags);
  const reports = useStore((s) => s.reports);
  const decide = useStore((s) => s.adminDecide);
  const resolve = useStore((s) => s.resolveFlag);
  const [tab, setTab] = useState<AdminTab>('Verification');

  const pendingCount = admin.filter((a) => a.status === 'pending').length;
  const openFlags = flags.filter((f) => !f.resolved).length;

  return (
    <div className="px-4 py-6 md:px-0">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Console</h1>
        <p className="muted mt-0.5 text-sm">Verify venues and organisers, review fraud signals, and moderate user reports.</p>
      </div>

      {/* Event Portal style KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-brand-500 p-4">
          <p className="muted text-xs">Pending Reviews</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{pendingCount}</p>
        </Card>
        <Card className="border-l-4 border-l-coral-500 p-4">
          <p className="muted text-xs">Open Fraud Alerts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{openFlags}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500 p-4">
          <p className="muted text-xs">User Reports</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{reports.length}</p>
        </Card>
        <Card className="border-l-4 border-l-neon-500 p-4">
          <p className="muted text-xs">Weekly GMV</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">₦70m</p>
        </Card>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {(['Verification', 'Fraud', 'Reports', 'Analytics'] as const).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Chip>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === 'Verification' &&
          admin.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={a.kind === 'Venue' ? 'storefront' : 'event'} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{a.name}</h3>
                  <p className="muted text-xs">
                    {a.kind.toUpperCase()} · submitted by {a.by}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone={a.status === 'approved' ? 'neon' : a.status === 'rejected' ? 'coral' : 'brand'}>
                  {a.status}
                </Badge>
                {a.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => decide(a.id, 'approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(a.id, 'rejected')}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}

        {tab === 'Fraud' &&
          flags.map((f) => (
            <Card key={f.id} className={`p-4 transition-opacity ${f.resolved ? 'opacity-55' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="warning" className={f.level === 'high' ? 'text-coral-500' : 'text-amber-500'} />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{f.target}</span>
                </div>
                <Badge tone={f.level === 'high' ? 'coral' : 'brand'}>
                  {f.resolved ? 'resolved' : `${f.level} risk`}
                </Badge>
              </div>
              <p className="muted mt-1.5 text-sm">{f.reason}</p>
              {!f.resolved && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => resolve(f.id)}>
                    Mark Resolved
                  </Button>
                </div>
              )}
            </Card>
          ))}

        {tab === 'Reports' &&
          (reports.length === 0 ? (
            <Card>
              <EmptyState
                icon="flag"
                title="No user reports"
                text="Listings flagged by attendees from event detail pages appear here for moderation."
              />
            </Card>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{r.target}</h3>
                <p className="muted mt-1 text-sm">{r.reason}</p>
              </Card>
            ))
          ))}

        {tab === 'Analytics' && (
          <Card className="p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Platform Weekly GMV (₦ Millions)</h3>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart
                  data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
                    d,
                    gmv: [4, 5, 6, 8, 14, 21, 12][i],
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="d" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="gmv" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
