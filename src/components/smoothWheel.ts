/**
 * Smooths mouse-wheel scrolling on the home page, so the story glides instead
 * of jumping one notch at a time. Only real mouse wheels are smoothed:
 * touchpads and touch screens already glide, and the keyboard, the scroll bar
 * and scripted scrolling keep working as usual (they take over at once). Off
 * with reduced motion and on devices without a fine pointer. Returns a
 * function that removes it.
 */
export function smoothWheel(): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return () => {};

  let target = window.scrollY;
  let current = window.scrollY;
  let raf = 0;
  let last = 0;
  // The scroll position this module set last; any other position means someone else scrolled.
  let expected = -1;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  function step(now: number) {
    // Time-based, so the glide takes as long on a slow device as on a fast one.
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    current += (target - current) * (1 - Math.exp(-dt * 11));
    if (Math.abs(target - current) < 0.5) current = target;
    expected = Math.round(current);
    window.scrollTo(0, current);
    raf = current === target ? 0 : requestAnimationFrame(step);
  }

  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.defaultPrevented || e.deltaY === 0) return;
    // A mouse wheel moves in whole lines or in steps of about 100 pixels;
    // touchpads send many small, fractional or sideways deltas.
    const mouse = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && e.deltaX === 0 && Number.isInteger(e.deltaY));
    if (!mouse) return;
    // Open dialogs and menus scroll on their own.
    if (document.body.hasAttribute("data-scroll-locked") || (e.target as Element | null)?.closest?.('[role="dialog"]')) return;
    e.preventDefault();
    if (!raf) target = current = window.scrollY;
    target = Math.min(Math.max(target + (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY), 0), maxScroll());
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  }

  function onScroll() {
    if (Math.abs(window.scrollY - expected) <= 1) return;
    // Keyboard, scroll bar, links or the story's own "Print": let them lead.
    cancelAnimationFrame(raf);
    raf = 0;
    target = current = window.scrollY;
  }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScroll);
  };
}
