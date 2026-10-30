/** Material Symbols (Rounded) icon. Uses the ligature font so `name` is the icon name. */
export function Icon({ name, className = '', filled = false, label }: { name: string; className?: string; filled?: boolean; label?: string }) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500` }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

