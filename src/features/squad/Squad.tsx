import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Badge, BottomSheet, Button, Card, Chip, Cover, EmptyState } from '../../design-system/ui';
import { useAllEvents, useStore } from '../../store';
import { fmtDate, fmtTime, naira } from '../../lib/format';
import { toast } from '../../lib/fx';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export function SquadList() {
  const squads = useStore((s) => s.squads);
  const cart = useStore((s) => s.cart);
  const create = useStore((s) => s.createSquad);
  const all = useAllEvents();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Weekend Squad');
  const [sel, setSel] = useState<string[]>(cart.map((c) => c.eventId));
  const [friends, setFriends] = useState('Ada, Tunde, Zainab');

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Squad Mode</h1>
          <p className="muted mt-0.5 text-sm">Plan together, vote on events, and split the bill transparently.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Icon name="add" /> New Squad
        </Button>
      </div>

      {squads.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon="groups"
            title="No squads yet"
            text="Create a shared group plan, invite friends to vote on events, and see everyone's split in Naira."
            action={<Button onClick={() => setOpen(true)}>Start a Squad</Button>}
          />
        </Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {squads.map((s) => (
            <Link key={s.id} to={`/squad/${s.id}`} className="group block">
              <Card className="flex items-center justify-between gap-4 p-4 transition-all group-hover:border-brand-400">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{s.name}</h2>
                  <p className="muted mt-0.5 text-xs">
                    {s.members.length} members · {s.eventIds.length} shortlisted events
                  </p>
                  <div className="mt-3 flex -space-x-2">
                    {s.members.slice(0, 5).map((m) => (
                      <span
                        key={m.name}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-50 text-[11px] font-semibold text-brand-600 dark:border-midnight-800 dark:bg-brand-500/20 dark:text-brand-300"
                      >
                        {m.name[0]?.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <Icon name="chevron_right" className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Create a Squad">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Squad Name</label>
            <input aria-label="Squad name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Friends (comma separated)</label>
            <input
              aria-label="Friends"
              value={friends}
              onChange={(e) => setFriends(e.target.value)}
              placeholder="Ada, Tunde, Zainab"
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              Select events to vote on ({sel.length} selected)
            </p>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto py-1">
              {all.slice(0, 14).map((e) => (
                <Chip
                  key={e.id}
                  active={sel.includes(e.id)}
                  onClick={() => setSel((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                >
                  {e.title}
                </Chip>
              ))}
            </div>
          </div>
          <Button
            full
            disabled={sel.length < 1 || !name.trim()}
            onClick={() => {
              const id = create(
                name.trim(),
                sel,
                friends
                  .split(',')
                  .map((f) => f.trim())
                  .filter(Boolean),
              );
              setOpen(false);
              toast('Invite link copied. Share it on WhatsApp');
              nav(`/squad/${id}`);
            }}
          >
            Create Squad
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export function SquadDetail() {
  const { id } = useParams();
  const squad = useStore((s) => s.squads.find((q) => q.id === id));
  const vote = useStore((s) => s.vote);
  const addToCart = useStore((s) => s.addToCart);
  const addMember = useStore((s) => s.addMember);
  const all = useAllEvents();
  const nav = useNavigate();
  const [as, setAs] = useState('You');
  const [newName, setNewName] = useState('');

  if (!squad) {
    return <EmptyState icon="groups" title="Squad not found" action={<Button onClick={() => nav('/squad')}>Back to Squads</Button>} />;
  }

  const evs = squad.eventIds.flatMap((i) => all.find((e) => e.id === i) ?? []);
  const yes = (eid: string) => squad.members.filter((m) => m.votes[eid] === true).length;
  const winners = evs.filter((e) => yes(e.id) > squad.members.length / 2);
  const total = winners.reduce((s, e) => s + Math.min(...e.tiers.map((t) => t.price)), 0);
  const perHead = squad.members.length ? Math.ceil(total / squad.members.length) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 md:px-0">
      <button
        type="button"
        onClick={() => nav('/squad')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <Icon name="arrow_back" className="text-lg" /> All Squads
      </button>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{squad.name}</h1>
          <p className="muted mt-0.5 text-xs">
            Voting as <b className="text-slate-900 dark:text-slate-100">{as}</b> · tap a member chip below to preview their vote.
          </p>
        </div>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {squad.members.map((m) => (
            <Chip key={m.name} active={as === m.name} onClick={() => setAs(m.name)}>
              <Icon name="person" className="text-sm" /> {m.name}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Invite name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Invite another friend by name"
            className={inputCls}
          />
          <Button
            variant="outline"
            disabled={!newName.trim()}
            onClick={() => {
              addMember(squad.id, newName.trim());
              setNewName('');
            }}
          >
            Invite
          </Button>
        </div>
      </Card>

      <div className="mt-5 space-y-3">
        {evs.map((e) => {
          const me = squad.members.find((m) => m.name === as) ?? squad.members[0];
          const v = me?.votes[e.id];
          const y = yes(e.id);
          const winning = y > squad.members.length / 2;
          return (
            <Card key={e.id} className="p-4">
              <div className="flex gap-3.5">
                <Link to={`/event/${e.id}`} className="shrink-0">
                  <Cover gradient={e.image} category={e.category} label={e.title} className="h-20 w-24 rounded-xl" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/event/${e.id}`} className="block truncate text-base font-semibold text-slate-900 hover:text-brand-500 dark:text-slate-100">
                        {e.title}
                      </Link>
                      <p className="muted mt-0.5 text-xs">
                        {fmtDate(e.start)} · {fmtTime(e.start)} · {e.area}
                      </p>
                    </div>
                    {winning && <Badge tone="neon">Majority Pick</Badge>}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${(y / squad.members.length) * 100}%` }}
                      />
                    </div>
                    <span className="muted shrink-0 text-xs">
                      {y}/{squad.members.length} in
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={v === true ? 'primary' : 'outline'} onClick={() => vote(squad.id, as, e.id, true)}>
                      <Icon name="thumb_up" className="text-sm" /> I am in
                    </Button>
                    <Button size="sm" variant={v === false ? 'coral' : 'outline'} onClick={() => vote(squad.id, as, e.id, false)}>
                      <Icon name="thumb_down" className="text-sm" /> Pass
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Split the Cost</h2>
          <Badge tone="brand">{squad.members.length} members</Badge>
        </div>
        {winners.length === 0 ? (
          <p className="muted mt-2 text-sm">Events with more than 50% approval appear here automatically.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {winners.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="truncate pr-3">{e.title}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {naira(Math.min(...e.tiers.map((t) => t.price)))}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
              <span>Each person pays</span>
              <span className="text-brand-600 dark:text-brand-400">{naira(perHead)}</span>
            </div>
          </div>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md dark:border-slate-800 dark:bg-midnight-900/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="hidden sm:block">
            <p className="muted text-xs">{winners.length} winning event(s)</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{naira(perHead)} / person</p>
          </div>
          <Button
            full
            className="sm:w-auto sm:min-w-[260px]"
            disabled={winners.length === 0}
            onClick={() => {
              winners.forEach((e) => addToCart({ eventId: e.id, tierId: e.tiers[0].id, qty: 1 }));
              toast('Winning events added to your plan');
              nav('/plan');
            }}
          >
            Add winning events to my plan
          </Button>
        </div>
      </div>
    </div>
  );
}
