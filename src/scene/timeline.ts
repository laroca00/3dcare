// The home story's scenes on a 0..1 scroll timeline.

export type SceneId = "draw" | "meet" | "explode" | "print" | "reveal" | "heat" | "plan" | "layers" | "material" | "package" | "use";

export const SCENES: readonly { id: SceneId; start: number; end: number }[] = [
  { id: "draw", start: 0, end: 0.075 },
  { id: "meet", start: 0.075, end: 0.165 },
  { id: "explode", start: 0.165, end: 0.26 },
  { id: "print", start: 0.26, end: 0.366 },
  // The printed mug takes over from the printer.
  { id: "reveal", start: 0.366, end: 0.441 },
  // Four looks at the fresh mug: its heat, its plan, its layers, its material.
  { id: "heat", start: 0.441, end: 0.504 },
  { id: "plan", start: 0.504, end: 0.567 },
  { id: "layers", start: 0.567, end: 0.63 },
  { id: "material", start: 0.63, end: 0.696 },
  // The open model package: the mug goes into it, and what comes with every model comes out.
  { id: "package", start: 0.696, end: 0.91 },
  { id: "use", start: 0.91, end: 1 },
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
