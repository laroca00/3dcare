import type { StaticImageData } from "next/image";
import still0 from "@/assets/story/dark-0.webp";
import still1 from "@/assets/story/dark-1.webp";
import still2 from "@/assets/story/dark-2.webp";
import still3 from "@/assets/story/dark-3.webp";
import still4 from "@/assets/story/dark-4.webp";
import still5 from "@/assets/story/dark-5.webp";
import still6 from "@/assets/story/dark-6.webp";
import still7 from "@/assets/story/dark-7.webp";
import still8 from "@/assets/story/dark-8.webp";
import still9 from "@/assets/story/dark-9.webp";
import still10 from "@/assets/story/dark-10.webp";
import still11 from "@/assets/story/dark-11.webp";

/**
 * Still frames of the eleven story scenes, rendered from the 3D scene by
 * scripts/render-stills.mjs. Shown to visitors with reduced motion or without WebGL.
 */
export const STILLS: StaticImageData[] = [still1, still2, still3, still4, still5, still6, still7, still8, still9, still10, still11];

/** The scene at the very top of the page, shown on the stage until the scene loads. */
export const POSTER: StaticImageData = still0;
