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

/**
 * Splits the section's progress between the story and its closing part: the
 * story runs 0..1 over the first `storyShare` of the scroll, then the closing
 * runs 0..1 over the rest.
 */
export function splitProgress(progress: number, storyShare: number): { story: number; outro: number } {
  const share = Math.min(Math.max(storyShare, 0.01), 1);
  return {
    story: Math.min(progress / share, 1),
    outro: share >= 1 ? 0 : Math.min(Math.max((progress - share) / (1 - share), 0), 1),
  };
}
