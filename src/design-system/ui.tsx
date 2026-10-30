import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { CATEGORY_GRADIENT, CATEGORY_ICON } from '../data/mock';
import type { Category } from '../types';
import { useStore } from '../store';

type BtnVariant = 'primary' | 'gold' | 'secondary' | 'coral' | 'ghost' | 'outline' | 'white';
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  full?: boolean;
  size?: 'md' | 'sm' | 'lg';
};

export function Button({ variant = 'primary', full, size = 'md', className = '', ...p }: BtnProps) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20',
    gold: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20',
    secondary: 'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25',
    coral: 'bg-coral-500 text-white hover:bg-coral-600 shadow-sm shadow-coral-500/20',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    outline: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-midnight-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
    white: 'bg-white text-slate-900 hover:bg-slate-100 shadow-sm',
  };
  const sz =
    size === 'sm'
      ? 'h-9 px-3.5 text-xs rounded-xl'
      : size === 'lg'
        ? 'h-12 px-6 text-base rounded-2xl'
        : 'h-11 px-5 text-sm rounded-xl';

  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none ${sz} ${full ? 'w-full' : ''} ${v[variant]} ${className}`}
    />
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = '',
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-xs font-medium transition-all duration-150 active:scale-[0.98] ${active
          ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-200 dark:hover:bg-slate-800'
        } ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = 'brand',
  children,
  className = '',
}: {
  tone?: 'brand' | 'gold' | 'neon' | 'coral' | 'muted' | 'dark';
  children: ReactNode;
  className?: string;
}) {
  const t = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    gold: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    neon: 'bg-neon-50 text-neon-700 dark:bg-neon-500/15 dark:text-neon-400',
    coral: 'bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-400',
    muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dark: 'bg-slate-900/80 text-white backdrop-blur-md',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${t} ${className}`}>
      {children}
    </span>
  );
}

export const VerifiedBadge = () => (
  <Badge tone="neon">
    <Icon name="verified" filled className="text-[13px]" /> Verified
  </Badge>
);

export function Card({
  children,
  className = '',
  ...p
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={`surface rounded-2xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Cover({
  gradient,
  category,
  className = '',
  label,
}: {
  gradient: string;
  category?: Category;
  className?: string;
  label?: string;
}) {
  const lowData = useStore((s) => s.lowData);
  const [failed, setFailed] = useState(false);
  const isUrl = gradient.startsWith('http') || gradient.startsWith('/');
  const fallbackBg = category ? CATEGORY_GRADIENT[category] : isUrl ? 'linear-gradient(135deg,#1E293B,#4F46E5)' : gradient;

  return (
    <div
      role="img"
      aria-label={label ?? 'Cover image'}
      style={{ background: !isUrl || failed || lowData ? fallbackBg : undefined }}
      className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 ${className}`}
    >
      {isUrl && !failed && !lowData ? (
        <img
          src={gradient}
          alt={label ?? ''}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        category && (
          <div className="flex h-full w-full items-center justify-center text-white/80">
            <Icon name={CATEGORY_ICON[category]} className="text-4xl" />
          </div>
        )
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800 ${className}`} aria-hidden />;
}

export function EmptyState({
  icon = 'event_busy',
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon name={icon} className="text-2xl" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {text && <p className="muted max-w-xs text-sm leading-relaxed">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  onRetry,
  text = 'Network is slow. Check your connection and try again.',
}: {
  onRetry?: () => void;
  text?: string;
}) {
  return (
    <EmptyState
      icon="wifi_off"
      title="Something went wrong"
      text={text}
      action={onRetry && <Button onClick={onRetry} variant="outline">Retry</Button>}
    />
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="surface relative max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-float md:rounded-3xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                onClick={onClose}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
      <Icon name="star" filled className="text-sm" />
      <span className="text-slate-800 dark:text-slate-200">{value.toFixed(1)}</span>
    </span>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.96 }}
          className="fixed bottom-24 left-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-float dark:bg-white dark:text-slate-900 md:bottom-8"
        >
          <Icon name="check_circle" filled className="text-neon-400 dark:text-neon-500" />
          <span className="truncate">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8 w-full min-w-0 max-w-full overflow-hidden">
      <div className="mb-3.5 flex items-end justify-between gap-2 px-4 md:px-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="muted text-xs">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
