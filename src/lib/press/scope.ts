import type { ScopeId } from "./share-types";

export type ScopedChapter = { name: string; goal: string | null; story: string | null; status: string };
export type ScopedChapterEntry = ScopedChapter & { detail: "full" | "summary" };

/**
 * Maps a Step 2 scope choice onto which chapters get full story detail vs.
 * just a name/goal mention in the generation prompt.
 */
export function scopeChapters(scope: ScopeId, chapters: ScopedChapter[]): ScopedChapterEntry[] {
  if (chapters.length === 0) return [];
  const last = chapters[chapters.length - 1];

  switch (scope) {
    case "just_chapter":
      return [{ ...last, detail: "full" }];
    case "chapter_recap":
      return [
        ...chapters.slice(0, -1).map((c) => ({ ...c, detail: "summary" as const })),
        { ...last, detail: "full" as const },
      ];
    case "last_few":
      return chapters.slice(-3).map((c) => ({ ...c, detail: "full" as const }));
    case "whole_story":
    case "specific":
    default:
      return chapters.map((c) => ({ ...c, detail: "full" as const }));
  }
}
