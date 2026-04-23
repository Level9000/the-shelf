import type { Priority } from "@/types";

export const DEFAULT_COLUMNS = ["Inbox", "To Do", "In Progress", "Done"] as const;

export const PRIORITY_OPTIONS: Array<{
  value: Exclude<Priority, null>;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const COLUMN_TINTS: Record<string, string> = {
  Inbox: "from-white to-stone-100/80",
  "To Do": "from-white to-slate-100/90",
  "In Progress": "from-white to-amber-50",
  Done: "from-white to-emerald-50",
};
