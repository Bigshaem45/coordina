import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { Icon } from '../../design-system/Icon';
import { useStore, useAuth, useActiveCity, type UserRole } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationOtpEmail,
} from '../../lib/email';
import { toast } from '../../lib/fx';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset' | 'verify';
type SignupRole = 'attendee' | 'organiser' | 'venue_manager';

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = (params.get('mode') as AuthMode) || 'signin';
  const paramEmail = params.get('email') || '';
  const paramCode = params.get('code') || '';
  const parseRoleParam = (r: string | null): SignupRole => {
    if (r === 'organiser' || r === 'organizer') return 'organiser';
    if (r === 'venue_manager' || r === 'venue') return 'venue_manager';
    return 'attendee';
  };

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<SignupRole>(() => parseRoleParam(params.get('role')));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(paramEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(paramCode);
  const redirectUrl = params.get('redirect');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { user } = useAuth();
  const activeCity = useActiveCity();
  const setSessionUserId = useStore((s) => s.setSessionUserId);
  const signOut = useStore((s) => s.signOut);
  const nav = useNavigate();

  const navigateAfterAuth = (activeRole: UserRole, onboarded?: boolean) => {
    if (redirectUrl) {
      nav(redirectUrl);
      return;
    }
    if (activeRole === 'admin') {
      nav('/admin');
    } else if (activeRole === 'organiser') {
      nav('/organiser');
    } else if (activeRole === 'venue_manager') {
      nav('/venue-portal');
    } else {
      nav(onboarded ? '/home' : '/onboarding');
    }
  };

  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramCode && !verificationCode) setVerificationCode(paramCode);
    if (params.get('mode')) setMode(params.get('mode') as AuthMode);
    if (params.get('role')) setRole(parseRoleParam(params.get('role')));
  }, [params]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const emailOk = /^\S+@\S+\.\S+$/.test(email);

  const isFormValid = () => {
    if (mode === 'forgot') return emailOk;
    if (mode === 'verify') return emailOk && verificationCode.trim().length >= 6;
    if (mode === 'reset')
      return (
        emailOk &&
        verificationCode.trim().length >= 6 &&
        password.length >= 6 &&
        password === confirmPassword
      );
    if (mode === 'signin') return emailOk && password.length >= 6;
    if (mode === 'signup') return emailOk && password.length >= 6 && name.trim().length >= 2;
    return false;
  };

  const handleResendVerification = async () => {
    if (!emailOk || resendCooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await convex.mutation(api.auth.requestEmailVerification, {
        email: email.trim().toLowerCase(),
      });
      const mailRes = await sendEmailVerificationOtpEmail(res.email, res.name, res.code);
      setResendCooldown(45);
      if (mailRes.success) {
        setInfo(`A fresh 6-digit verification code was sent to ${res.email}.`);
        toast('Verification code sent to your email.');
      } else {
        setError(mailRes.error || 'Could not deliver email. Verify SENDGRID_API_KEY in Vercel.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate verification code.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'forgot') {
      setBusy(true);
      try {
        const resetRes = await convex.mutation(api.auth.requestPasswordReset, {
          email: cleanEmail,
        });
        await sendPasswordResetEmail(resetRes.email, resetRes.name, resetRes.code);
        setInfo(
          `A 6-digit password reset code has been sent to ${cleanEmail}. Enter it below with your new password.`
        );
        setMode('reset');
      } catch (err: any) {
        setError(err?.message || 'Could not request password reset.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setBusy(true);
      try {
        const res = await convex.mutation(api.auth.resetPassword, {
          email: cleanEmail,
          code: verificationCode.trim(),
          newPassword: password,
        });
        setSessionUserId(String(res.userId));
        toast('Password updated! You are now signed in.');
        navigateAfterAuth(res.role as UserRole, true);
      } catch (err: any) {
        setError(err?.message || 'Invalid or expired reset code.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'verify') {
      setBusy(true);
      try {
        const res = await convex.mutation(api.auth.verifyEmail, {
          email: cleanEmail,
          code: verificationCode.trim(),
        });
        setSessionUserId(String(res.userId));
        toast('Email verified! Welcome to COORDINA.');
        navigateAfterAuth(res.role as UserRole, res.onboarded);
      } catch (err: any) {
        setError(err?.message || 'Invalid verification code.');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await convex.mutation(api.auth.signUp, {
          name: name.trim(),
          email: cleanEmail,
          password,
          phone: phone.trim() || undefined,
          role,
          city: activeCity,
        });

        setSessionUserId(String(res.userId));

        sendWelcomeEmail(res.email, res.name);
        await sendEmailVerificationOtpEmail(res.email, res.name, res.verificationCode);

        toast('Account created! Check your email for your 6-digit verification PIN.');
        setInfo(
          `We sent a 6-digit verification code to ${cleanEmail}. Verify now to unlock ticket purchases, squad voting, and event publishing.`
        );
        setMode('verify');
        return;
      }

      // SIGN IN
      const res = await convex.mutation(api.auth.signIn, {
        email: cleanEmail,
        password,
      });

      setSessionUserId(String(res.userId));
      toast(`Welcome back, ${res.name}!`);
      navigateAfterAuth(res.role as UserRole, res.onboarded);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  };

  const inputWrap = 'relative flex items-center';
  const inputCls =
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100';

  const roleLabel = (r: string) => {
    if (r === 'organiser') return 'Event Planner';
    if (r === 'venue_manager') return 'Venue Manager';
    if (r === 'admin') return 'Compliance Admin';
    return 'Attendee';
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[var(--bg)] text-[var(--text)] md:grid md:grid-cols-12">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
            <Icon name="verified_user" className="text-emerald-400" />
            <span>Secure Nigerian Identity &amp; Escrow</span>
          </div>
          <h2 className="mt-4 text-4xl font-bold leading-tight text-white">
            A place for unforgettable nights &amp; verified spaces.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Discover verified venues, build clash-free weekend itineraries, and access cryptographically secure offline tickets across Abuja and Lagos.
          </p>
        </div>
      </div>

      {/* Auth Content & Form */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-10 md:col-span-6 lg:col-span-5 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" aria-label="COORDINA home">
              <Logo size={30} />
            </Link>
            <Link to="/home" className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">
              Explore Feed
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Create new password'}
            {mode === 'verify' && 'Verify your email'}
          </h1>
          <p className="muted mt-1 text-sm">
            {mode === 'signin' && 'Sign in to access your offline passes, plan cart, and role workspace.'}
            {mode === 'signup' && 'Choose your role to map your workspace and permissions.'}
            {mode === 'forgot' && 'Enter your account email to receive a 6-digit recovery code.'}
            {mode === 'reset' && 'Enter the 6-digit code sent to your inbox and your new password.'}
            {mode === 'verify' && `Enter the 6-digit PIN dispatched to ${email || 'your email'}.`}
          </p>

          {user && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/80 p-3.5 text-xs dark:border-brand-900/60 dark:bg-brand-950/40">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-brand-950 dark:text-brand-200">
                  <span>{user.name}</span>
                  <span className="rounded bg-brand-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-800 dark:bg-brand-900 dark:text-brand-300">
                    {roleLabel(user.role)}
                  </span>
                  {user.emailVerified ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Unverified
                    </span>
                  )}
                </p>
                <p className="muted truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => navigateAfterAuth(user.role, user.onboarded)}>
                  Continue
                </Button>
                <Button size="sm" variant="outline" onClick={() => signOut()}>
                  Sign out
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate>
            {mode === 'signup' && (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'attendee' as const,
                      icon: 'person',
                      title: 'Attendee',
                      desc: 'Plan nights, vote & buy passes',
                    },
                    {
                      id: 'organiser' as const,
                      icon: 'business',
                      title: 'Planner',
                      desc: 'Host events, KYC & payouts',
                    },
                    {
                      id: 'venue_manager' as const,
                      icon: 'storefront',
                      title: 'Venue',
                      desc: 'Confirm bookings & tables',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRole(opt.id)}
                      className={`flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all ${
                        role === opt.id
                          ? 'border-brand-500 bg-brand-50/80 shadow-xs ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-midnight-800'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          role === opt.id
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon name={opt.icon} className="text-base" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{opt.title}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {role === 'organiser'
                      ? 'Organizer / Brand Name'
                      : role === 'venue_manager'
                      ? 'Manager / Venue Name'
                      : 'Full Name'}
                  </label>
                  <div className={inputWrap}>
                    <Icon name="person" className="pointer-events-none absolute left-3.5 text-slate-400" />
                    <input
                      id="name"
                      autoComplete="name"
                      className={inputCls}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        role === 'organiser' ? 'Your event company or full name' : 'Enter your full name'
                      }
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Phone Number (Optional)
                  </label>
                  <div className={inputWrap}>
                    <Icon name="call" className="pointer-events-none absolute left-3.5 text-slate-400" />
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      className={inputCls}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>
              </>
            )}

            {mode !== 'verify' && (
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
                    placeholder="you@domain.com"
                    disabled={mode === 'reset'}
                  />
                </div>
              </div>
            )}

            {(mode === 'verify' || mode === 'reset') && (
              <div>
                <label htmlFor="code" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  6-Digit Security Code
                </label>
                <div className={inputWrap}>
                  <Icon name="pin" className="pointer-events-none absolute left-3.5 text-slate-400" />
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputCls} font-mono text-base font-bold tracking-widest`}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && mode !== 'verify' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="pw" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-500 hover:underline"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setInfo(null);
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

            {mode === 'reset' && (
              <div>
                <label htmlFor="confirmPw" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </label>
                <div className={inputWrap}>
                  <Icon name="lock" className="pointer-events-none absolute left-3.5 text-slate-400" />
                  <input
                    id="confirmPw"
                    type={show ? 'text' : 'password'}
                    className={inputCls}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-coral-400/30 bg-coral-50 p-3 text-xs font-medium text-coral-600 dark:bg-coral-500/10 dark:text-coral-400"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                role="status"
                className="rounded-xl border border-brand-400/30 bg-brand-50 p-3 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
              >
                {info}
              </p>
            )}

            <Button full size="lg" type="submit" disabled={!isFormValid() || busy} className="mt-2">
              {busy
                ? 'Processing…'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? `Create ${roleLabel(role)} Account`
                : mode === 'forgot'
                ? 'Send Password Reset Code'
                : mode === 'reset'
                ? 'Update Password'
                : 'Verify Email & Activate Account'}
            </Button>
          </form>

          {mode === 'verify' && (
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Didn&apos;t receive the code?</span>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || busy}
                className="font-semibold text-brand-500 hover:underline disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email Code'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            {mode === 'signin' && (
              <p>
                Don’t have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-brand-500 hover:underline"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Sign Up
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
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
              </p>
            )}

            {(mode === 'forgot' || mode === 'reset' || mode === 'verify') && (
              <p>
                <button
                  type="button"
                  className="mx-auto flex items-center justify-center gap-1 font-semibold text-brand-500 hover:underline"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setInfo(null);
                  }}
                >
                  <Icon name="arrow_back" className="text-sm" /> Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
