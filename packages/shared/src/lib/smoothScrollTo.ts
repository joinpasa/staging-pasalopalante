const NAVBAR_OFFSET = 96;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Soft, eased scroll to an element id, offset for the fixed navbar. Never
 *  uses scrollIntoView or CSS scroll-behavior — duration scales with
 *  distance so short and long scrolls both feel unhurried but not slow. */
export function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const startY = window.scrollY;
  const targetY = startY + el.getBoundingClientRect().top - NAVBAR_OFFSET;
  const distance = targetY - startY;
  const duration = Math.min(1600, Math.max(900, Math.abs(distance) * 0.55));

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY);
    return;
  }

  const start = performance.now();
  function step(now: number) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    window.scrollTo(0, startY + distance * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
