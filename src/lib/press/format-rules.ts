import type { FormatId } from "./share-types";

/**
 * Structural constraints per format, applied silently at generation time.
 * Never surfaced to the user — Cass just writes to it.
 */
export const FORMAT_RULES: Record<
  FormatId,
  { charLimit?: number; softWordRange?: [number, number]; voice: string }
> = {
  network: { charLimit: 3000, voice: "Personal, hook-first, no headers." },
  social: { charLimit: 280, voice: "Punchy, single beat." },
  blog: { voice: "Most narrative freedom, headers okay." },
  investors: { softWordRange: [300, 600], voice: "Structured: traction, challenges, ask." },
  leadership: { voice: "Status-update register, bullet-friendly." },
};
