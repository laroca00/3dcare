// The plan's construction circles: they start as concentric circles round the
// mug's drawing, like a compass's first marks, and gather into "3D CARE"
// above it. Everything is in cm on the mug's side, x to the right of its
// axis, y up from its base.

export interface Circle {
  x: number;
  y: number;
  r: number;
}

type Point = [number, number];

/** Letter width (letters are 3.2 cm tall), the gap between letters and the wordmark's baseline (cm). */
const WIDTH = 2.4;
const GAP = 0.6;
const SPACE = 1.2;
const BASELINE = 11;
/** One circle about every STEP cm along each stroke. */
const STEP = 0.45;

const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number): Point[] => {
  const points: Point[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return points;
};

/** Each letter as strokes (polylines) in a WIDTH × CAP box, origin bottom left. */
const LETTERS: Record<string, Point[][]> = {
  "3": [arc(1.2, 2.4, 0.9, 0.8, 160, -90), arc(1.2, 0.8, 1.0, 0.8, 90, -160)],
  D: [[[0.2, 0], [0.2, 3.2]], [[0.2, 3.2], [1.0, 3.2], ...arc(1.0, 1.6, 1.2, 1.6, 90, -90), [0.2, 0]]],
  C: [arc(1.35, 1.6, 1.15, 1.6, 45, 315)],
  A: [[[0.1, 0], [1.2, 3.2], [2.3, 0]], [[0.55, 1.1], [1.85, 1.1]]],
  R: [[[0.2, 0], [0.2, 3.2]], [[0.2, 3.2], [1.2, 3.2], ...arc(1.2, 2.4, 0.8, 0.8, 90, -90), [0.2, 1.6]], [[1.1, 1.6], [2.2, 0]]],
  E: [[[2.2, 3.2], [0.2, 3.2], [0.2, 0], [2.2, 0]], [[0.2, 1.6], [1.8, 1.6]]],
};

/** Points every STEP cm along a polyline, ends included. */
function along(line: Point[]): Point[] {
  const points: Point[] = [line[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    let d = STEP - carry;
    while (d <= length) {
      points.push([x0 + ((x1 - x0) * d) / length, y0 + ((y1 - y0) * d) / length]);
      d += STEP;
    }
    carry = length - (d - STEP);
  }
  const last = line[line.length - 1];
  const [lx, ly] = points[points.length - 1];
  if (Math.hypot(last[0] - lx, last[1] - ly) > STEP * 0.4) points.push(last);
  return points;
}

/** The circles that spell "3D CARE", centred over the mug's axis. */
export function wordmarkCircles(): Circle[] {
  const text = "3D CARE";
  const total = [...text].reduce((w, ch, i) => w + (ch === " " ? SPACE : WIDTH) + (i ? GAP : 0), 0);
  const circles: Circle[] = [];
  let left = -total / 2;
  for (const ch of text) {
    if (ch === " ") {
      left += SPACE + GAP;
      continue;
    }
    for (const stroke of LETTERS[ch]) {
      for (const [x, y] of along(stroke)) {
        // Sizes vary a little, like circles drawn with a compass.
        const r = 0.3 + 0.08 * Math.sin(circles.length * 2.3);
        circles.push({ x: left + x, y: BASELINE + y, r });
      }
    }
    left += WIDTH + GAP;
  }
  return circles;
}

/** Where each circle starts: concentric circles round the middle of the mug's drawing. */
export function constructionCircles(count: number): Circle[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(count - 1, 1);
    // A few centres along the axis, so the rings overlap like construction marks.
    return { x: 0, y: 4.5 + ((i % 3) - 1) * 0.9, r: 1.2 + t * 9 };
  });
}

/**
 * Circle i of n, part way (gather 0..1) from its construction circle to its
 * place in the wordmark, and how far along it is (t). Circles leave one after another.
 */
export function circleAt(from: Circle, to: Circle, i: number, n: number, gather: number): Circle & { t: number } {
  const delay = (i / n) * 0.4;
  const raw = Math.min(Math.max((gather - delay) / 0.6, 0), 1);
  const t = raw * raw * (3 - 2 * raw);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, r: from.r + (to.r - from.r) * t, t };
}
