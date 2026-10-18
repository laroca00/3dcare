/** Rendering detail: 2 is the highest, 0 keeps only the main shapes. */
export type QualityLevel = 0 | 1 | 2;

export function initialQuality(env: { width: number; dpr: number; cores: number }): QualityLevel {
  return env.width < 768 || env.cores <= 4 ? 1 : 2;
}

const WINDOW = 60;

/**
 * Lowers quality one step when the average frame time over a full window of
 * frames exceeds the budget. It never raises quality again, so the scene does
 * not flicker between levels.
 */
export class QualityController {
  private current: QualityLevel;
  private readonly budgetMs: number;
  private frames = 0;
  private total = 0;

  constructor(start: QualityLevel, budgetMs = 1000 / 50) {
    this.current = start;
    this.budgetMs = budgetMs;
  }

  get level(): QualityLevel {
    return this.current;
  }

  sample(frameMs: number): QualityLevel {
    this.frames++;
    this.total += frameMs;
    if (this.frames >= WINDOW) {
      if (this.total / this.frames > this.budgetMs && this.current > 0) {
        this.current = (this.current - 1) as QualityLevel;
      }
      this.frames = 0;
      this.total = 0;
    }
    return this.current;
  }
}
