import { NextResponse } from "next/server";
import { runCassChapterContextDialogue } from "@/lib/ai/anthropic";
import { strategicDialogueMessageSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshBackstoryGapSignal } from "@/lib/ai/backstory-gap";
import { loadCassStoryContext } from "@/lib/ai/cass-context";

export const runtime = "nodejs";

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
    messages?: Array<{ role?: string; content?: string }>;
    acceptedParagraph?: { originalText?: string; newText?: string };
    acceptedReframe?: { newChapterType?: string };
    approvedAffectedChapters?: Array<{ chapterId?: string; chapterName?: string; reason?: string }>;
  };

  const projectId = String(payload.projectId ?? "");
  const chapterId = String(payload.chapterId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectId || !chapterId) {
    return NextResponse.json({ error: "Project and chapter are required." }, { status: 400 });
  }

  const [{ data: project, error: projectError }, { data: board, error: boardError }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
    supabase
      .from("boards")
      .select("id, name, chapter_story, goal, chapter_type")
      .eq("id", chapterId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (projectError || !project || boardError || !board) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  // ── Apply any action the author already confirmed in the UI, before this turn's dialogue ──
  if (payload.acceptedParagraph?.originalText && payload.acceptedParagraph.newText) {
    const currentStory = (board.chapter_story as string | null) ?? "";
    if (currentStory.includes(payload.acceptedParagraph.originalText)) {
      const updatedStory = currentStory.replace(
        payload.acceptedParagraph.originalText,
        payload.acceptedParagraph.newText,
      );
      const { error: storyError } = await supabase
        .from("boards")
        .update({ chapter_story: updatedStory })
        .eq("id", chapterId)
        .eq("project_id", projectId);
      if (storyError) throw new Error(storyError.message);
      board.chapter_story = updatedStory;
    }
  }

  if (payload.acceptedReframe?.newChapterType) {
    const { error: typeError } = await supabase
      .from("boards")
      .update({ chapter_type: payload.acceptedReframe.newChapterType })
      .eq("id", chapterId)
      .eq("project_id", projectId);
    if (typeError) throw new Error(typeError.message);
    board.chapter_type = payload.acceptedReframe.newChapterType;
  }

  if (payload.approvedAffectedChapters && payload.approvedAffectedChapters.length > 0) {
    await Promise.all(
      payload.approvedAffectedChapters
        .filter((c) => c.chapterId && c.reason)
        .map((c) =>
          supabase
            .from("boards")
            .update({ needs_review_reason: c.reason })
            .eq("id", c.chapterId)
            .eq("project_id", projectId),
        ),
    );
  }

  const { data: fragmentRows } = await supabase
    .from("story_fragments")
    .select("content")
    .eq("chapter_id", chapterId)
    .eq("source", "chapter_capture")
    .order("created_at", { ascending: false })
    .limit(10);

  const existingNotes = (fragmentRows ?? []).map((f) => String(f.content));
  const storyContext = await loadCassStoryContext(supabase, projectId);
  const arcContext = storyContext.chapterSummaries.map((c) => ({
    id: c.id,
    name: c.name,
    chapterType: c.chapterType,
    headline: c.headline,
    storyExcerpt: c.storyExcerpt,
  }));

  try {
    const result = await runCassChapterContextDialogue({
      messages,
      projectName: String(project.name),
      chapterName: String(board.name),
      chapterId,
      chapterType: (board.chapter_type as string | null) ?? null,
      chapterStory: (board.chapter_story as string | null) ?? null,
      chapterGoal: (board.goal as string | null) ?? null,
      existingNotes,
      arcContext,
    });

    if (result.done && result.capturedNote) {
      const fullConversation = [...messages, { role: "assistant" as const, content: result.reply }];
      const { error: fragmentError } = await supabase.from("story_fragments").insert({
        user_id: user.id,
        project_id: projectId,
        chapter_id: chapterId,
        source: "chapter_capture",
        content: result.capturedNote,
        conversation: fullConversation,
      });

      if (fragmentError) console.error("Failed to save chapter context fragment", fragmentError);

      try {
        await refreshBackstoryGapSignal(supabase, projectId);
      } catch (err) {
        console.error("cass-chapter-context: backstory gap refresh failed", err);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass chapter context dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
