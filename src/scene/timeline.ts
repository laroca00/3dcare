// The home story's six scenes on a 0..1 scroll timeline.

export type SceneId = "draw" | "meet" | "explode" | "print" | "reveal" | "use";

export const SCENES: readonly { id: SceneId; start: number; end: number }[] = [
  { id: "draw", start: 0, end: 0.14 },
  { id: "meet", start: 0.14, end: 0.31 },
  { id: "explode", start: 0.31, end: 0.49 },
  { id: "print", start: 0.49, end: 0.69 },
  // The printed mug takes over from the printer.
  { id: "reveal", start: 0.69, end: 0.83 },
  { id: "use", start: 0.83, end: 1 },
];

export const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

export function sceneAt(progress: number): SceneId {
  const p = clamp01(progress);
  return (SCENES.find((s) => p < s.end) ?? SCENES[SCENES.length - 1]).id;
}

/** Progress within one scene: 0 before it starts, 1 after it ends. */
export function localProgress(progress: number, id: SceneId): number {
  const scene = SCENES.find((s) => s.id === id)!;
  return clamp01((progress - scene.start) / (scene.end - scene.start));
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
