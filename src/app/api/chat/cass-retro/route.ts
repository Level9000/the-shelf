import { NextResponse } from "next/server";
import { runCassRetroDialogue } from "@/lib/ai/anthropic";
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
    avatar?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const chapterId = String(payload.chapterId ?? "");
  const avatar = payload.avatar ?? "cass";
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

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  // Load project + board — include new storytelling fields
  const [
    { data: project, error: projectError },
    { data: board,   error: boardError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,north_star,accumulative_story")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select(`
        id,name,goal,why_it_matters,success_looks_like,done_definition,
        confirmed_thesis,story_health_flag,
        recentering_type,position
      `)
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

  // Load tasks
  const [{ data: columns }, { data: tasks }] = await Promise.all([
    supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
    supabase
      .from("tasks")
      .select("id,title,column_id,priority")
      .eq("board_id", chapterId),
  ]);

  const doneColumnId = (columns ?? []).find(
    (col) => String(col.name).toLowerCase() === "done",
  )?.id;

  const allTasks = tasks ?? [];
  const completedTasks = doneColumnId
    ? allTasks.filter((t) => String(t.column_id) === String(doneColumnId))
    : [];
  const incompleteTasks = doneColumnId
    ? allTasks.filter((t) => String(t.column_id) !== String(doneColumnId))
    : allTasks;

  const confirmedThesis   = (board.confirmed_thesis as string | null) ?? null;

  // Determine re-centering type (pass to retro if active)
  const storyHealthFlag  = (board.story_health_flag as string | null) ?? "none";
  const recenteringType  = storyHealthFlag === "recentering_needed"
    ? (board.recentering_type as string | null) ?? null
    : null;

  try {
    const result = await runCassRetroDialogue({
      messages,
      projectName:    String(project.name),
      northStar:      (project.north_star as string | null) ?? null,
      accumulativeStory: (project.accumulative_story as string | null) ?? null,
      avatar,
      chapter: {
        number:           1, // API route omitted; number derived from position
        name:             String(board.name),
        goal:             (board.goal as string | null) ?? null,
        whyItMatters:     (board.why_it_matters as string | null) ?? null,
        successLooksLike: (board.success_looks_like as string | null) ?? null,
        doneDefinition:   (board.done_definition as string | null) ?? null,
        confirmedThesis,
      },
      completedTasks:  completedTasks.map((t) => ({ title: String(t.title) })),
      incompleteTasks: incompleteTasks.map((t) => ({ title: String(t.title) })),
      recenteringType,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass retro dialogue failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cass retro dialogue failed.",
      },
      { status: 500 },
    );
  }
}
