import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { convex } from '../../lib/convex';
import { Icon } from '../../design-system/Icon';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  Cover,
  EmptyState,
  SkeletonCard,
} from '../../design-system/ui';
import {
  useActiveCity,
  useAllEvents,
  useAuth,
  usePlanItems,
  useStore,
  mapConvexEvent,
} from '../../store';
import { fmtDate, fmtTime, naira } from '../../lib/format';
import { toast } from '../../lib/fx';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export function SquadList() {
  const { user, isLoading: authLoading } = useAuth();
  const city = useActiveCity();
  const planItems = usePlanItems();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const all = useAllEvents();
  const nav = useNavigate();

  const squads = useQuery(
    api.squads.listMySquads,
    user ? { userId: user._id as any } : 'skip'
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [friends, setFriends] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-0">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Squad Mode
        </h1>
        <EmptyState
          icon="groups"
          title="Sign in to plan with your Squad"
          text="Create shared group shortlists, vote on events with friends, chat live, and split ticket bills transparently."
          action={
            <Link to="/auth?mode=signin&redirect=/squad">
              <Button>Log In to Squad Mode</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const handleOpenCreate = () => {
    if (!user?.emailVerified) {
      setVerifyModalOpen(true);
      toast('Please verify your email before creating a squad.');
      return;
    }
    setSel(planItems.map((p) => p.event.id));
    setOpen(true);
  };

  const handleCreateSquad = async () => {
    if (!user || !name.trim() || sel.length === 0) return;
    setCreating(true);
    try {
      const res = await convex.mutation(api.squads.createSquad, {
        userId: user._id as any,
        name: name.trim(),
        city,
        initialEventIds: sel as any,
        invitedFriends: friends
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      });
      const squadUrl = `${window.location.origin}/squad/${res.squadId}`;
      navigator.clipboard?.writeText?.(squadUrl);
      setOpen(false);
      setName('');
      setFriends('');
      toast(`Squad created (${res.inviteCode})! Invite link copied.`);
      nav(`/squad/${res.squadId}`);
    } catch (err: any) {
      toast(err?.message || 'Unable to create squad.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!user || !inviteCode.trim()) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Verify your email before joining a squad.');
      return;
    }
    setJoining(true);
    try {
      const res = await convex.mutation(api.squads.joinByInviteOrId, {
        userId: user._id as any,
        inviteCode: inviteCode.trim().toUpperCase(),
      });
      setInviteCode('');
      toast('Joined squad!');
      nav(`/squad/${res.squadId}`);
    } catch (err: any) {
      toast(err?.message || 'Squad invite code not found.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Squad Mode
          </h1>
          <p className="muted mt-0.5 text-sm">
            Plan together, vote on events, and split the bill transparently.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Icon name="add" /> New Squad
        </Button>
      </div>

      {/* Join by Invite Code */}
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Have a squad code? (e.g. SQ-8F2K)"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-xs uppercase text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!inviteCode.trim() || joining}
            onClick={handleJoinByCode}
          >
            {joining ? 'Joining...' : 'Join Squad'}
          </Button>
        </div>
      </Card>

      {user && !user.emailVerified && (
        <Card className="mt-4 border-2 border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Icon name="lock" className="text-lg text-amber-600" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Email verification required to create squads and vote on event shortlists.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => setVerifyModalOpen(true)}
            >
              Verify Email
            </Button>
          </div>
        </Card>
      )}

      {squads === undefined ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : squads.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon="groups"
            title="No squads yet"
            text="Create a shared group plan, invite friends by email or invite code, and vote on your weekend lineup."
            action={<Button onClick={handleOpenCreate}>Start a Squad</Button>}
          />
        </Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {squads.map((s: any) => (
            <Link key={s._id} to={`/squad/${s._id}`} className="group block">
              <Card className="flex items-center justify-between gap-4 p-4 transition-all group-hover:border-brand-400">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </h2>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {s.inviteCode}
                    </span>
                  </div>
                  <p className="muted mt-0.5 text-xs">
                    {s.members.length} member{s.members.length === 1 ? '' : 's'} ·{' '}
                    {s.shortlistEventIds.length} shortlisted event
                    {s.shortlistEventIds.length === 1 ? '' : 's'}
                  </p>
                  <div className="mt-3 flex -space-x-2">
                    {s.members.slice(0, 5).map((m: any, idx: number) => (
                      <span
                        key={`${m.name}-${idx}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-50 text-[11px] font-semibold text-brand-600 dark:border-midnight-800 dark:bg-brand-500/20 dark:text-brand-300"
                      >
                        {m.name?.[0]?.toUpperCase() ?? 'M'}
                      </span>
                    ))}
                  </div>
                </div>
                <Icon
                  name="chevron_right"
                  className="text-slate-400 transition-transform group-hover:translate-x-0.5"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Create a Squad">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Squad Name
            </label>
            <input
              aria-label="Squad name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Rooftop Crew"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Invite Friends by Email or Name (optional, comma-separated)
            </label>
            <input
              aria-label="Friends"
              value={friends}
              onChange={(e) => setFriends(e.target.value)}
              placeholder="friend1@email.com, friend2@email.com"
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              Select events to vote on ({sel.length} selected)
            </p>
            {all.length === 0 ? (
              <p className="muted text-xs">
                No published events available yet to shortlist.
              </p>
            ) : (
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto py-1">
                {all.slice(0, 16).map((e) => (
                  <Chip
                    key={e.id}
                    active={sel.includes(e.id)}
                    onClick={() =>
                      setSel((p) =>
                        p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]
                      )
                    }
                  >
                    {e.title}
                  </Chip>
                ))}
              </div>
            )}
          </div>
          <Button
            full
            disabled={sel.length < 1 || !name.trim() || creating}
            onClick={handleCreateSquad}
          >
            {creating ? 'Creating...' : 'Create Squad'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export function SquadDetail() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const addToCart = useStore((s) => s.addToCart);
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const all = useAllEvents();
  const nav = useNavigate();

  const squad = useQuery(
    api.squads.getSquadDetail,
    id ? { squadId: id as any } : 'skip'
  );

  const [newName, setNewName] = useState('');
  const [chatText, setChatText] = useState('');
  const [addEventOpen, setAddEventOpen] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon="groups"
          title="Sign in to view & join this Squad"
          text="Log in so your votes and chat messages are linked to your verified profile."
          action={
            <Link to={`/auth?mode=signin&redirect=${encodeURIComponent(`/squad/${id}`)}`}>
              <Button>Log In to Join Squad</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (squad === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 md:px-0">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!squad) {
    return (
      <EmptyState
        icon="groups"
        title="Squad not found"
        action={<Button onClick={() => nav('/squad')}>Back to Squads</Button>}
      />
    );
  }

  const isMember = Boolean(
    user &&
      squad.members.some(
        (m: any) =>
          (m.userId && String(m.userId) === String(user._id)) ||
          (m.email && m.email.toLowerCase() === user.email.toLowerCase())
      )
  );

  const handleJoinThisSquad = async () => {
    if (!user) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Verify your email to join this squad.');
      return;
    }
    try {
      await convex.mutation(api.squads.joinByInviteOrId, {
        userId: user._id as any,
        squadId: squad._id,
      });
      toast(`Joined ${squad.name}!`);
    } catch (err: any) {
      toast(err?.message || 'Unable to join squad.');
    }
  };

  const handleVote = async (eventId: string, dir: 'up' | 'down') => {
    if (!user) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Verify your email address to cast votes in squads.');
      return;
    }
    try {
      await convex.mutation(api.squads.vote, {
        squadId: squad._id,
        eventId: eventId as any,
        userId: user._id as any,
        vote: dir,
      });
    } catch (err: any) {
      toast(err?.message || 'Could not record vote.');
    }
  };

  const handleInvite = async () => {
    if (!user || !newName.trim()) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      return;
    }
    try {
      const res = await convex.mutation(api.squads.inviteMember, {
        squadId: squad._id,
        userId: user._id as any,
        friendEmailOrName: newName.trim(),
      });
      setNewName('');
      toast(`Added ${res.addedName} to squad`);
    } catch (err: any) {
      toast(err?.message || 'Unable to invite friend.');
    }
  };

  const sendChat = async () => {
    if (!user || !chatText.trim()) return;
    if (!user.emailVerified) {
      setVerifyModalOpen(true);
      toast('Verify your email to post in Squad chat.');
      return;
    }
    try {
      const text = chatText.trim();
      setChatText('');
      await convex.mutation(api.squads.sendMessage, {
        squadId: squad._id,
        userId: user._id as any,
        text,
      });
    } catch (err: any) {
      toast(err?.message || 'Unable to send message.');
    }
  };

  const cycleMyArrival = async () => {
    if (!user) return;
    try {
      const res = await convex.mutation(api.squads.cycleArrivalStatus, {
        squadId: squad._id,
        userId: user._id as any,
      });
      toast(`Your status updated to: ${res.arrivalStatus}`);
    } catch (err: any) {
      toast(err?.message || 'Unable to update status.');
    }
  };

  const evs: import('../../types').CEvent[] = (squad.events ?? []).map(mapConvexEvent);
  const votes = squad.votes ?? [];
  const messages = squad.messages ?? [];

  const upCount = (eid: string) =>
    votes.filter((v: any) => String(v.eventId) === eid && v.vote === 'up').length;
  const myVote = (eid: string): 'up' | 'down' | null => {
    if (!user) return null;
    const found = votes.find(
      (v: any) =>
        String(v.eventId) === eid &&
        ((v.voterUserId && String(v.voterUserId) === user._id) ||
          v.voterName === user.name)
    );
    return found ? found.vote : null;
  };

  const winners = evs.filter((e) => upCount(e.id) > squad.members.length / 2);
  const total = winners.reduce(
    (s, e) => s + (e.tiers.length ? Math.min(...e.tiers.map((t) => t.price)) : 0),
    0
  );
  const perHead = squad.members.length ? Math.ceil(total / squad.members.length) : 0;
  const shareUrl = `${window.location.origin}/squad/${squad._id}`;

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {squad.name}
            </h1>
            <Badge tone="brand">Code: {squad.inviteCode}</Badge>
          </div>
          <p className="muted mt-0.5 text-xs">
            Signed in as <b className="text-slate-900 dark:text-slate-100">{user?.name}</b> ·{' '}
            {squad.members.length} squad member{squad.members.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isMember && (
            <Button size="sm" onClick={handleJoinThisSquad}>
              <Icon name="group_add" className="text-sm" /> Join Squad
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setAddEventOpen(true)}>
            <Icon name="add" className="text-sm" /> Shortlist Event
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Join our group plan "${squad.name}" on COORDINA (Code: ${squad.inviteCode})!\nVote on events & split tickets:\n${shareUrl}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <Icon name="chat" className="text-sm" /> Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Members & Invite */}
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {squad.members.map((m: any, idx: number) => {
            const isMe =
              (m.userId && String(m.userId) === user?._id) ||
              (m.email && m.email.toLowerCase() === user?.email.toLowerCase());
            return (
              <span
                key={`${m.name}-${idx}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  isMe
                    ? 'border-brand-500/40 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200'
                }`}
              >
                <Icon name="person" className="text-sm" />
                <span>{m.name}</span>
                {m.isHost && (
                  <span className="text-[10px] font-bold text-brand-500">HOST</span>
                )}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Invite friend"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Invite friend by COORDINA email or name"
            className={inputCls}
          />
          <Button variant="outline" disabled={!newName.trim()} onClick={handleInvite}>
            Invite
          </Button>
        </div>
      </Card>

      {/* Shortlisted Events Voting */}
      <div className="mt-5 space-y-3">
        {evs.map((e) => {
          const v = myVote(e.id);
          const y = upCount(e.id);
          const winning = y > squad.members.length / 2;
          return (
            <Card key={e.id} className="p-4">
              <div className="flex gap-3.5">
                <Link to={`/event/${e.id}`} className="shrink-0">
                  <Cover
                    gradient={e.image}
                    category={e.category}
                    label={e.title}
                    className="h-20 w-24 rounded-xl"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/event/${e.id}`}
                        className="block truncate text-base font-semibold text-slate-900 hover:text-brand-500 dark:text-slate-100"
                      >
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
                        style={{
                          width: `${Math.min(
                            100,
                            (y / Math.max(1, squad.members.length)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="muted shrink-0 text-xs">
                      {y}/{squad.members.length} in
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={v === 'up' ? 'primary' : 'outline'}
                      onClick={() => handleVote(e.id, 'up')}
                    >
                      <Icon name="thumb_up" className="text-sm" /> I am in
                    </Button>
                    <Button
                      size="sm"
                      variant={v === 'down' ? 'coral' : 'outline'}
                      onClick={() => handleVote(e.id, 'down')}
                    >
                      <Icon name="thumb_down" className="text-sm" /> Pass
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Member Arrival Presence Status (Strictly Own Status Toggle) */}
      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live Arrival Presence
          </h3>
          {isMember && (
            <button
              type="button"
              onClick={cycleMyArrival}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Update My Arrival Status
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {squad.members.map((m: any, idx: number) => {
            const isMe =
              (m.userId && String(m.userId) === user?._id) ||
              (m.email && m.email.toLowerCase() === user?.email.toLowerCase());
            return (
              <div
                key={`${m.name}-${idx}`}
                onClick={isMe ? cycleMyArrival : undefined}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs ${
                  isMe
                    ? 'cursor-pointer border-brand-400/50 bg-brand-50/50 hover:border-brand-500 dark:bg-brand-500/10'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-midnight-900'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {m.name} {isMe ? '(You)' : ''}
                  </p>
                  <p className="text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    {m.arrivalStatus || 'Ready'}
                  </p>
                </div>
                {isMe && <Icon name="swap_horiz" className="text-xs text-brand-500" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Real-Time Convex Squad Chat */}
      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Icon name="forum" className="text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Squad Chat
            </h3>
          </div>
          <span className="muted text-xs">{messages.length} messages</span>
        </div>

        <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((msg: any) => {
            const mine = String(msg.senderUserId) === user?._id;
            return (
              <div
                key={msg._id}
                className={`flex flex-col text-xs ${mine ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {msg.senderName}
                  </span>
                  <span>
                    •{' '}
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`mt-1 max-w-[85%] rounded-2xl px-3.5 py-2 ${
                    mine
                      ? 'rounded-tr-xs bg-brand-600 text-white'
                      : 'rounded-tl-xs bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            aria-label="Message"
            placeholder={`Message as ${user?.name ?? 'member'}...`}
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

      {/* Split the Cost */}
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Split the Cost
          </h2>
          <Badge tone="brand">{squad.members.length} members</Badge>
        </div>
        {winners.length === 0 ? (
          <p className="muted mt-2 text-sm">
            Events with more than 50% squad approval appear here automatically.
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {winners.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-slate-700 dark:text-slate-300"
              >
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md dark:border-slate-800 dark:bg-midnight-900/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="hidden sm:block">
            <p className="muted text-xs">{winners.length} winning event(s)</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {naira(perHead)} / person
            </p>
          </div>
          <Button
            full
            className="sm:w-auto sm:min-w-[260px]"
            disabled={winners.length === 0}
            onClick={async () => {
              for (const e of winners) {
                if (e.tiers[0]) {
                  await addToCart({ eventId: e.id, tierId: e.tiers[0].id, qty: 1 });
                }
              }
              toast('Winning events added to your plan');
              nav('/plan');
            }}
          >
            Add winning events to my plan
          </Button>
        </div>
      </div>

      {/* Add Another Event Sheet */}
      <BottomSheet
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        title="Shortlist Event for Squad"
      >
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {all
            .filter((e) => !evs.some((x) => x.id === e.id))
            .map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={async () => {
                  if (!user) return;
                  try {
                    await convex.mutation(api.squads.addEvent, {
                      squadId: squad._id,
                      userId: user._id as any,
                      eventId: e.id as any,
                    });
                    setAddEventOpen(false);
                    toast(`Added ${e.title} to shortlist`);
                  } catch (err: any) {
                    toast(err?.message || 'Unable to add event');
                  }
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] p-3 text-left text-xs hover:border-brand-500"
              >
                <span className="truncate font-semibold text-slate-900 dark:text-white">
                  {e.title}
                </span>
                <span className="muted shrink-0 pl-2">{e.area}</span>
              </button>
            ))}
        </div>
      </BottomSheet>
    </div>
  );
}
