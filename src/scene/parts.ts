/** The printer parts that separate in the exploded view, each with a label. */
export type PartId = "base" | "bed" | "frame" | "gantry" | "head" | "spool" | "display";

export const PART_IDS: readonly PartId[] = ["base", "bed", "frame", "gantry", "head", "spool", "display"];
