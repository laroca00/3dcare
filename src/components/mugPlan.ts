// The mug's plan, drawn over it while the camera looks at its side: outline,
// axis, dimensions and the construction circles that gather into "3D CARE".
// Everything is measured in cm on the mug (see mugShapes.ts) and placed on
// screen with the frame the scene reports each frame.
import { MUG_SHAPES, SHAPES, type MugShapeId } from "@/scene/mugShapes";
import type { MugFrame } from "@/scene/runScene";
import { circleAt, constructionCircles, wordmarkCircles } from "@/scene/wordmark";

export const WORDMARK = wordmarkCircles();
const START = constructionCircles(WORDMARK.length);

/** Wall radius and height (cm). */
const R = 4.2;
const H = 9;

type Line = [number, number][];

const AXIS: Line[] = [[[0, -0.8], [0, H + 0.8]]];

/** A dimension line from a to b, with slanted ticks at both ends. */
function dimension(a: [number, number], b: [number, number]): Line[] {
  const tick = (p: [number, number]): Line => [[p[0] - 0.2, p[1] - 0.2], [p[0] + 0.2, p[1] + 0.2]];
  return [[a, b], tick(a), tick(b)];
}

/** The outline, dimensions and label places for one shape of mug. */
function planFor(id: MugShapeId) {
  const { sides, outline, reach } = SHAPES[id];
  const right = sides.includes(1) ? reach : R;
  const left = sides.includes(-1) ? -reach : -R;
  const heightAt = left - 1.6;
  const lines: Line[] = [
    [[-R, 0], [R, 0], [R, H], [-R, H], [-R, 0]],
    ...sides.flatMap((s) => outline.map((line) => line.map(([x, y]) => [s * x, y] as [number, number]))),
  ];
  const dimensions: Line[] = [
    // Across the wall, below the mug.
    ...dimension([-R, -1.2], [R, -1.2]),
    [[-R, -0.2], [-R, -1.5]],
    [[R, -0.2], [R, -1.5]],
    // Across the handles.
    ...dimension([left, -3], [right, -3]),
    [[left, 1.2], [left, -3.3]],
    [[right, 1.2], [right, -3.3]],
    // Height, on the left.
    ...dimension([heightAt, 0], [heightAt, H]),
    [[-R - 0.4, 0], [heightAt - 0.3, 0]],
    [[-R - 0.4, H], [heightAt - 0.3, H]],
  ];
  const labels: Record<"diameter" | "width" | "height", [number, number]> = {
    diameter: [0, -2],
    width: [(left + right) / 2, -3.8],
    height: [heightAt - 0.8, H / 2],
  };
  return { lines, dimensions, labels };
}
const PLANS = Object.fromEntries(MUG_SHAPES.map((id) => [id, planFor(id)])) as Record<MugShapeId, ReturnType<typeof planFor>>;

/** Updates the drawing of the chosen mug for one frame, or hides it. */
export function drawPlan(svg: SVGSVGElement, frame: MugFrame | null, shape: MugShapeId) {
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
  const path = (lines: Line[]) => lines.map((line) => "M" + line.map(([x, y]) => px(x, y)).join("L")).join("");
  const plan = PLANS[shape];
  svg.querySelector(".story__plan-outline")!.setAttribute("d", path(plan.lines));
  svg.querySelector(".story__plan-axis")!.setAttribute("d", path(AXIS));
  svg.querySelector(".story__plan-dims")!.setAttribute("d", path(plan.dimensions));
  for (const [key, [x, y]] of Object.entries(plan.labels)) {
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
