import type { StaticImageData } from "next/image";
import dark0 from "@/assets/story/dark-0.webp";
import dark1 from "@/assets/story/dark-1.webp";
import dark2 from "@/assets/story/dark-2.webp";
import dark3 from "@/assets/story/dark-3.webp";
import dark4 from "@/assets/story/dark-4.webp";
import dark5 from "@/assets/story/dark-5.webp";
import dark6 from "@/assets/story/dark-6.webp";
import dark7 from "@/assets/story/dark-7.webp";
import dark8 from "@/assets/story/dark-8.webp";
import dark9 from "@/assets/story/dark-9.webp";
import dark10 from "@/assets/story/dark-10.webp";
import light0 from "@/assets/story/light-0.webp";
import light1 from "@/assets/story/light-1.webp";
import light2 from "@/assets/story/light-2.webp";
import light3 from "@/assets/story/light-3.webp";
import light4 from "@/assets/story/light-4.webp";
import light5 from "@/assets/story/light-5.webp";
import light6 from "@/assets/story/light-6.webp";
import light7 from "@/assets/story/light-7.webp";
import light8 from "@/assets/story/light-8.webp";
import light9 from "@/assets/story/light-9.webp";
import light10 from "@/assets/story/light-10.webp";
import type { Theme } from "@/theme/theme";

/**
 * Still frames of the ten story scenes, rendered from the 3D scene by
 * scripts/render-stills.mjs. Shown before the scene loads and to visitors with
 * reduced motion or without WebGL.
 */
export const STILLS: Record<Theme, StaticImageData[]> = {
  light: [light1, light2, light3, light4, light5, light6, light7, light8, light9, light10],
  dark: [dark1, dark2, dark3, dark4, dark5, dark6, dark7, dark8, dark9, dark10],
};

/** The scene at the very top of the page, shown on the stage until the scene loads. */
export const POSTERS: Record<Theme, StaticImageData> = { light: light0, dark: dark0 };
