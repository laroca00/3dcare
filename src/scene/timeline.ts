// The home story's scenes on a 0..1 scroll timeline.

export type SceneId = "draw" | "meet" | "explode" | "print" | "reveal" | "heat" | "plan" | "layers" | "material" | "use";

export const SCENES: readonly { id: SceneId; start: number; end: number }[] = [
  { id: "draw", start: 0, end: 0.095 },
  { id: "meet", start: 0.095, end: 0.21 },
  { id: "explode", start: 0.21, end: 0.33 },
  { id: "print", start: 0.33, end: 0.465 },
  // The printed mug takes over from the printer.
  { id: "reveal", start: 0.465, end: 0.56 },
  // Four looks at the fresh mug: its heat, its plan, its layers, its material.
  { id: "heat", start: 0.56, end: 0.64 },
  { id: "plan", start: 0.64, end: 0.72 },
  { id: "layers", start: 0.72, end: 0.8 },
  { id: "material", start: 0.8, end: 0.885 },
  { id: "use", start: 0.885, end: 1 },
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

/** The story progress at which a scene is `t` (0..1) of the way through. */
export function at(id: SceneId, t: number): number {
  const scene = SCENES.find((s) => s.id === id)!;
  return scene.start + (scene.end - scene.start) * t;
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
