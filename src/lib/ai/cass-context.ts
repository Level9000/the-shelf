import type { SupabaseClient } from "@supabase/supabase-js";
import { runStoryHealthCheck, type HealthCheckChapter } from "@/lib/ai/story-health";
import type { ChapterType, RetroBeats, StoryHealthReport } from "@/lib/ai/schema";

function condenseRetroHighlight(retroBeats: RetroBeats | null): string | null {
  if (!retroBeats) return null;
  const parts = [
    retroBeats.accounting.most_proud_of,
    retroBeats.surprise.biggest_surprise,
    retroBeats.learning.new_knowledge,
  ].filter((p) => p && p.trim().length > 0);
  if (parts.length === 0) return null;
  return parts.join(" ");
}

export interface StoryFragmentSummary {
  content: string;
  source: string;
  chapterId: string | null;
  createdAt: string;
}

export interface ChapterSummary {
  id: string;
  name: string;
  headline: string | null;
  subheadline: string | null;
  confirmedThesis: string | null;
  chapterType: ChapterType | null;
  /** Short excerpt of the written chapter, if any — not the full text, to keep prompts bounded. */
  storyExcerpt: string | null;
  /** Condensed from retro_beats (most_proud_of + biggest_surprise + new_knowledge) — not the raw retro transcript. */
  retroHighlight: string | null;
}

export interface CassStoryContext {
  northStar: string | null;
  accumulativeStory: string | null;
  pastChapterNames: string[];
  /** Per-chapter substance — headline, thesis, story excerpt, retro highlight — for every chapter, not just the active one. */
  chapterSummaries: ChapterSummary[];
  health: StoryHealthReport;
  /** Unstructured raw material — backstory, asides, anything that never fit a task or chapter beat. */
  fragments: StoryFragmentSummary[];
}

const FRAGMENT_LIMIT = 40;
const STORY_EXCERPT_LIMIT = 400;

/**
 * Shared context every Cass surface (board chat, retro, refocus) should pull from,
 * so each one isn't re-deriving the founder's story from scratch with its own query.
 */
export async function loadCassStoryContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
): Promise<CassStoryContext> {
  const [{ data: project }, { data: chapters }, { data: fragmentRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("north_star, accumulative_story")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select(
        "id, name, position, chapter_type, confirmed_thesis, kickoff_beats, retro_beats, chapter_story, chapter_headline, chapter_subheadline",
      )
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("story_fragments")
      .select("content, source, chapter_id, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(FRAGMENT_LIMIT),
  ]);

  const chapterRows = chapters ?? [];

  const health = runStoryHealthCheck(
    chapterRows.map((c) => ({
      chapter_type: (c.chapter_type as HealthCheckChapter["chapter_type"]) ?? null,
      confirmed_thesis: (c.confirmed_thesis as string | null) ?? null,
      kickoff_beats: (c.kickoff_beats as HealthCheckChapter["kickoff_beats"]) ?? null,
      retro_beats: (c.retro_beats as HealthCheckChapter["retro_beats"]) ?? null,
    })),
    (project?.north_star as string | null) ?? null,
  );

  const fragments: StoryFragmentSummary[] = (fragmentRows ?? []).map((f) => ({
    content: String(f.content),
    source: String(f.source),
    chapterId: (f.chapter_id as string | null) ?? null,
    createdAt: String(f.created_at),
  }));

  const chapterSummaries: ChapterSummary[] = chapterRows.map((c) => {
    const story = (c.chapter_story as string | null) ?? null;
    return {
      id: String(c.id),
      name: String(c.name),
      headline: (c.chapter_headline as string | null) ?? null,
      subheadline: (c.chapter_subheadline as string | null) ?? null,
      confirmedThesis: (c.confirmed_thesis as string | null) ?? null,
      chapterType: (c.chapter_type as ChapterType | null) ?? null,
      storyExcerpt: story ? story.slice(0, STORY_EXCERPT_LIMIT) : null,
      retroHighlight: condenseRetroHighlight((c.retro_beats as RetroBeats | null) ?? null),
    };
  });

  return {
    northStar: (project?.north_star as string | null) ?? null,
    accumulativeStory: (project?.accumulative_story as string | null) ?? null,
    pastChapterNames: chapterRows.map((c) => String(c.name)),
    chapterSummaries,
    health,
    fragments,
  };
}

/** Fragments scoped to a single chapter — for the per-chapter "add context" surface (2a). */
export function fragmentsForChapter(
  context: CassStoryContext,
  chapterId: string,
): StoryFragmentSummary[] {
  return context.fragments.filter((f) => f.chapterId === chapterId);
}

/** Project-level fragments only — backstory/foundation material with no chapter attached. */
export function foundationFragments(context: CassStoryContext): StoryFragmentSummary[] {
  return context.fragments.filter((f) => f.chapterId === null);
}

/** A single best-available line describing what actually happened in a chapter, for prompts that need substance, not just a title. */
export function summarizeChapterHighlight(c: ChapterSummary): string | null {
  const detail =
    (c.headline ? `${c.headline}${c.subheadline ? ` — ${c.subheadline}` : ""}` : null) ??
    c.confirmedThesis ??
    c.storyExcerpt ??
    c.retroHighlight;
  if (!detail || !detail.trim()) return null;
  return `${c.name}: ${detail}`.slice(0, 280);
}
