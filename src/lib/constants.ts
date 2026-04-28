import type { Priority } from "@/types";

export const DEFAULT_COLUMNS = [
  "To Do",
  "Do This Week",
  "In Progress",
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
  "To Do": "from-white to-slate-100/90",
  "Do This Week": "from-white to-sky-50",
  "In Progress": "from-white to-amber-50",
  Done: "from-white to-emerald-50",
};
