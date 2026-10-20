// The mug's plan, drawn over it while the camera looks at its side: outline,
// axis, dimensions and the construction circles that gather into "3D CARE".
// Everything is measured in cm on the mug (see printJob.ts) and placed on
// screen with the frame the scene reports each frame.
import type { MugFrame } from "@/scene/runScene";
import { circleAt, constructionCircles, wordmarkCircles } from "@/scene/wordmark";

export const WORDMARK = wordmarkCircles();
const START = constructionCircles(WORDMARK.length);

/** Wall radius, height and how far the handles reach (cm). */
const R = 4.2;
const H = 9;
const REACH = 7.8;

const OUTLINE: [number, number][][] = [
  [[-R, 0], [R, 0], [R, H], [-R, H], [-R, 0]],
  ...[1, -1].flatMap((s) => [
    [[s * R, 1.5], [s * REACH, 1.5], [s * REACH, 7.5], [s * R, 7.5]] as [number, number][],
    [[s * R, 2.4], [s * 6.8, 2.4], [s * 6.8, 6.6], [s * R, 6.6]] as [number, number][],
  ]),
];
const AXIS: [number, number][][] = [[[0, -0.8], [0, H + 0.8]]];

/** A dimension line from a to b, with slanted ticks at both ends. */
function dimension(a: [number, number], b: [number, number]): [number, number][][] {
  const tick = (p: [number, number]): [number, number][] => [[p[0] - 0.2, p[1] - 0.2], [p[0] + 0.2, p[1] + 0.2]];
  return [[a, b], tick(a), tick(b)];
}
const DIMENSIONS: [number, number][][] = [
  // Across the wall, below the mug.
  ...dimension([-R, -1.2], [R, -1.2]),
  [[-R, -0.2], [-R, -1.5]],
  [[R, -0.2], [R, -1.5]],
  // Across the handles.
  ...dimension([-REACH, -3], [REACH, -3]),
  [[-REACH, 1.2], [-REACH, -3.3]],
  [[REACH, 1.2], [REACH, -3.3]],
  // Height, on the left.
  ...dimension([-9.4, 0], [-9.4, H]),
  [[-R - 0.4, 0], [-9.7, 0]],
  [[-R - 0.4, H], [-9.7, H]],
];
const LABELS: Record<"diameter" | "width" | "height", [number, number]> = {
  diameter: [0, -2],
  width: [0, -3.8],
  height: [-10.2, H / 2],
};

/** Updates the drawing for one frame, or hides it. */
export function drawPlan(svg: SVGSVGElement, frame: MugFrame | null) {
  if (!frame || frame.plan <= 0) {
    svg.style.visibility = "hidden";
    return;
  }
  svg.style.visibility = "visible";
  svg.style.opacity = String(frame.plan);
  const [ox, oy] = frame.origin;
  const [rx, ry] = frame.right;
  const [ux, uy] = frame.up;
  const px = (x: number, y: number) => `${(ox + rx * x + ux * y).toFixed(1)},${(oy + ry * x + uy * y).toFixed(1)}`;
  const path = (lines: [number, number][][]) => lines.map((line) => "M" + line.map(([x, y]) => px(x, y)).join("L")).join("");
  svg.querySelector(".story__plan-outline")!.setAttribute("d", path(OUTLINE));
  svg.querySelector(".story__plan-axis")!.setAttribute("d", path(AXIS));
  svg.querySelector(".story__plan-dims")!.setAttribute("d", path(DIMENSIONS));
  for (const [key, [x, y]] of Object.entries(LABELS)) {
    const label = svg.querySelector<SVGTextElement>(`[data-dim="${key}"]`)!;
    const [lx, ly] = px(x, y).split(",");
    label.setAttribute("transform", `translate(${lx} ${ly})${key === "height" ? " rotate(-90)" : ""}`);
  }
  const cm = Math.hypot(rx, ry);
  svg.querySelectorAll("circle").forEach((circle, i) => {
    const c = circleAt(START[i], WORDMARK[i], i, WORDMARK.length, frame.gather);
    const [cx, cy] = px(c.x, c.y).split(",");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", (c.r * cm).toFixed(1));
    // Faint while they are still construction rings round the drawing.
    circle.style.strokeOpacity = String(0.12 + 0.88 * c.t);
  });
}

/** Places the close-up's scale mark across one real layer, or hides it. */
export function drawScale(mark: HTMLElement, frame: MugFrame | null) {
  const scale = frame?.scale;
  mark.style.visibility = scale && scale.opacity > 0 ? "visible" : "hidden";
  if (!scale) return;
  mark.style.transform = `translate(${scale.x}px, ${Math.min(scale.top, scale.bottom)}px)`;
  mark.style.height = `${Math.abs(scale.bottom - scale.top)}px`;
  mark.style.opacity = String(scale.opacity);
}
