// The home story's five scenes on a 0..1 scroll timeline.

export type SceneId = "draw" | "meet" | "explode" | "print" | "use";

export const SCENES: readonly { id: SceneId; start: number; end: number }[] = [
  { id: "draw", start: 0, end: 0.16 },
  { id: "meet", start: 0.16, end: 0.36 },
  { id: "explode", start: 0.36, end: 0.58 },
  { id: "print", start: 0.58, end: 0.82 },
  { id: "use", start: 0.82, end: 1 },
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
