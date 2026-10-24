// The story told in light: a cool blueprint at the start, a neutral studio when
// the printer appears, a focused workshop while it is apart, a slightly warmer
// room while it prints, darkness round the freshly printed mug, a thermal
// camera's cold violet, the blueprint again for its plan, a warm cream room
// for its material, and a sunny morning at the end.
import type { Theme } from "../theme/theme";
import { mixStudio, type StudioValues } from "./studioMix.ts";
import { at, smoothstep } from "./timeline.ts";

export type Mood = "desk" | "blueprint" | "studio" | "workshop" | "printing" | "hero" | "thermal" | "material" | "morning";

const DARK_STUDIO: StudioValues = {
  background: 0x101416,
  glow: 0x0f3b3c,
  glowStrength: 0.85,
  key: 0xe4efff,
  keyIntensity: 3.6,
  rim: 0x6fe0cf,
  rimIntensity: 4,
  fill: 0.3,
  env: 0.55,
  shadow: 0.9,
};

const LIGHT_STUDIO: StudioValues = {
  background: 0xf5f7f6,
  glow: 0xdfe5e2,
  glowStrength: 0.9,
  key: 0xffffff,
  keyIntensity: 2.6,
  rim: 0xffffff,
  rimIntensity: 1.4,
  fill: 1.1,
  env: 0.9,
  shadow: 0.55,
};

export const MOODS: Record<Theme, Record<Mood, StudioValues>> = {
  dark: {
    // The opening desk: warm afternoon light, soft fill, no cool tint.
    desk: { ...DARK_STUDIO, background: 0x1c140d, glow: 0x3a2716, glowStrength: 0.8, key: 0xfff0de, keyIntensity: 1.1, rim: 0xffe2c4, rimIntensity: 0.8, fill: 0.3, env: 0.42, shadow: 0.8 },
    blueprint: { ...DARK_STUDIO, background: 0x0b1420, glow: 0x123352, key: 0xcfe0ff, keyIntensity: 3, rim: 0x7fbfff, fill: 0.36 },
    studio: DARK_STUDIO,
    // Darker surroundings, one strong light on the parts.
    workshop: { ...DARK_STUDIO, background: 0x0b0e10, glow: 0x0c2b2b, glowStrength: 0.7, key: 0xf4f7ff, keyIntensity: 4.6, fill: 0.16, env: 0.5 },
    printing: { ...DARK_STUDIO, background: 0x121514, glow: 0x183530, key: 0xfff0dd, fill: 0.28 },
    // The printer goes into the dark; one light and a strong rim on the mug.
    // Deep ink blue with a violet glow, so the teal mug and line stand out.
    hero: { ...DARK_STUDIO, background: 0x050a18, glow: 0x3a2580, glowStrength: 1, keyIntensity: 3.2, rimIntensity: 5.5, fill: 0.1, env: 0.4 },
    // Seen through a thermal camera, everything round the warm mug is cold.
    thermal: { ...DARK_STUDIO, background: 0x08051a, glow: 0x2a0e4a, glowStrength: 0.8, keyIntensity: 1.2, rimIntensity: 1.5, fill: 0.1, env: 0.2 },
    // Warm and dim, with sunlight filtering through leaves.
    material: { ...DARK_STUDIO, background: 0x16120d, glow: 0x3b2c15, glowStrength: 0.8, key: 0xffe2b8, keyIntensity: 2.6, rim: 0xffd9a0, rimIntensity: 2.5, fill: 0.22 },
    // Studio lights dim so the sunbeam through the window reads on the table.
    morning: { ...DARK_STUDIO, background: 0x17120e, glow: 0x4a2a12, key: 0xffcf9a, keyIntensity: 1.1, fill: 0.16 },
  },
  light: {
    desk: { ...LIGHT_STUDIO, key: 0xffe2bf, keyIntensity: 3.4, fill: 0.6 },
    blueprint: { ...LIGHT_STUDIO, background: 0xeef3f8, glow: 0xd3e1ee, key: 0xeef4ff, fill: 1.15 },
    studio: LIGHT_STUDIO,
    workshop: { ...LIGHT_STUDIO, background: 0xeceeed, glow: 0xd5dbd8, keyIntensity: 3.3, fill: 0.75 },
    printing: { ...LIGHT_STUDIO, background: 0xf6f5f1, glow: 0xe6e0d5, key: 0xfff6ea },
    hero: { ...LIGHT_STUDIO, background: 0xdfe3f2, glow: 0xfff1d6, glowStrength: 1, keyIntensity: 2.9, fill: 0.55, env: 0.75 },
    thermal: { ...LIGHT_STUDIO, background: 0xe6e1f0, glow: 0xd4c8ea, keyIntensity: 1.6, fill: 0.6, env: 0.5 },
    // A cream room in daylight.
    material: { ...LIGHT_STUDIO, background: 0xf3ead8, glow: 0xfff7e6, key: 0xfff1dc, keyIntensity: 2.8, fill: 0.95 },
    morning: { ...LIGHT_STUDIO, background: 0xf6ebdd, glow: 0xf1cf9f, key: 0xffe2bd, keyIntensity: 0.9, fill: 0.55 },
  },
};

/** Story progress at which each mood holds; between them the light blends. */
const KEYS: readonly [number, Mood][] = [
  [0, "desk"],
  [at("draw", 0.45), "desk"],
  [at("draw", 0.9), "blueprint"],
  [at("meet", 0.3), "studio"],
  [at("explode", 0), "studio"],
  [at("explode", 0.45), "workshop"],
  [at("print", 0), "workshop"],
  [at("print", 0.25), "printing"],
  [at("reveal", 0), "printing"],
  [at("reveal", 0.2), "hero"],
  [at("reveal", 0.9), "hero"],
  [at("heat", 0.2), "thermal"],
  [at("heat", 0.85), "thermal"],
  [at("plan", 0.2), "blueprint"],
  [at("plan", 0.85), "blueprint"],
  [at("layers", 0.2), "hero"],
  [at("layers", 0.85), "hero"],
  [at("material", 0.2), "material"],
  [at("material", 0.85), "material"],
  // The package opens in a calm studio.
  [at("package", 0.12), "studio"],
  [at("package", 0.9), "studio"],
  [at("use", 0.7), "morning"],
];

/** The studio's light at a point in the story. */
export function storyLook(theme: Theme, progress: number): StudioValues {
  const looks = MOODS[theme];
  if (progress <= KEYS[0][0]) return looks[KEYS[0][1]];
  for (let i = 1; i < KEYS.length; i++) {
    const [to, mood] = KEYS[i];
    if (progress <= to) {
      const [from, previous] = KEYS[i - 1];
      if (mood === previous) return looks[mood];
      return mixStudio(looks[previous], looks[mood], smoothstep((progress - from) / (to - from)));
    }
  }
  return looks[KEYS[KEYS.length - 1][1]];
}
