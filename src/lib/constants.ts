import type { Priority } from "@/types";

export const DEFAULT_COLUMNS = [
  "Stuff I Need to Do",
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
  "Stuff I Need to Do": "from-white to-slate-100/90",
  "Do This Week": "from-white to-sky-50",
  "Do Today": "from-white to-amber-50",
  "Blocked": "from-white to-rose-50",
  Done: "from-white to-emerald-50",
};
