// The home story's scenes on a 0..1 scroll timeline.

export type SceneId = "draw" | "meet" | "explode" | "print" | "reveal" | "heat" | "plan" | "layers" | "material" | "package" | "use";

/**
 * How much scrolling each scene gets, in svh (screen heights / 100). The
 * story's text beats are made exactly this tall, so each text arrives with
 * its scene. The moments that matter most get the most room.
 */
export const SCENE_SVH: readonly [SceneId, number][] = [
  ["draw", 160],
  ["meet", 200],
  ["explode", 260],
  ["print", 320],
  // The printed mug takes over from the printer.
  ["reveal", 380],
  // Four looks at the fresh mug: its heat, its plan, its layers, its material.
  ["heat", 240],
  ["plan", 280],
  ["layers", 240],
  ["material", 220],
  // The open model package: the mug goes into it, and what comes with every model comes out.
  ["package", 660],
  ["use", 260],
];

/**
 * The scenes on the 0..1 timeline. The story's scroll ends one screen before
 * its last beat does (the stage is a screen tall), so the last scene's share
 * is a screen shorter than its beat.
 */
export const SCENES: readonly { id: SceneId; start: number; end: number }[] = (() => {
  const total = SCENE_SVH.reduce((sum, [, svh]) => sum + svh, 0) - 100;
  let at = 0;
  return SCENE_SVH.map(([id, svh], i) => {
    const start = at;
    at = i === SCENE_SVH.length - 1 ? 1 : at + svh / total;
    return { id, start, end: at };
  });
})();

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
