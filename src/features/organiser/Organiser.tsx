import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { CATEGORIES, AREAS, CATEGORY_PHOTO } from '../../data/mock';
import { Badge, Button, Card, Chip, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useAllSpaces, useStore } from '../../store';
import { fmtDate, fmtTime, naira, computeOrganiserPostingFee, FREE_EVENT_RATE_PER_100 } from '../../lib/format';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendVenueConfirmationRequestEmail } from '../../lib/email';
import type { Category, CEvent, Vibe, EventVerificationRecord } from '../../types';
import { VerificationBadge } from '../../design-system/VerificationBadge';
import { calculateRiskAssessment } from '../../lib/verification';

type Tab = 'Dashboard' | 'Create' | 'Verification' | 'Scanner' | 'Payouts';

const sales = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  sales: Math.round(40 + Math.sin(i / 2) * 20 + i * 9),
  revenue: Math.round((40 + i * 9) * 9000),
}));

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export default function Organiser() {
  const [tab, setTab] = useState<Tab>('Dashboard');

  return (
    <div className="px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Organiser Studio</h1>
          <p className="muted mt-0.5 text-sm">Manage events, monitor real-time ticket velocity, scan passes, and track payouts.</p>
        </div>
        {tab !== 'Create' && (
          <Button size="sm" onClick={() => setTab('Create')}>
            <Icon name="add_circle" /> Create Event
          </Button>
        )}
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {(['Dashboard', 'Create', 'Verification', 'Scanner', 'Payouts'] as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Chip>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'Dashboard' ? (
          <Dashboard />
        ) : tab === 'Create' ? (
          <Create onDone={() => setTab('Dashboard')} />
        ) : tab === 'Verification' ? (
          <OrganizerVerificationPortal />
        ) : tab === 'Scanner' ? (
          <Scanner />
        ) : (
          <Payouts />
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const allEvents = useAllEvents();
  const mine = allEvents.filter((e) => e.organiserId === 'org1' || e.organiserId === 'org2' || e.organiserId === 'o1');
  const checked = useStore((s) => s.checkedIn);
  const [codes, setCodes] = useState([{ code: 'EARLYBIRD', pct: 15, uses: 42 }]);
  const [code, setCode] = useState('');
  const [pct, setPct] = useState(10);

  const sold = mine.reduce((s, e) => s + e.tiers.reduce((a, t) => a + (t.total - t.remaining), 0), 0);
  const rev = mine.reduce((s, e) => s + e.tiers.reduce((a, t) => a + (t.total - t.remaining) * t.price, 0), 0);
  const ci = Object.values(checked).reduce((a, b) => a + b, 0);

  const kpis = [
    { label: 'Tickets Sold', value: sold.toLocaleString(), accent: 'border-l-brand-500' },
    { label: 'Gross Revenue', value: naira(rev), accent: 'border-l-neon-500' },
    { label: 'Checked In', value: String(ci), accent: 'border-l-amber-500' },
    { label: 'Live Events', value: String(mine.length), accent: 'border-l-coral-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`border-l-4 ${k.accent} p-4`}>
            <p className="muted text-xs">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Event Portal style structured table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Published Events</h2>
          <Badge tone="brand">{mine.length} total</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-5 py-3">#</th>
                <th className="px-4 py-3">Event Name</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Date & Hours</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mine.map((e, idx) => {
                const eventSold = e.tiers.reduce((a, t) => a + (t.total - t.remaining), 0);
                const eventTotal = e.tiers.reduce((a, t) => a + t.total, 0);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Cover gradient={e.image} category={e.category} label={e.title} className="h-10 w-14 shrink-0 rounded-lg" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{e.title}</p>
                          <p className="muted text-xs">{e.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {e.area}, {e.city}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      <div>{fmtDate(e.start)}</div>
                      <div className="muted">
                        {fmtTime(e.start)} – {fmtTime(e.end)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone="neon">
                        {eventSold} / {eventTotal}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/event/${e.id}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-200"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Ticket Sales (14 Days)</h3>
          <div className="h-56" role="img" aria-label="Line chart of ticket sales over 14 days">
            <ResponsiveContainer>
              <AreaChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="day" fontSize={11} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} fill="#4F46E528" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Sales by Ticket Tier</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart
                data={mine.flatMap((e) =>
                  e.tiers.map((t) => ({ name: `${e.title.slice(0, 12)} · ${t.name}`, sold: t.total - t.remaining })),
                )}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="name" hide />
                <YAxis fontSize={11} stroke="#94A3B8" />
                <Tooltip />
                <Bar dataKey="sold" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Promo Codes</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {codes.map((c) => (
            <div key={c.code} className="flex items-center justify-between py-2.5 text-sm">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {c.code}
              </span>
              <span className="muted text-xs">
                {c.pct}% off · {c.uses} redemptions
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            aria-label="Promo code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="NEWCODE"
            className={`${inputCls} flex-1 font-mono`}
          />
          <input
            aria-label="Discount percent"
            type="number"
            min={1}
            max={90}
            value={pct}
            onChange={(e) => setPct(+e.target.value)}
            className={`${inputCls} w-24`}
          />
          <Button
            disabled={!code.trim()}
            onClick={() => {
              setCodes([...codes, { code: code.trim(), pct, uses: 0 }]);
              setCode('');
              toast('Promo code created');
            }}
          >
            Add Code
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Create({ onDone }: { onDone: () => void }) {
  const add = useStore((s) => s.addCustomEvent);
  const allSpaces = useAllSpaces();
  const [f, setF] = useState({
    title: '',
    category: 'Concerts' as Category,
    vibe: 'Energetic' as Vibe,
    area: 'Wuse',
    space: allSpaces[0]?.id || 'space1',
    date: '',
    start: '19:00',
    end: '22:00',
    desc: '',
  });
  const [tiers, setTiers] = useState([{ name: 'General', price: 5000, qty: 200 }]);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.title.trim() && f.date && tiers.every((t) => t.name.trim() && t.qty > 0);
  const postingFee = computeOrganiserPostingFee(tiers);

  const submit = async () => {
    const a = AREAS[f.area];
    const start = new Date(`${f.date}T${f.start}`);
    let end = new Date(`${f.date}T${f.end}`);
    if (end <= start) end = new Date(end.getTime() + 864e5);
    const id = 'c' + Date.now();
    const ev: CEvent = {
      id,
      title: f.title.trim(),
      category: f.category,
      vibe: f.vibe,
      city: a.city,
      area: f.area,
      spaceId: f.space,
      organiserId: 'org1',
      start: start.toISOString(),
      end: end.toISOString(),
      image: CATEGORY_PHOTO[f.category],
      description: f.desc.trim() || 'New verified experience on COORDINA.',
      tiers: tiers.map((t, i) => ({
        id: `${id}-t${i}`,
        name: t.name.trim(),
        price: t.price,
        remaining: t.qty,
        total: t.qty,
      })),
      lat: a.lat,
      lng: a.lng,
      verificationStatus: 'Organizer Verified',
    };
    add(ev);

    try {
      await convex.mutation(api.events.create, {
        title: ev.title,
        description: ev.description,
        category: ev.category,
        city: ev.city,
        area: ev.area,
        spaceId: ev.spaceId.startsWith('space') ? undefined : (ev.spaceId as any),
        venueName: allSpaces.find((s) => s.id === ev.spaceId)?.name || ev.area,
        address: `${ev.area}, ${ev.city}`,
        start: ev.start,
        end: ev.end,
        organizerId: 'org1' as any,
        image: ev.image,
        tags: [ev.category, ev.area],
        clashTags: [ev.category.toLowerCase(), ev.area.toLowerCase()],
        vibe: ev.vibe,
        tiers: ev.tiers,
        isFree: postingFee.isFree,
        expectedAttendance: postingFee.totalCapacity || 100,
      });
    } catch (e) {
      console.warn('Convex event sync:', e);
    }

    if (postingFee.isFree) {
      toast(`Free Event submitted! Organiser hosting fee of ${naira(postingFee.postingFee)} (${postingFee.totalCapacity} guests @ ₦2,500/100) billed.`);
    } else {
      toast('Paid Event submitted! ₦0 organiser fee (attendees pay processing at checkout).');
    }
    onDone();
  };

  return (
    <Card className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create New Event</h2>
        <Badge tone="brand">{f.category}</Badge>
      </div>

      <Cover gradient={CATEGORY_PHOTO[f.category]} category={f.category} label={f.category} className="h-40 w-full rounded-2xl" />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Event Title</label>
        <input
          aria-label="Title"
          placeholder="e.g. Sunset Jazz & Cocktails"
          className={inputCls}
          value={f.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
          <select aria-label="Category" className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Vibe</label>
          <select aria-label="Vibe" className={inputCls} value={f.vibe} onChange={(e) => set('vibe', e.target.value)}>
            {['Chill', 'Energetic', 'Classy', 'Family', 'Creative'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Neighbourhood</label>
          <select aria-label="Area" className={inputCls} value={f.area} onChange={(e) => set('area', e.target.value)}>
            {Object.keys(AREAS).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Verified Space</label>
          <select aria-label="Venue" className={inputCls} value={f.space} onChange={(e) => set('space', e.target.value)}>
            {allSpaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.area})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Date</label>
          <input aria-label="Date" type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Starts</label>
            <input aria-label="Start time" type="time" className={inputCls} value={f.start} onChange={(e) => set('start', e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Ends</label>
            <input aria-label="End time" type="time" className={inputCls} value={f.end} onChange={(e) => set('end', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
        <textarea
          aria-label="Description"
          placeholder="Tell guests what to expect, dress code, parking, and lineup..."
          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100"
          rows={3}
          value={f.desc}
          onChange={(e) => set('desc', e.target.value)}
        />
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ticket Tiers (₦)</h3>
            <p className="muted text-[11px]">Set price to ₦0 for free admissions</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTiers([{ name: 'Free RSVP', price: 0, qty: 100 }])}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
            >
              Make Free (₦0)
            </button>
            <Button variant="outline" size="sm" onClick={() => setTiers([...tiers, { name: 'VIP', price: 20000, qty: 50 }])}>
              + Add Tier
            </Button>
          </div>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_90px_36px] items-center gap-2">
            <input
              aria-label="Tier name"
              placeholder="Tier"
              className={inputCls}
              value={t.name}
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              aria-label="Price"
              type="number"
              min={0}
              className={inputCls}
              value={t.price}
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))}
            />
            <input
              aria-label="Quantity"
              type="number"
              min={1}
              className={inputCls}
              value={t.qty}
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))}
            />
            <button
              type="button"
              aria-label="Remove tier"
              disabled={tiers.length === 1}
              onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>

      {/* COORDINA Platform Fee Breakdown */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          postingFee.isFree
            ? 'border-brand-500/30 bg-brand-500/5 dark:bg-brand-500/10'
            : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-midnight-900/60'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                postingFee.isFree
                  ? 'bg-brand-500 text-white'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Icon name={postingFee.isFree ? 'payments' : 'check_circle'} className="text-base" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {postingFee.isFree ? 'Free Event Organiser Hosting Fee' : 'Paid Event: ₦0 Upfront Posting Fee'}
              </p>
              <p className="muted text-[11px]">
                {postingFee.isFree
                  ? `₦${FREE_EVENT_RATE_PER_100.toLocaleString('en-NG')} per 100 persons capacity (${postingFee.hundredBlocks} block${postingFee.hundredBlocks > 1 ? 's' : ''} for ${postingFee.totalCapacity} guests)`
                  : 'Attendees pay standard 5% + ₦100 processing fee during checkout'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {postingFee.isFree ? naira(postingFee.postingFee) : '₦0'}
            </span>
            <span className="block text-[10px] font-medium text-brand-600 dark:text-brand-400">
              {postingFee.isFree ? 'Attendee Fee: ₦0 Free' : 'Free to Post'}
            </span>
          </div>
        </div>

        {postingFee.isFree ? (
          <p className="mt-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            For free events, all attendees RSVP with <strong>₦0 attendee processing fee</strong>. The organiser posting fee of <strong>{naira(postingFee.postingFee)}</strong> covers platform verification, cryptographic QR ticket generation, and gate scanner support.
          </p>
        ) : (
          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Organisers post paid events for free. COORDINA deducts platform processing and gateway fees directly at ticket checkout.
          </p>
        )}
      </div>

      <Button full size="lg" disabled={!valid} onClick={submit}>
        {postingFee.isFree ? `Pay ${naira(postingFee.postingFee)} & Publish Free Event` : 'Publish Event (Free to Post)'}
      </Button>
    </Card>
  );
}

function Scanner() {
  const tickets = useStore((s) => s.tickets);
  const checkIn = useStore((s) => s.checkIn);
  const checked = useStore((s) => s.checkedIn);
  const all = useAllEvents();
  const [code, setCode] = useState('');
  const [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const total = Object.values(checked).reduce((a, b) => a + b, 0);

  const scan = (override?: string) => {
    const raw = (override ?? code).trim().toUpperCase();
    const id = raw.split(':').pop() ?? '';
    const t = tickets.find((x) => x.id === id);
    if (!t) return setRes({ ok: false, msg: 'Invalid ticket code' });
    const used = window as unknown as { __used?: Set<string> };
    used.__used ??= new Set();
    if (used.__used.has(id)) return setRes({ ok: false, msg: 'Ticket has already been scanned' });
    used.__used.add(id);
    checkIn(t.eventId);
    setRes({ ok: true, msg: `${t.tierName} · ${all.find((e) => e.id === t.eventId)?.title}` });
    setCode('');
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-slate-950 p-6 text-center text-white shadow-card">
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-white/5">
          <Icon name="qr_code_scanner" className="text-4xl text-brand-300" />
        </div>
        <p className="mt-3 text-xs text-slate-300">Align guest QR code inside the frame or enter ticket ID below</p>
      </div>

      <div className="flex gap-2">
        <input
          aria-label="Ticket code"
          placeholder="Enter ticket code (e.g. TKT-...)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputCls} flex-1 font-mono`}
        />
        <Button onClick={() => scan()}>Scan</Button>
      </div>

      {tickets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="muted">Quick test with wallet ticket:</span>
          {tickets.slice(0, 3).map((t) => (
            <Chip key={t.id} onClick={() => scan(t.id)}>
              {t.id}
            </Chip>
          ))}
        </div>
      )}

      {res && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-medium ${
            res.ok
              ? 'border-neon-500/30 bg-neon-50 text-neon-700 dark:bg-neon-500/15 dark:text-neon-400'
              : 'border-coral-500/30 bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-400'
          }`}
        >
          <Icon name={res.ok ? 'check_circle' : 'cancel'} filled />
          <span>{res.msg}</span>
        </div>
      )}

      <Card className="p-5 text-center">
        <p className="muted text-xs">Total Guests Checked In</p>
        <p className="mt-1 text-4xl font-semibold text-slate-900 dark:text-slate-100">{total}</p>
      </Card>
    </div>
  );
}

function Payouts() {
  const rows = [
    { d: 'Next Friday (Scheduled)', ref: 'PAY-9941', a: 2100000, s: 'Scheduled' },
    { d: '3 days ago', ref: 'PAY-9810', a: 1840000, s: 'Paid' },
    { d: 'Last week', ref: 'PAY-9702', a: 920000, s: 'Paid' },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="border-l-4 border-l-brand-500 p-5">
        <p className="muted text-xs">Available Settlement Balance</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">{naira(2100000)}</p>
        <p className="muted mt-1 text-xs">Auto-settled every Friday to GTBank •••• 4821</p>
      </Card>

      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r) => (
          <div key={r.ref} className="flex items-center justify-between px-5 py-4 text-sm">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{r.d}</p>
              <p className="muted font-mono text-xs">{r.ref}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{naira(r.a)}</span>
              <Badge tone={r.s === 'Paid' ? 'neon' : 'brand'}>{r.s}</Badge>
            </div>
          </div>
        ))}
      </Card>

      {/* Platform Fee Schedule Information */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">COORDINA Fee Schedule</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-midnight-900">
            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
              <Icon name="confirmation_number" className="text-brand-500" />
              <span>Paid Ticket Events</span>
            </div>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
              Organisers pay <strong>₦0 to post</strong>. Ticket buyers pay 5% platform service fee (capped at ₦2,000) + ₦100 payment processing fee at checkout.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-midnight-900">
            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
              <Icon name="loyalty" className="text-neon-500" />
              <span>Free Admission Events</span>
            </div>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
              Attendees RSVP <strong>100% free with ₦0 fee</strong>. Organiser pays <strong>₦2,500 per 100 persons capacity</strong> to cover hosting, verification, and gate scanning.
            </p>
          </div>
        </div>
      </Card>

      <EmptyState icon="account_balance" title="Need to update your settlement bank?" text="Manage verified Nigerian corporate or personal payout accounts in account settings." />
    </div>
  );
}

function OrganizerVerificationPortal() {
  const verifications = useStore((s) => s.verifications);
  const submitForVerification = useStore((s) => s.submitForVerification);
  const allEvents = useAllEvents();
  const allSpaces = useAllSpaces();
  const mine = allEvents.filter((e) => e.organiserId === 'org1' || e.organiserId === 'org2' || e.organiserId === 'o1');
  const [selectedEventId, setSelectedEventId] = useState(mine[0]?.id ?? '');
  const [cac, setCac] = useState('RC-1849204');
  const [director, setDirector] = useState('Samuel Onuegbu');
  const [nin, setNin] = useState('NIN-8910248192');
  const [phone, setPhone] = useState('+234 803 555 1234');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(true);
  const [venueEmail, setVenueEmail] = useState('contact@wuseartsgallery.ng');
  const [venuePhone, setVenuePhone] = useState('+234 809 111 2233');

  const selectedEvent = mine.find((e) => e.id === selectedEventId) ?? mine[0];
  const activeVerifications = verifications.filter((v) => v.organizerId === 'org1' || v.organizerId === 'org2');

  // Compute live risk assessment preview
  const liveRisk = calculateRiskAssessment({
    isNewOrganizer: false,
    hasCacNumber: cac.trim().length > 3,
    isBvnNinVerified: nin.trim().length > 5,
    isVenueConfirmed: false,
    maxTicketPrice: selectedEvent ? Math.max(...selectedEvent.tiers.map((t) => t.price)) : 10000,
    startDate: selectedEvent ? selectedEvent.start : new Date().toISOString(),
    hasFlyer: true,
    hasVenueAgreement: true,
    organizerTrustScore: 4.9,
  });

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const token = 'tok_' + Math.random().toString(36).slice(2, 10);
    const id = 'vr-' + Date.now();

    const record: EventVerificationRecord = {
      id,
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      category: selectedEvent.category,
      city: selectedEvent.city,
      area: selectedEvent.area,
      venueId: selectedEvent.spaceId,
      venueName: allSpaces.find((s) => s.id === selectedEvent.spaceId)?.name ?? selectedEvent.area,
      organizerId: 'org1',
      organizerName: 'Eclipse Live Africa',
      organizerIdentity: {
        cacNumber: cac.trim(),
        bvnNinVerified: true,
        phoneOtpVerified: true,
        directorName: director.trim(),
      },
      documents: [
        {
          id: 'doc-' + Date.now(),
          name: `${selectedEvent.title} Official Flyer & Lineup.pdf`,
          type: 'Event Flyer & Lineup',
          url: selectedEvent.image,
          uploadedAt: new Date().toISOString(),
          verified: true,
        },
        {
          id: 'doc-cac-' + Date.now(),
          name: 'CAC Corporate Certificate.pdf',
          type: 'CAC Certificate',
          url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
          uploadedAt: new Date().toISOString(),
          verified: true,
        },
      ],
      venueConfirmation: {
        id: 'vc-' + Date.now(),
        venueId: selectedEvent.spaceId,
        venueName: allSpaces.find((s) => s.id === selectedEvent.spaceId)?.name ?? selectedEvent.area,
        contactEmail: venueEmail.trim(),
        contactPhone: venuePhone.trim(),
        token,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        notes: 'Awaiting venue manager confirmation response via Termii / Email token link.',
      },
      riskAssessment: liveRisk,
      status: 'Verification Pending',
      submittedAt: new Date().toISOString(),
    };

    submitForVerification(record);
    sendVenueConfirmationRequestEmail({
      venueEmail: venueEmail.trim(),
      venueName: record.venueName,
      eventTitle: selectedEvent.title,
      organizerName: record.organizerName,
      date: fmtDate(selectedEvent.start),
      token,
    });
    toast('Event submitted for remote verification! Venue confirmation email sent.');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Active Verification Status Header */}
      <Card className="border-l-4 border-l-brand-500 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
              Organizer Verification Status
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Afro Nation Collective</h2>
            <p className="muted mt-0.5 text-xs">
              CAC: <strong className="text-slate-800 dark:text-slate-200">RC-1849204</strong> · Director:{' '}
              <strong className="text-slate-800 dark:text-slate-200">Babatunde Adeyemi</strong> · Level 3 KYC
            </p>
          </div>
          <VerificationBadge status="Organizer Verified" size="md" />
        </div>
      </Card>

      {/* Your Submitted Events Verification Queue */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Submitted Event Verifications</h3>
        <p className="muted text-xs">Events with verified badges receive 4.2x higher ticket sales and lower chargebacks.</p>

        <div className="mt-3 space-y-3">
          {activeVerifications.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{v.eventTitle}</h4>
                    <VerificationBadge status={v.status} size="sm" />
                  </div>
                  <p className="muted mt-0.5 text-xs">
                    Venue: {v.venueName} · Risk Score: <strong>{v.riskAssessment.score}/100 ({v.riskAssessment.level})</strong>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Venue Confirmation:{' '}
                    <strong className={v.venueConfirmation.status === 'Confirmed' ? 'text-emerald-600' : 'text-amber-600'}>
                      {v.venueConfirmation.status}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/venue-portal/${v.venueConfirmation.token}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                  >
                    <Icon name="link" className="text-xs" />
                    Open Portal
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const portalUrl = `https://coordina-beta.vercel.app/venue-portal/${v.venueConfirmation.token}`;
                      navigator.clipboard?.writeText(portalUrl);
                      toast('Venue confirmation link copied!');
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200"
                  >
                    <Icon name="content_copy" className="text-xs" />
                    Copy Token Link
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Submit New Event for Verification */}
      <Card className="space-y-4 p-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Apply for Remote Event Verification</h3>
          <p className="muted mt-0.5 text-xs">
            Verify your event without physical attendance using automated CAC cross-checks, Termii OTP, and venue confirmation tokens.
          </p>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Select Event to Verify</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className={inputCls}
            >
              {mine.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.area}, {e.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">CAC Registration (RC)</label>
              <input
                type="text"
                value={cac}
                onChange={(e) => setCac(e.target.value)}
                placeholder="e.g. RC-1849204"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Director Name</label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Director Full Name"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Director NIN / BVN</label>
              <input
                type="text"
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                placeholder="NIN or BVN"
                className={inputCls}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Phone &amp; Termii OTP</label>
                {otpVerified ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified</span>
                ) : otpSent ? (
                  <button
                    type="button"
                    onClick={() => setOtpVerified(true)}
                    className="text-[10px] font-semibold text-brand-500 hover:underline"
                  >
                    Enter 1234
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOtpSent(true)}
                    className="text-[10px] font-semibold text-brand-500 hover:underline"
                  >
                    Send OTP
                  </button>
                )}
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setOtpVerified(false);
                }}
                placeholder="+234 803 555 1234"
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Venue Manager Email (for Confirmation Token)
              </label>
              <input
                type="email"
                value={venueEmail}
                onChange={(e) => setVenueEmail(e.target.value)}
                placeholder="manager@venue.ng"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Venue Manager Phone
              </label>
              <input
                type="tel"
                value={venuePhone}
                onChange={(e) => setVenuePhone(e.target.value)}
                placeholder="+234 812 345 6789"
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Live Risk Engine Assessment Score Preview */}
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 dark:bg-brand-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Automated Risk Engine Score: {liveRisk.score}/100 ({liveRisk.level} Risk)
                </p>
                <p className="muted text-[11px] mt-0.5">
                  Submissions with Low Risk (&le; 30) are eligible for fast-track verification once the venue confirms.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Fast-Track Eligible
              </span>
            </div>

            <ul className="mt-2.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              {liveRisk.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Icon name="check_circle" className="text-xs text-brand-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button full size="lg" type="submit">
            Submit for Remote Verification
          </Button>
        </form>
      </Card>
    </div>
  );
}
