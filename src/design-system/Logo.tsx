/** COORDINA official purple pin mark. */
export function LogoMark({
  size = 32,
  className = '',
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  return (
    <img
      src="/logo-mark.png"
      alt="COORDINA Mark"
      height={size}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
      style={{ height: `${size}px`, width: 'auto' }}
      loading="eager"
      decoding="async"
    />
  );
}

/** COORDINA official logo (purple pin + styled wordmark). Supports dark/light adaptation. */
export function Logo({
  size = 30,
  tone = 'auto',
  className = '',
  stacked = false,
  showMarkOnly = false,
}: {
  size?: number;
  tone?: 'auto' | 'light' | 'dark';
  className?: string;
  stacked?: boolean;
  showMarkOnly?: boolean;
}) {
  if (showMarkOnly) {
    return <LogoMark size={size} className={className} />;
  }

  // Official logo aspect ratio: 1369 / 399 ≈ 3.43
  const approxWidth = Math.round(size * 3.43);

  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-center gap-1.5 select-none ${className}`}>
        <LogoMark size={size} />
        <span className="font-display text-xs font-bold tracking-widest uppercase text-slate-900 dark:text-white">
          COORDINA
        </span>
      </span>
    );
  }

  if (tone === 'light') {
    return (
      <img
        src="/logo-white.png"
        alt="COORDINA"
        height={size}
        width={approxWidth}
        className={`inline-block select-none object-contain ${className}`}
        style={{ height: `${size}px`, width: 'auto' }}
        loading="eager"
        decoding="async"
      />
    );
  }

  if (tone === 'dark') {
    return (
      <img
        src="/logo.png"
        alt="COORDINA"
        height={size}
        width={approxWidth}
        className={`inline-block select-none object-contain ${className}`}
        style={{ height: `${size}px`, width: 'auto' }}
        loading="eager"
        decoding="async"
      />
    );
  }

  // tone === 'auto':
  // In light theme, display dark-text wordmark (/logo.png).
  // In dark theme, display white-text wordmark (/logo-white.png).
  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="COORDINA"
        height={size}
        width={approxWidth}
        className="inline-block object-contain dark:hidden"
        style={{ height: `${size}px`, width: 'auto' }}
        loading="eager"
        decoding="async"
      />
      <img
        src="/logo-white.png"
        alt="COORDINA"
        height={size}
        width={approxWidth}
        className="hidden object-contain dark:inline-block"
        style={{ height: `${size}px`, width: 'auto' }}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
