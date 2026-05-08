import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Board } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null) {
  if (!value) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function safeJsonParse<T>(value: string) {
  return JSON.parse(value) as T;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getFileExtension(filename: string) {
  const segments = filename.split(".");
  return segments.length > 1 ? segments.at(-1) ?? "webm" : "webm";
}

/**
 * Returns the number of whole days since a chapter's kickoff was completed.
 * Returns null if the chapter hasn't been kicked off yet.
 */
export function getChapterAgeDays(board: Board): number | null {
  if (!board.kickoffCompletedAt) return null;
  const started = new Date(board.kickoffCompletedAt).getTime();
  const now = Date.now();
  return Math.floor((now - started) / (1000 * 60 * 60 * 24));
}
