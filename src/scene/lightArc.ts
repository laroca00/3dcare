// The story told in light: a cool blueprint at the start, a neutral studio when
// the printer appears, a focused workshop while it is apart, a slightly warmer
// room while it prints, darkness round the freshly printed mug, and a sunny
// morning at the end.
import type { Theme } from "../theme/theme";
import { mixStudio, type StudioValues } from "./studioMix.ts";
import { smoothstep } from "./timeline.ts";

export type Mood = "blueprint" | "studio" | "workshop" | "printing" | "hero" | "morning";

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
    blueprint: { ...DARK_STUDIO, background: 0x0b1420, glow: 0x123352, key: 0xcfe0ff, keyIntensity: 3, rim: 0x7fbfff, fill: 0.36 },
    studio: DARK_STUDIO,
    // Darker surroundings, one strong light on the parts.
    workshop: { ...DARK_STUDIO, background: 0x0b0e10, glow: 0x0c2b2b, glowStrength: 0.7, key: 0xf4f7ff, keyIntensity: 4.6, fill: 0.16, env: 0.5 },
    printing: { ...DARK_STUDIO, background: 0x121514, glow: 0x183530, key: 0xfff0dd, fill: 0.28 },
    // The printer goes into the dark; one light and a strong rim on the mug.
    hero: { ...DARK_STUDIO, background: 0x060809, glow: 0x0b2826, glowStrength: 0.6, keyIntensity: 3.2, rimIntensity: 5.5, fill: 0.1, env: 0.4 },
    // Studio lights dim so the sunbeam through the window reads on the table.
    morning: { ...DARK_STUDIO, background: 0x17120e, glow: 0x4a2a12, key: 0xffcf9a, keyIntensity: 1.1, fill: 0.16 },
  },
  light: {
    blueprint: { ...LIGHT_STUDIO, background: 0xeef3f8, glow: 0xd3e1ee, key: 0xeef4ff, fill: 1.15 },
    studio: LIGHT_STUDIO,
    workshop: { ...LIGHT_STUDIO, background: 0xeceeed, glow: 0xd5dbd8, keyIntensity: 3.3, fill: 0.75 },
    printing: { ...LIGHT_STUDIO, background: 0xf6f5f1, glow: 0xe6e0d5, key: 0xfff6ea },
    hero: { ...LIGHT_STUDIO, background: 0xd9dfdc, glow: 0xf7f9f8, glowStrength: 1, keyIntensity: 2.9, fill: 0.55, env: 0.75 },
    morning: { ...LIGHT_STUDIO, background: 0xf6ebdd, glow: 0xf1cf9f, key: 0xffe2bd, keyIntensity: 0.9, fill: 0.55 },
  },
};

/** Story progress at which each mood holds; between them the light blends. */
const KEYS: readonly [number, Mood][] = [
  [0, "blueprint"],
  [0.105, "blueprint"],
  [0.19, "studio"],
  [0.31, "studio"],
  [0.39, "workshop"],
  [0.49, "workshop"],
  [0.54, "printing"],
  [0.69, "printing"],
  [0.72, "hero"],
  [0.88, "hero"],
  [0.95, "morning"],
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
