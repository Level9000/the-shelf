import type { Priority } from "@/types";

/** Bump this date string whenever you publish updated Terms or Privacy Policy.
 *  Users whose stored terms_version differs will be re-prompted on next login. */
export const CURRENT_TERMS_VERSION = "2026-05-30";

export const DEFAULT_COLUMNS = [
  "Do This Week",
  "Do Today",
  "Blocked",
  "Done",
] as const;

export const PRIORITY_OPTIONS: Array<{
  value: Exclude<Priority, null>;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const COLUMN_TINTS: Record<string, string> = {
  "Do This Week": "from-white to-yellow-50",
  "Do Today":     "from-white to-blue-50",
  "Blocked":      "from-white to-pink-50",
  Done:           "from-white to-green-50",
};
