import type { Priority } from "@/types";

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
