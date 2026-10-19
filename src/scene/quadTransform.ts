export type Point = readonly [number, number];

/**
 * CSS matrix3d that maps a w × h element (transform-origin 0 0) onto any four
 * screen points, in the order top left, top right, bottom left, bottom right.
 * Lets real HTML sit in perspective on a surface in the 3D scene.
 */
export function quadTransform(w: number, h: number, corners: readonly [Point, Point, Point, Point]): string {
  const from: Point[] = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  // Solve for the projective map u = (a x + b y + c) / (g x + h y + 1),
  // v = (d x + e y + f) / (g x + h y + 1): two equations per corner.
  const rows: number[][] = [];
  from.forEach(([x, y], i) => {
    const [u, v] = corners[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  const [a, b, c, d, e, f, g, k] = solve(rows);
  return `matrix3d(${[a, d, 0, g, b, e, 0, k, 0, 0, 1, 0, c, f, 0, 1].join(",")})`;
}

/** Gaussian elimination with partial pivoting on an augmented n × (n + 1) matrix. */
function solve(m: number[][]): number[] {
  const n = m.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      for (let k = col; k <= n; k++) m[r][k] -= factor * m[col][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}
