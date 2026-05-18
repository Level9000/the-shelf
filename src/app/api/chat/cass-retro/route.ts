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

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  // Load project + board
  const [
    { data: project, error: projectError },
    { data: board, error: boardError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,north_star,accumulative_story")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id,name,goal,why_it_matters,success_looks_like,done_definition,kickoff_completed_at,position")
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

  if (!board.kickoff_completed_at) {
    return NextResponse.json(
      { error: "Chapter must be kicked off before running a retro." },
      { status: 400 },
    );
  }

  // Load tasks with context for standout card selection
  const [{ data: columns }, { data: tasks }] = await Promise.all([
    supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
    supabase.from("tasks").select("id,title,column_id,context,priority").eq("board_id", chapterId),
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

  // Select standout card: prefer highest-priority completed, else a notable incomplete
  const standoutCard =
    completedTasks.find((t) => t.priority === "high")?.title ??
    completedTasks.find((t) => t.priority === "medium")?.title ??
    completedTasks[0]?.title ??
    incompleteTasks[0]?.title ??
    null;

  // Determine chapter number
  const { data: allBoards } = await supabase
    .from("boards")
    .select("id,position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const chapterIndex = (allBoards ?? []).findIndex((b) => String(b.id) === chapterId);
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : 1;

  try {
    const result = await runCassRetroDialogue({
      messages,
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      accumulativeStory: (project.accumulative_story as string | null) ?? null,
      chapter: {
        number: chapterNumber,
        name: String(board.name),
        goal: (board.goal as string | null) ?? null,
        whyItMatters: (board.why_it_matters as string | null) ?? null,
        successLooksLike: (board.success_looks_like as string | null) ?? null,
        doneDefinition: (board.done_definition as string | null) ?? null,
      },
      completedTasks: completedTasks.map((t) => ({
        title: String(t.title),
        context: (t.context as string | null) ?? null,
      })),
      incompleteTasks: incompleteTasks.map((t) => ({ title: String(t.title) })),
      standoutCard: standoutCard ? String(standoutCard) : null,
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
