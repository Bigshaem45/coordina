import { useState } from 'react';
import { Icon } from './Icon';
import type { VerificationStatus } from '../types';
import { getVerificationMeta } from '../lib/verification';

export function VerificationBadge({
  status,
  size = 'md',
  showDetails = false,
}: {
  status?: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}) {
  const [popover, setPopover] = useState(false);
  const currentStatus = status ?? 'Event Verified';
  const meta = getVerificationMeta(currentStatus);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 'text-[12px]',
    md: 'text-[14px]',
    lg: 'text-[16px]',
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPopover(!popover);
        }}
        className={`inline-flex items-center rounded-full border font-semibold transition hover:opacity-90 active:scale-98 ${sizeClasses[size]} ${meta.bg}`}
        title={`Verification: ${meta.label}. Click to learn more.`}
        aria-label={`Verification: ${meta.label}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} animate-pulse`} />
        <Icon name={meta.icon} className={iconSizes[size]} filled />
        <span>{meta.label}</span>
      </button>

      {/* Trust Guarantee Explainer Popover */}
      {(popover || showDetails) && (
        <div
          role="dialog"
          aria-label="Verification Explainer"
          className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-3.5 text-left text-xs shadow-float backdrop-blur-xl dark:border-slate-800 dark:bg-midnight-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Icon name={meta.icon} className="text-sm" filled />
              {meta.label}
            </span>
            <button
              type="button"
              onClick={() => setPopover(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {meta.desc}
          </p>
          <div className="mt-2.5 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 dark:bg-midnight-950 dark:text-slate-400">
            Guaranteed under COORDINA Remote Verification Engine. No ghost tickets, verified venues only.
          </div>
        </div>
      )}
    </div>
  );
}

