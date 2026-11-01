import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Button, Chip, Skeleton } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { CATEGORIES, CATEGORY_PHOTO } from '../../lib/constants';
import { useAuth } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { toast } from '../../lib/fx';
import type { Category, City, Vibe } from '../../types';

const VIBES: Vibe[] = ['Chill', 'Energetic', 'Classy', 'Family', 'Creative'];
const PRESETS = [25000, 50000, 100000, 200000];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<City>('Lagos');
  const [interests, setInterests] = useState<Category[]>(['Concerts', 'Food']);
  const [budget, setBudget] = useState(50000);
  const [vibe, setVibe] = useState<Vibe>('Energetic');
  const [saving, setSaving] = useState(false);

  const nav = useNavigate();
  const { user, isLoading, sessionUserId } = useAuth();

  useEffect(() => {
    if (!isLoading && !sessionUserId) {
      nav('/auth', { replace: true });
    }
  }, [isLoading, sessionUserId, nav]);

  useEffect(() => {
    if (user) {
      setCity(user.city || 'Lagos');
      if (user.interests.length > 0) setInterests(user.interests);
      if (user.budget) setBudget(user.budget);
      if (user.vibe) setVibe(user.vibe);
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-6 py-12">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const complete = async () => {
    setSaving(true);
    try {
      await convex.mutation(api.auth.finishOnboarding, {
        userId: user._id as any,
        city,
        interests,
        budget,
        vibe,
      });
      if (user.role === 'organiser') nav('/organiser', { replace: true });
      else if (user.role === 'venue_manager') nav('/venue-portal', { replace: true });
      else nav('/home', { replace: true });
    } catch (err: any) {
      toast(err?.message || 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < 2) return setStep(step + 1);
    complete();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[var(--bg)] px-6 py-8 text-[var(--text)]">
      <div className="mb-8 flex items-center justify-between">
        <Logo size={26} />
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={3}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-7 bg-brand-500'
                  : i < step
                  ? 'w-3 bg-brand-300'
                  : 'w-3 bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={complete}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          Skip
        </button>
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Choose your city &amp; interests
            </h1>
            <p className="muted mt-1 text-sm">
              Select your favourite scenes so we can tailor your discovery feed.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {(['Lagos', 'Abuja'] as City[]).map((c) => {
                const active = city === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    aria-pressed={active}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-midnight-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="location_on" className={active ? 'text-brand-500' : 'text-slate-400'} />
                      {c}
                    </span>
                    {active && <Icon name="check_circle" filled className="text-brand-500" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => {
                const active = interests.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setInterests((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
                    }
                    aria-pressed={active}
                    className={`group relative h-28 overflow-hidden rounded-2xl border-2 text-left transition ${
                      active ? 'border-brand-500 ring-2 ring-brand-500/25' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={CATEGORY_PHOTO[c]}
                      alt={c}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                    <span className="absolute bottom-2.5 left-3 text-sm font-semibold text-white">
                      {c}
                    </span>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm">
                        <Icon name="check" className="text-sm" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set a weekend budget</h1>
            <p className="muted mt-1 text-sm">
              We will gently flag if your multi-event plan exceeds this limit.
            </p>

            <div className="surface mt-6 rounded-2xl p-6 text-center">
              <p className="muted text-xs uppercase tracking-wider">Target Plan Limit</p>
              <p className="mt-2 text-4xl font-bold text-brand-500">₦{budget.toLocaleString()}</p>
              <input
                aria-label="Budget"
                type="range"
                min={5000}
                max={300000}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(+e.target.value)}
                className="mt-6 h-2 w-full cursor-pointer accent-[#4F46E5]"
              />
              <div className="muted mt-2 flex justify-between text-xs">
                <span>₦5,000</span>
                <span>₦300,000</span>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <Chip key={p} active={budget === p} onClick={() => setBudget(p)}>
                    ₦{(p / 1000).toFixed(0)}k
                  </Chip>
                ))}
              </div>
            </div>

            <h2 className="mt-7 text-base font-semibold text-slate-900 dark:text-white">Preferred mood</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <Chip key={v} active={vibe === v} onClick={() => setVibe(v)}>
                  {v}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80"
                alt="Friends at an evening social space"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-xs font-medium text-brand-200">Squad Planning</p>
                <p className="text-lg font-bold">Plan nights out together</p>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              You’re ready for {city}
            </h1>
            <p className="muted mt-1.5 text-sm leading-relaxed">
              Add events to your Plan Cart to detect travel or schedule conflicts automatically, or start a Squad room anytime to vote with friends.
            </p>

            <div className="surface mt-5 space-y-2.5 rounded-2xl p-4 text-sm">
              <div className="flex justify-between">
                <span className="muted">City</span>
                <span className="font-medium">{city}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Interests</span>
                <span className="font-medium">
                  {interests.length ? interests.join(', ') : 'All categories'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Plan budget</span>
                <span className="font-medium">₦{budget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button full size="lg" onClick={next} disabled={saving}>
          {saving ? 'Saving…' : step === 2 ? 'Finish & Explore' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
