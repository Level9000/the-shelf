import { NextResponse } from "next/server";
import { runCassChapterKickoffDialogue } from "@/lib/ai/anthropic";
import { strategicDialogueMessageSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    messages?: Array<{ role?: string; content?: string }>;
    projectId?: string;
    chapterId?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const chapterId = String(payload.chapterId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectId || !chapterId) {
    return NextResponse.json(
      { error: "Project and chapter are required." },
      { status: 400 },
    );
  }

  // Empty messages = opener request (component fetches the opening line on mount)
  const effectiveMessages =
    messages.length === 0
      ? [{ role: "user" as const, content: "__kickoff_open__" }]
      : messages;

  // Load project + board context
  const [
    { data: project, error: projectError },
    { data: board, error: boardError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,north_star,project_goal")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id,name,goal,why_it_matters,success_looks_like,done_definition,kickoff_prefilled_at,position")
      .eq("id", chapterId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (projectError || !project || boardError || !board) {
    return NextResponse.json(
      { error: "Chapter context not found." },
      { status: 404 },
    );
  }

  // Find previous chapter for narrative continuity (goal + story)
  const { data: previousBoards } = await supabase
    .from("boards")
    .select("name,goal,chapter_story,position")
    .eq("project_id", projectId)
    .neq("id", chapterId)
    .not("kickoff_completed_at", "is", null)
    .order("position", { ascending: false })
    .limit(1);

  const previousChapterGoal =
    (previousBoards?.[0]?.goal as string | null) ?? null;
  const previousChapterStory =
    (previousBoards?.[0]?.chapter_story as string | null) ?? null;

  // Determine chapter number from position
  const { data: allBoards } = await supabase
    .from("boards")
    .select("id,position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const chapterIndex = (allBoards ?? []).findIndex((b) => String(b.id) === chapterId);
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : 1;

  const isPrefilled = Boolean(board.kickoff_prefilled_at);

  try {
    const result = await runCassChapterKickoffDialogue({
      messages: effectiveMessages,
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      projectGoal: (project.project_goal as string | null) ?? null,
      chapterNumber,
      chapterName: String(board.name),
      previousChapterGoal,
      previousChapterStory,
      prefill: isPrefilled
        ? {
            goal: (board.goal as string | null) ?? null,
            value: (board.why_it_matters as string | null) ?? null,
            measure: (board.success_looks_like as string | null) ?? null,
            done: (board.done_definition as string | null) ?? null,
          }
        : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass chapter kickoff failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cass chapter kickoff failed.",
      },
      { status: 500 },
    );
  }
}
