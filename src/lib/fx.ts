import { triggerHaptic } from './capacitor';

export const toast = (message: string) => {
  if (typeof message === 'string') {
    if (
      message.includes('[CONVEX') ||
      message.includes('Uncaught Error:') ||
      message.includes('Server Error') ||
      message.includes('Called by client')
    ) {
      console.error('[COORDINA Raw Error Suppressed from UI]:', message);
      let clean = message;
      if (clean.includes('Uncaught Error:')) {
        clean = clean.split('Uncaught Error:')[1] || clean;
      }
      if (clean.includes('Server Error')) {
        clean = clean.split('Server Error')[1] || clean;
      }
      if (clean.includes('at handler')) {
        clean = clean.split('at handler')[0] || clean;
      }
      clean = clean.split('Called by client')[0]?.replace(/^[:\s\-]+/, '').trim();
      if (!clean || clean.length > 120 || clean.includes('[CONVEX')) {
        clean = 'An error occurred. Check the console for details.';
      }
      message = clean;
    }
  }

  triggerHaptic('light');
  window.dispatchEvent(new CustomEvent('cho-toast', { detail: message }));
};

/** Card-to-cart fly animation. Flies a clean rounded thumbnail from `from` to the visible cart target. */
export function flyToCart(from: DOMRect, image: string) {
  triggerHaptic('medium');
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'));
  const target = targets.find((t) => t.offsetParent !== null);
  if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = target.getBoundingClientRect();
  const el = document.createElement('div');
  const isUrl = image.startsWith('http') || image.startsWith('/');
  Object.assign(el.style, {
    position: 'fixed',
    left: `${from.left + 12}px`,
    top: `${from.top + 12}px`,
    width: '72px',
    height: '52px',
    borderRadius: '12px',
    background: isUrl ? `#1E293B url("${image}") center/cover no-repeat` : image,
    zIndex: '100',
    pointerEvents: 'none',
    boxShadow: '0 12px 28px rgba(15,23,42,.28)',
    border: '2px solid #ffffff',
  });
  document.body.appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + 48);
  const dy = to.top + to.height / 2 - (from.top + 38);
  const anim = el.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(0.2)`, opacity: 0.2 },
    ],
    { duration: 560, easing: 'cubic-bezier(.32,.72,0,1)' }
  );
  anim.onfinish = () => {
    el.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { duration: 240 }
    );
  };
}
