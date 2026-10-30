import { useId } from 'react';

/** COORDINA ribbon map-pin "C" mark with indigo-violet gradient. */
export function LogoMark({ size = 34, mono = false }: { size?: number; mono?: boolean }) {
  const id = useId();
  const idFold = `${id}-fold`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="COORDINA mark" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C4DFF" />
          <stop offset="0.55" stopColor="#5B46F6" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id={idFold} x1="16" y1="22" x2="42" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#312E81" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <path
        d="M50.5 18.8C45.8 10.6 37.4 6 28.8 6 15.2 6 5 16.4 5 29.6c0 10.3 7.2 19.6 19.9 28.7 1.6 1.1 3.7 1.1 5.2 0l13.2-10.8c1.4-1.2 1.6-3.3.3-4.6l-3.7-3.8c-1.2-1.2-3.1-1.3-4.4-.2l-8 6.6C20.2 39.8 16.5 34.8 16.5 29.4c0-7 5.4-12.4 12.4-12.4 4.3 0 8.1 2 10.6 5.2 1.1 1.4 3.1 1.6 4.5.5l5.9-4.5c1.2-.9 1.5-2.6.6-3.9Z"
        fill={mono ? 'currentColor' : `url(#${id})`}
      />
      {!mono && (
        <path
          d="M5.4 33.2c1.8 9.2 8.7 17.4 19.5 25.1 1.6 1.1 3.7 1.1 5.2 0l4.1-3.4L14.2 34.8c-3.1-3.1-5.8-4.2-8.8-1.6Z"
          fill={`url(#${idFold})`}
          opacity="0.45"
        />
      )}
      <circle cx="29.5" cy="29.5" r="7.5" fill={mono ? 'currentColor' : '#7C4DFF'} />
    </svg>
  );
}

export function Logo({
  size = 30,
  tone = 'auto',
  className = '',
  stacked = false,
}: {
  size?: number;
  tone?: 'auto' | 'light' | 'dark';
  className?: string;
  stacked?: boolean;
}) {
  const textClass =
    tone === 'light'
      ? 'text-white'
      : tone === 'dark'
        ? 'text-slate-900'
        : 'text-slate-900 dark:text-white';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${stacked ? 'flex-col' : ''} ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-display font-bold uppercase tracking-[0.06em] leading-none ${textClass}`}
        style={{ fontSize: Math.round(size * 0.56) }}
      >
        COORDIN
        <span className="relative inline-block">
          A
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#7C4DFF]"
            style={{
              width: Math.max(4, Math.round(size * 0.13)),
              height: Math.max(4, Math.round(size * 0.13)),
              bottom: Math.max(1, Math.round(size * 0.05)),
            }}
          />
        </span>
      </span>
    </span>
  );
}
