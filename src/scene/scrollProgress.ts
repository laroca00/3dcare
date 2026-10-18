/**
 * How far the visitor has scrolled through a tall section with a sticky stage:
 * 0 when its top reaches the top of the viewport, 1 when its bottom reaches
 * the bottom of the viewport.
 */
export function progressFor(rectTop: number, rectHeight: number, viewportHeight: number): number {
  const scrollable = rectHeight - viewportHeight;
  if (scrollable <= 0) return 0;
  return Math.min(Math.max(-rectTop / scrollable, 0), 1);
}
