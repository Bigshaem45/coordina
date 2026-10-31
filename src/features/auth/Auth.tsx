import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { Icon } from '../../design-system/Icon';
import { useStore } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, onboarded, signIn, signUp, socialSignIn, signOut } = useStore();
  const nav = useNavigate();

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const valid = mode === 'forgot' ? emailOk : emailOk && password.length >= 6 && (mode === 'signin' || name.trim().length > 1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'forgot') return setInfo(`If an account exists for ${email}, a reset link is on its way.`);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await convex.mutation(api.auth.signUp, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'attendee',
        });
      } else {
        await convex.mutation(api.auth.signIn, {
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
        });
      }
      const err = mode === 'signin' ? signIn(email, password) : signUp(name.trim(), email, password);
      if (err) {
        setError(err);
      } else {
        nav(onboarded ? '/home' : '/onboarding');
      }
    } catch (err: any) {
      console.warn('Convex auth sync:', err);
      const localErr = mode === 'signin' ? signIn(email, password) : signUp(name.trim(), email, password);
      if (localErr) setError(localErr);
      else nav(onboarded ? '/home' : '/onboarding');
    } finally {
      setBusy(false);
    }
  };

  const handleSocial = async (provider: string) => {
    const providerEmail = `user@${provider.toLowerCase()}.coordina.app`;
    try {
      await convex.mutation(api.auth.signIn, {
        name: `${provider} Guest`,
        email: providerEmail,
      });
    } catch (e) {
      console.warn('Convex social auth sync:', e);
    }
    socialSignIn(provider);
    nav(onboarded ? '/home' : '/onboarding');
  };

  const inputWrap = 'relative flex items-center';
  const inputCls =
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100';

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--bg)] text-[var(--text)] md:grid md:grid-cols-12">
      {/* Editorial Photo Side (Desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white md:col-span-6 md:flex lg:col-span-7">
        <img
          src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85"
          alt="Concert atmosphere"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/40" />

        <Link to="/" className="relative z-10 w-fit" aria-label="COORDINA home">
          <Logo size={34} tone="light" />
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-white">
            A place for unforgettable nights &amp; curated spaces.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Discover verified venues, build a clash-free itinerary, and store all your tickets in one minimalist wallet.
          </p>
        </div>
      </div>

      {/* Mobile Top Photo Banner + Clean Form */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-10 md:col-span-6 lg:col-span-5 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" aria-label="COORDINA home">
              <Logo size={30} />
            </Link>
            <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">
              Back
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Hey! Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </h1>
          <p className="muted mt-1 text-sm">
            {mode === 'signin'
              ? 'Sign in to access your saved plan and tickets.'
              : mode === 'signup'
                ? 'Join COORDINA to discover events near you.'
                : 'Enter your email and we will send a recovery link.'}
          </p>

          {user && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/80 p-3.5 text-xs dark:border-brand-900/60 dark:bg-brand-950/40">
              <div className="min-w-0">
                <p className="font-semibold text-brand-950 dark:text-brand-200">Signed in as {user.name}</p>
                <p className="muted truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/home">
                  <Button size="sm">Go to App</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => signOut()}>
                  Sign out
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate>
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full name
                </label>
                <div className={inputWrap}>
                  <Icon name="person" className="pointer-events-none absolute left-3.5 text-slate-400" />
                  <input
                    id="name"
                    autoComplete="name"
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Okafor"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className={inputWrap}>
                <Icon name="mail" className="pointer-events-none absolute left-3.5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@coordina.ng"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="pw" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-500 hover:underline"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className={inputWrap}>
                  <Icon name="lock" className="pointer-events-none absolute left-3.5 text-slate-400" />
                  <input
                    id="pw"
                    type={show ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className={`${inputCls} pr-16`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-coral-400/30 bg-coral-50 p-3 text-xs font-medium text-coral-600 dark:bg-coral-500/10 dark:text-coral-400">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-xl border border-neon-400/30 bg-neon-50 p-3 text-xs font-medium text-neon-700 dark:bg-neon-500/10 dark:text-neon-400">
                {info}
              </p>
            )}

            <Button full size="lg" type="submit" disabled={!valid || busy} className="mt-2">
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="muted my-6 flex items-center gap-3 text-xs">
                <hr className="flex-1 border-[var(--border)]" />
                <span>Or continue with</span>
                <hr className="flex-1 border-[var(--border)]" />
              </div>

              <div className="space-y-2.5">
                  <Button
                    full
                    variant="outline"
                    type="button"
                    onClick={() => handleSocial('Apple')}
                  >
                    <Icon name="phone_iphone" className="text-base" /> Continue with Apple
                  </Button>
                    <Button
                      full
                      variant="outline"
                      type="button"
                      onClick={() => handleSocial('Google')}
                    >
                      <Icon name="public" className="text-base text-brand-500" /> Continue with Google
                    </Button>
                  </div>
                </>
          )}

                <p className="muted mt-6 text-center text-sm">
                  {mode === 'signin' ? (
                    <>
                      Don’t have an account?{' '}
                      <button
                        type="button"
                        className="font-semibold text-brand-500 hover:underline"
                        onClick={() => {
                          setMode('signup');
                          setError(null);
                        }}
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="font-semibold text-brand-500 hover:underline"
                        onClick={() => {
                          setMode('signin');
                          setError(null);
                          setInfo(null);
                        }}
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
        </div>
        );
}
