import { useState, useEffect } from 'react';
import { Icon } from '../design-system/Icon';
import { Button } from '../design-system/ui';
import { useStore, useAuth } from '../store';
import { convex } from '../lib/convex';
import { api } from '../../convex/_generated/api';
import { sendEmailVerificationOtpEmail } from '../lib/email';
import { toast } from '../lib/fx';
import { cleanErrorMessage } from '../lib/errors';

export function EmailVerificationModal() {
  const isOpen = useStore((s) => s.verifyModalOpen);
  const setOpen = useStore((s) => s.setVerifyModalOpen);
  const { user } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      setInfo(null);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSendCode = async () => {
    if (!user.email || cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await convex.mutation(api.auth.requestEmailVerification, {
        userId: user._id as any,
      });
      const mailRes = await sendEmailVerificationOtpEmail(res.email, res.name, res.code);
      setCooldown(45);
      if (mailRes.success) {
        setInfo(`A 6-digit verification code has been dispatched to ${res.email}.`);
        toast('Verification code sent to your email.');
      } else {
        setError(
          mailRes.error ||
            'Email delivery could not be completed. Ensure SENDGRID_API_KEY is configured in Vercel Environment Variables.'
        );
      }
    } catch (err: any) {
      console.error('[Email Verification Request Error]', err);
      setError(cleanErrorMessage(err, 'Could not request verification code.'));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setBusy(true);
    setError(null);

    try {
      await convex.mutation(api.auth.verifyEmail, {
        email: user.email,
        code: code.trim(),
      });
      toast('Email verified! All platform actions are now unlocked.');
      setOpen(false);
    } catch (err: any) {
      console.error('[Email Verification Error]', err);
      setError(cleanErrorMessage(err, 'Invalid verification code. Please check your inbox and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-midnight-950"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close modal"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Icon name="close" className="text-lg" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Icon name="mark_email_read" className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verify Your Email</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirm ownership of{' '}
              <strong className="text-slate-700 dark:text-slate-200">{user.email}</strong>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <Icon name="lock" className="text-sm" />
            <span>Platform Action Restrictions:</span>
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
            <li>Ticket purchases &amp; checkout are blocked until verified</li>
            <li>Event publishing, KYC verification &amp; payouts require verification</li>
            <li>Ticket transfers, space bookings &amp; squad voting require verification</li>
          </ul>
        </div>

        {info && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            {info}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-coral-500/30 bg-coral-500/10 p-3 text-xs text-coral-700 dark:text-coral-300">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="otp-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                6-Digit Verification PIN
              </label>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={busy || cooldown > 0}
                className="text-xs font-bold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Verification Code'}
              </button>
            </div>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center font-mono text-2xl font-bold tracking-[0.3em] text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Click <strong>Send Verification Code</strong> above to dispatch a fresh 6-digit PIN via SendGrid.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || code.trim().length < 6}
              className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
            >
              <Icon name="verified" /> {busy ? 'Verifying…' : 'Verify & Unlock'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
