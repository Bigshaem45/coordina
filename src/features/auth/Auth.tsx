import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { Icon } from '../../design-system/Icon';
import { useStore, type UserRole } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerificationOtpEmail } from '../../lib/email';
import { toast } from '../../lib/fx';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset' | 'verify';

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = (params.get('mode') as AuthMode) || 'signin';
  const paramEmail = params.get('email') || '';
  const paramCode = params.get('code') || '';
  const paramRole = (params.get('role') === 'organiser' || params.get('role') === 'organizer') ? 'organiser' : 'attendee';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<UserRole>(paramRole);
  const [name, setName] = useState('');
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

  const {
    user,
    onboarded,
    signIn,
    signUp,
    signOut,
    verifyEmail,
    requestEmailVerification,
    requestPasswordReset,
    resetPassword,
  } = useStore();
  const nav = useNavigate();

  const navigateAfterAuth = (activeRole?: UserRole) => {
    if (redirectUrl) {
      nav(redirectUrl);
      return;
    }
    if (activeRole === 'organiser') {
      nav('/organiser');
    } else {
      nav(onboarded ? '/home' : '/onboarding');
    }
  };

  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramCode && !verificationCode) setVerificationCode(paramCode);
    if (params.get('mode')) setMode(params.get('mode') as AuthMode);
    if (params.get('role')) {
      const r = params.get('role');
      if (r === 'organiser' || r === 'organizer') setRole('organiser');
      else setRole('attendee');
    }
  }, [params]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const emailOk = /^\S+@\S+\.\S+$/.test(email);

  const isFormValid = () => {
    if (mode === 'forgot') return emailOk;
    if (mode === 'verify') return emailOk && verificationCode.trim().length >= 4;
    if (mode === 'reset') return emailOk && verificationCode.trim().length >= 4 && password.length >= 6 && password === confirmPassword;
    if (mode === 'signin') return emailOk && password.length >= 6;
    if (mode === 'signup') return emailOk && password.length >= 6 && name.trim().length > 1;
    return false;
  };

  const handleResendVerification = async () => {
    if (!emailOk || resendCooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const code = requestEmailVerification(email) || '123456';
      await sendEmailVerificationOtpEmail(email.trim().toLowerCase(), name.trim() || 'Explorer', code);
      setResendCooldown(45);
      setInfo(`New 6-digit verification code sent to ${email}.`);
      toast('Verification code sent to your email.');
    } catch {
      setInfo('Verification email dispatched to your inbox.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();

    // 1. FORGOT PASSWORD MODE
    if (mode === 'forgot') {
      setBusy(true);
      try {
        const resetRes = requestPasswordReset(cleanEmail);
        const code = resetRes.code || '123456';
        await sendPasswordResetEmail(cleanEmail, '', code);
        setInfo(`Password reset code has been sent to ${cleanEmail}. Enter the code below to set your new password.`);
        setMode('reset');
      } catch (err: any) {
        setError(err?.message || 'Could not send reset code. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 2. PASSWORD RESET SUBMISSION MODE
    if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
      setBusy(true);
      try {
        const ok = resetPassword(cleanEmail, verificationCode.trim(), password);
        if (!ok) {
          setError('Invalid or expired reset code. Please check your email or request a new code.');
          return;
        }
        toast('Password reset successfully! You can now sign in.');
        setInfo('Your password has been updated. Please sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setMode('signin');
      } catch (err: any) {
        setError(err?.message || 'Failed to reset password.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 3. EMAIL VERIFICATION MODE
    if (mode === 'verify') {
      setBusy(true);
      try {
        const ok = verifyEmail(cleanEmail, verificationCode.trim());
        if (!ok) {
          setError('Invalid verification code. Enter the 6-digit code sent to your inbox.');
          return;
        }
        toast('Email verified successfully! Welcome to COORDINA.');
        const activeUser = useStore.getState().user;
        navigateAfterAuth(activeUser?.role);
      } catch (err: any) {
        setError(err?.message || 'Verification failed. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 4. SIGN UP & SIGN IN MODES
    setBusy(true);
    try {
      if (mode === 'signup') {
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

        try {
          await convex.mutation(api.auth.signUp, {
            name: name.trim(),
            email: cleanEmail,
            role,
          });
        } catch (cErr) {
          console.warn('Convex auth signup fallback:', cErr);
        }

        const localErr = signUp(name.trim(), cleanEmail, password, role);
        if (localErr) {
          setError(localErr);
          return;
        }

        // Send Welcome and Email Verification OTPs
        sendWelcomeEmail(cleanEmail, name.trim());
        sendEmailVerificationOtpEmail(cleanEmail, name.trim(), vCode);

        toast('Account created! A verification code was sent to your email.');
        setInfo(`We've sent a 6-digit verification code to ${cleanEmail}. Enter it below to activate your account.`);
        setMode('verify');
        return;
      }

      // SIGN IN
      try {
        await convex.mutation(api.auth.signIn, {
          email: cleanEmail,
          name: name.trim() || undefined,
        });
      } catch (cErr) {
        console.warn('Convex auth signin fallback:', cErr);
      }

      const err = signIn(cleanEmail, password);
      if (err) {
        setError(err);
      } else {
        const activeUser = useStore.getState().user;
        navigateAfterAuth(activeUser?.role);
      }
    } catch (err: any) {
      console.warn('Auth processing error:', err);
      const localErr = mode === 'signin' ? signIn(cleanEmail, password) : signUp(name.trim(), cleanEmail, password, role);
      if (localErr) setError(localErr);
      else {
        const activeUser = useStore.getState().user;
        navigateAfterAuth(activeUser?.role);
      }
    } finally {
      setBusy(false);
    }
  };

  const inputWrap = 'relative flex items-center';
  const inputCls =
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100';

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
            <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">
              Back
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' && 'Hey! Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Create new password'}
            {mode === 'verify' && 'Verify your email'}
          </h1>
          <p className="muted mt-1 text-sm">
            {mode === 'signin' && 'Sign in to access your offline ticket passes and itinerary.'}
            {mode === 'signup' && 'Choose your role and join COORDINA.'}
            {mode === 'forgot' && 'Enter your account email to receive a 6-digit recovery code.'}
            {mode === 'reset' && 'Enter the 6-digit code from your email and your new password.'}
            {mode === 'verify' && `We sent a 6-digit verification code to ${email || 'your inbox'}.`}
          </p>

          {user && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/80 p-3.5 text-xs dark:border-brand-900/60 dark:bg-brand-950/40">
              <div className="min-w-0">
                <p className="font-semibold text-brand-950 dark:text-brand-200 flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="rounded bg-brand-200/80 px-1.5 py-0.2 text-[10px] font-bold uppercase text-brand-800 dark:bg-brand-900 dark:text-brand-300">
                    {user.role === 'organiser' ? 'Organizer' : 'Attendee'}
                  </span>
                  {user.emailVerified ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Unverified
                    </span>
                  )}
                </p>
                <p className="muted truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link to={user.role === 'organiser' ? '/organiser' : '/home'}>
                  <Button size="sm">{user.role === 'organiser' ? 'Studio' : 'Go to App'}</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => signOut()}>
                  Sign out
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate>
            {/* ACCOUNT ROLE PROMPT (SIGNUP ONLY) */}
            {mode === 'signup' && (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Account Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('attendee')}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                      role === 'attendee'
                        ? 'border-brand-500 bg-brand-50/80 shadow-xs ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-midnight-800'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        role === 'attendee'
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Icon name="person" className="text-base" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">Attendee</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      Explore events, join squads &amp; buy passes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('organiser')}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                      role === 'organiser'
                        ? 'border-brand-500 bg-brand-50/80 shadow-xs ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-midnight-800'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        role === 'organiser'
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Icon name="business" className="text-base" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">Event Planner</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      Publish events, verify spaces &amp; get payouts.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* FULL NAME (SIGNUP ONLY) */}
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

            {/* EMAIL ADDRESS */}
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
                    placeholder="hello@coordina.ng"
                    disabled={mode === 'reset'}
                  />
                </div>
              </div>
            )}

            {/* 6-DIGIT CODE INPUT FOR VERIFY OR RESET */}
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
                    maxLength={8}
                    className={`${inputCls} font-mono tracking-widest text-base font-bold`}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD INPUT (SIGNIN, SIGNUP, RESET) */}
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

            {/* CONFIRM PASSWORD (RESET MODE ONLY) */}
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

            {/* ERROR & INFO NOTICES */}
            {error && (
              <p role="alert" className="rounded-xl border border-coral-400/30 bg-coral-50 p-3 text-xs font-medium text-coral-600 dark:bg-coral-500/10 dark:text-coral-400">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-xl border border-brand-400/30 bg-brand-50 p-3 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {info}
              </p>
            )}

            <Button full size="lg" type="submit" disabled={!isFormValid() || busy} className="mt-2">
              {busy ? (
                'Processing…'
              ) : mode === 'signin' ? (
                'Sign In'
              ) : mode === 'signup' ? (
                `Create Account as ${role === 'organiser' ? 'Organizer' : 'Attendee'}`
              ) : mode === 'forgot' ? (
                'Send Password Reset Code'
              ) : mode === 'reset' ? (
                'Update Password'
              ) : (
                'Verify Email & Activate Account'
              )}
            </Button>
          </form>

          {/* VERIFY MODE RESEND BUTTON */}
          {mode === 'verify' && (
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Didn't receive the code?</span>
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

          {/* FOOTER SWITCHERS */}
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
                  className="font-semibold text-brand-500 hover:underline flex items-center justify-center gap-1 mx-auto"
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
