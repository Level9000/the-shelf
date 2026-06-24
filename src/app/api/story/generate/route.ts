/**
 * POST /api/story/generate
 *
 * Orchestrates the full narrative pipeline after a retro is complete:
 *   1. Load retro_beats + card data from Supabase
 *   2. Load chapter history (for arc context + health check)
 *   3. Assemble chapter brief
 *   4. Detect chapter type
 *   5. Detect stitching pattern (two-chapter transitions)
 *   6. Run narrative engine Pass 1 + Pass 2
 *   7. Run story health check
 *   8. Save chapter_type, headline, subheadline, chapter_story, health fields to boards
 *   9. Save health report to story_health_reports
 *  10. Return {headline, subheadline, body, chapterType, pullQuote}
 *
 * Designed to be called by the CassRetroChat component after the retro is saved.
 * Runs synchronously (no background job queue) — use Vercel max duration if needed.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assembleChapterBrief,
  detectChapterType,
  formatBriefForWriter,
  type CardSummary,
  type ArcChapter,
} from "@/lib/ai/chapter-intelligence";
import {
  runStoryHealthCheck,
  type HealthCheckChapter,
} from "@/lib/ai/story-health";
import { runNarrativeEngine } from "@/lib/ai/anthropic";
import { detectStitchingPattern } from "@/prompts/chapter-templates";
import type { ChapterType } from "@/prompts/chapter-templates";
import type { RetroBeats } from "@/lib/ai/schema";

export const runtime = "nodejs";
// Allow up to 5 minutes for two AI passes (Pass 1 + Pass 2)
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    projectId?: string;
    chapterId?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const chapterId = String(payload.chapterId ?? "");

  if (!projectId || !chapterId) {
    return NextResponse.json(
      { error: "projectId and chapterId are required." },
      { status: 400 },
    );
  }

  // ── 1. Load chapter + project context ─────────────────────────────────────
  const [
    { data: project, error: projectError },
    { data: board,   error: boardError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,north_star,accumulative_story,project_kickoff_conversation")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select(`
        id,name,position,goal,why_it_matters,success_looks_like,done_definition,
        chapter_story,chapter_type,confirmed_thesis,bridge_sentence,
        retro_beats,story_health_flag,retro_completed_at,deferred_tasks
      `)
      .eq("id", chapterId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (boardError || !board) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (!board.retro_completed_at) {
    return NextResponse.json(
      { error: "Retro must be completed before generating the chapter story." },
      { status: 400 },
    );
  }

  // ── 2. Load card data ──────────────────────────────────────────────────────
  const [{ data: columns }, { data: tasks }] = await Promise.all([
    supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
    supabase
      .from("tasks")
      .select("id,title,column_id,emotional_tag,created_at")
      .eq("board_id", chapterId),
  ]);

  const doneColumnId = (columns ?? []).find(
    (col) => String(col.name).toLowerCase() === "done",
  )?.id;

  const allTasks = tasks ?? [];
  const retroCompletedTimestamp = new Date(board.retro_completed_at ?? 0).getTime();

  const cards: CardSummary[] = allTasks.map((t) => {
    const isComplete = doneColumnId && String(t.column_id) === String(doneColumnId);
    const taskCreated = new Date(t.created_at as string).getTime();
    return {
      title:         String(t.title),
      status:        isComplete ? "complete" : "todo",
      emotional_tag: (t.emotional_tag as "excited" | "neutral" | "dreaded" | null) ?? null,
      // "mid_chapter" = created after retro was completed
      added_at:      taskCreated > retroCompletedTimestamp ? "mid_chapter" : "kickoff",
    };
  });

  // Tasks that were moved to a future chapter or deleted when this chapter
  // ended early (see endChapterEarlyAction) — without this, they'd silently
  // vanish from the brief since they're no longer on this board's task list.
  const deferredTasks = (board.deferred_tasks as Array<{ title: string; action: "moved" | "deleted" }> | null) ?? [];
  for (const t of deferredTasks) {
    cards.push({
      title:         t.title,
      status:        t.action === "moved" ? "deferred" : "dropped",
      emotional_tag: null,
      added_at:      "kickoff",
    });
  }

  // ── 3. Load chapter history for arc context ────────────────────────────────
  const { data: allBoards } = await supabase
    .from("boards")
    .select(`
      id,position,chapter_type,confirmed_thesis,retro_beats,
      chapter_story,bridge_sentence,story_health_flag
    `)
    .eq("project_id", projectId)
    .not("retro_completed_at", "is", null)
    .order("position", { ascending: true });

  const chapterHistory: ArcChapter[] = (allBoards ?? [])
    .filter((b) => String(b.id) !== chapterId)
    .map((b) => ({
      chapter_type:     (b.chapter_type as ChapterType | null) ?? null,
      confirmed_thesis: (b.confirmed_thesis as string | null) ?? null,
      kickoff_beats:    null,
      retro_beats:      (b.retro_beats as RetroBeats | null) ?? null,
    }));

  // Previous chapter (for brief + stitching)
  const sortedBoards = (allBoards ?? []).sort(
    (a, b) => (a.position as number) - (b.position as number),
  );
  const currentIndex = sortedBoards.findIndex((b) => String(b.id) === chapterId);
  const prevBoard    = currentIndex > 0 ? sortedBoards[currentIndex - 1] : null;

  // ── 4. Determine re-centering state ───────────────────────────────────────
  const storyHealthFlag =
    (board.story_health_flag as "none" | "recentering_needed") ?? "none";

  // Founding thesis = north_star or chapter 1's confirmed_thesis
  const foundingThesis =
    (project.north_star as string | null) ??
    (sortedBoards[0]?.confirmed_thesis as string | null) ??
    null;

  // Season name — look for active season (simplified: not implemented server-side yet)
  const seasonName: string | null = null;

  // ── 5. Assemble brief ──────────────────────────────────────────────────────
  const kickoffBeats = {
    context: { previous_chapter_summary: "", incoming_feeling: "" },
    work: {
      goal:               (board.goal as string | null) ?? "",
      why_it_matters:     (board.why_it_matters as string | null) ?? "",
      success_definition: (board.success_looks_like as string | null) ?? "",
      target_completion:  "",
    },
    stakes:           { biggest_risk: "", personal_meaning: "", gut_feeling: "" },
    confirmed_thesis: (board.confirmed_thesis as string | null) ?? "",
  };

  const retroBeats = (board.retro_beats as RetroBeats | null) ?? {
    accounting:     { overall_rating: "3", most_proud_of: "" },
    surprise:       { biggest_surprise: "", easier_than_expected: "", harder_than_expected: "", unplanned_events: "" },
    learning:       { new_knowledge: "", thinking_shift: "", would_do_differently: "" },
    emotional_close: { gut_feeling_delta: "", road_ahead_feeling: "", weighing_or_energizing: "" },
  };

  const brief = assembleChapterBrief({
    previousChapter: prevBoard
      ? {
          summary:        String(prevBoard.chapter_story ?? ""),
          chapterType:    (prevBoard.chapter_type as ChapterType | null) ?? null,
          bridgeSentence: String(prevBoard.bridge_sentence ?? ""),
        }
      : null,
    arcHistory:      chapterHistory,
    storyHealthFlag,
    seasonName,
    foundingThesis,
    kickoffBeats,
    cards,
    retroBeats,
  });

  // ── 6. Detect chapter type ─────────────────────────────────────────────────
  const chapterType = detectChapterType(brief);

  // ── 7. Detect stitching pattern ────────────────────────────────────────────
  const stitchingPattern = detectStitchingPattern(
    brief.previousChapterType,
    chapterType,
  );

  // ── 8. Run narrative engine (Pass 1 + Pass 2) ─────────────────────────────
  const briefText = formatBriefForWriter(brief);

  let narrativeOutput;
  try {
    narrativeOutput = await runNarrativeEngine({
      chapterBriefText: briefText,
      chapterType,
      stitchingPattern,
    });
  } catch (err) {
    console.error("Narrative engine failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Chapter generation failed. Please try again.",
      },
      { status: 500 },
    );
  }

  // ── 9. Run story health check ──────────────────────────────────────────────
  const healthHistory: HealthCheckChapter[] = [
    ...chapterHistory,
    { chapter_type: chapterType, confirmed_thesis: board.confirmed_thesis as string | null, kickoff_beats: kickoffBeats, retro_beats: retroBeats },
  ];

  const healthReport = runStoryHealthCheck(healthHistory, foundingThesis);

  // ── 10. Save chapter story + type + health fields to board ─────────────────
  const { error: updateError } = await supabase
    .from("boards")
    .update({
      chapter_type:        chapterType,
      chapter_headline:    narrativeOutput.headline,
      chapter_subheadline: narrativeOutput.subheadline,
      chapter_story:       narrativeOutput.body,
      story_health_flag:   healthReport.recentering_needed ? "recentering_needed" : "none",
      recentering_type:    healthReport.recentering_type ?? null,
    })
    .eq("id", chapterId)
    .eq("project_id", projectId);

  if (updateError) {
    console.error("Failed to save chapter story", updateError);
    return NextResponse.json(
      { error: `Failed to save chapter: ${updateError.message}` },
      { status: 500 },
    );
  }

  // ── 11. Save story health report ──────────────────────────────────────────
  await supabase.from("story_health_reports").insert({
    chapter_id:           chapterId,
    project_id:           projectId,
    chapters_scored:      healthReport.chapters_scored,
    signals:              healthReport.signals,
    failing_signal_count: healthReport.failing_signal_count,
    patterns_detected:    healthReport.patterns_detected,
    recentering_needed:   healthReport.recentering_needed,
    recentering_type:     healthReport.recentering_type,
  });

  // ── 12. Extract pull quote from body (line starting with quotation mark) ───
  const pullQuote = extractPullQuote(narrativeOutput.body);

  return NextResponse.json({
    headline:    narrativeOutput.headline,
    subheadline: narrativeOutput.subheadline,
    body:        narrativeOutput.body,
    chapterType,
    pullQuote,
    healthReport: {
      recentering_needed: healthReport.recentering_needed,
      patterns_detected:  healthReport.patterns_detected,
    },
  });
}

/** Extract the pull quote line from the chapter body. */
function extractPullQuote(body: string): string {
  const lines = body.split("\n");
  // Pull quote is set apart on its own line, often starts with a quotation mark
  // or is a short standalone line surrounded by blank lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.startsWith('"') ||
      line.startsWith('\u201c') || // "
      (
        i > 0 &&
        i < lines.length - 1 &&
        lines[i - 1].trim() === "" &&
        lines[i + 1].trim() === "" &&
        line.length > 20 &&
        line.length < 200
      )
    ) {
      return line;
    }
  }
  // Fallback: return first sentence of body
  return body.split(/[.!?]/)[0]?.trim() ?? "";
}
