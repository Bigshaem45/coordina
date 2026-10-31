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
  const user = useStore((s) => s.user);
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
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
        <Button
          size="sm"
          onClick={() => {
            if (user && !user.emailVerified) {
              setVerifyModalOpen(true);
              toast('Please verify your email before creating a squad.');
              return;
            }
            setOpen(true);
          }}
        >
          <Icon name="add" /> New Squad
        </Button>
      </div>

      {user && !user.emailVerified && (
        <Card className="mt-4 border-2 border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Icon name="lock" className="text-amber-600 text-lg" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Email verification required to create squads and vote on event shortlists.
              </p>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setVerifyModalOpen(true)}>
              Verify Email
            </Button>
          </div>
        </Card>
      )}

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
              const squadUrl = `https://coordina-beta.vercel.app/squad/${id}`;
              navigator.clipboard?.writeText?.(squadUrl);
              setOpen(false);
              toast('Squad invite link copied! Share it on WhatsApp');
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
  const user = useStore((s) => s.user);
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const all = useAllEvents();
  const nav = useNavigate();
  const [as, setAs] = useState('You');
  const [newName, setNewName] = useState('');

  const handleVote = (eventId: string, yes: boolean) => {
    if (user && !user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Please verify your email address to cast votes in squads.');
      return;
    }
    if (squad) vote(squad.id, as, eventId, yes);
  };

  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    { id: '1', sender: 'Host', text: 'Hey squad! Vote on your top pick for Saturday so we can lock tickets.', time: '14:20' },
    { id: '2', sender: 'Ada', text: 'Rooftop Afro-Fusion looks super lit! Upvoted 🔥', time: '14:28' },
  ]);
  const [chatText, setChatText] = useState('');
  const [statuses, setStatuses] = useState<Record<string, string>>({
    You: 'Ready',
    Ada: 'On the way 🚗',
    Tunde: 'At venue 📍',
  });

  const sendChat = () => {
    if (!chatText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: String(Date.now()), sender: as, text: chatText.trim(), time: now }]);
    setChatText('');
  };

  const toggleStatus = (member: string) => {
    const list = ['Ready', 'On the way 🚗', 'At venue 📍', 'Delayed 🚦'];
    const curr = statuses[member] || 'Ready';
    const next = list[(list.indexOf(curr) + 1) % list.length];
    setStatuses((prev) => ({ ...prev, [member]: next }));
    toast(`${member} is now ${next}`);
  };

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
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Join our group plan for "${squad.name}" on COORDINA!\nVote on events & split tickets:\n👉 https://coordina-beta.vercel.app/squad/${squad.id}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          <Icon name="chat" className="text-sm" /> Invite via WhatsApp
        </a>
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
                    <Button size="sm" variant={v === true ? 'primary' : 'outline'} onClick={() => handleVote(e.id, true)}>
                      <Icon name="thumb_up" className="text-sm" /> I am in
                    </Button>
                    <Button size="sm" variant={v === false ? 'coral' : 'outline'} onClick={() => handleVote(e.id, false)}>
                      <Icon name="thumb_down" className="text-sm" /> Pass
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Member Arrival Presence Status */}
      <Card className="mt-5 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Squad Arrival Presence</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {squad.members.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => toggleStatus(m.name)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left text-xs transition hover:border-brand-400 dark:border-slate-800 dark:bg-midnight-900"
              title="Click to cycle status"
            >
              <div className="min-w-0 pr-1">
                <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{m.name}</p>
                <p className="text-[11px] font-medium text-brand-600 dark:text-brand-400">{statuses[m.name] || 'Ready'}</p>
              </div>
              <Icon name="swap_horiz" className="text-xs text-slate-400" />
            </button>
          ))}
        </div>
      </Card>

      {/* Squad Live Discussion Thread */}
      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Icon name="forum" className="text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Squad Chat</h3>
          </div>
          <span className="muted text-xs">{messages.length} notes</span>
        </div>

        <div className="mt-3 max-h-48 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs ${msg.sender === as ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{msg.sender}</span>
                <span>• {msg.time}</span>
              </div>
              <div
                className={`mt-1 max-w-[85%] rounded-2xl px-3.5 py-2 ${
                  msg.sender === as
                    ? 'bg-brand-600 text-white rounded-tr-xs'
                    : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            aria-label="Message"
            placeholder={`Drop a message as ${as}...`}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            className={inputCls}
          />
          <Button size="sm" disabled={!chatText.trim()} onClick={sendChat}>
            <Icon name="send" />
          </Button>
        </div>
      </Card>

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
