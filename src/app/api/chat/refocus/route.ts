import { NextResponse } from "next/server";
import { runChapterRefocusDialogue } from "@/lib/ai/anthropic";
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

  const [{ data: project, error: projectError }, { data: board, error: boardError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,name")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id,name,goal,opening_line,created_at")
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

  // Fetch columns + incomplete tasks
  const [{ data: columns, error: columnsError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
      supabase.from("tasks").select("id,title,column_id").eq("board_id", chapterId),
    ]);

  if (columnsError || tasksError) {
    return NextResponse.json(
      { error: "Failed to load chapter tasks." },
      { status: 500 },
    );
  }

  const allColumns = columns ?? [];
  const allTasks = tasks ?? [];

  const doneColumnId = allColumns.find(
    (col) => String(col.name).toLowerCase() === "done",
  )?.id;

  const columnNameById = new Map(
    allColumns.map((col) => [String(col.id), String(col.name)]),
  );

  const incompleteTasks = allTasks
    .filter((t) => !doneColumnId || String(t.column_id) !== String(doneColumnId))
    .map((t) => ({
      id: String(t.id),
      title: String(t.title),
      columnName: columnNameById.get(String(t.column_id)) ?? "Backlog",
    }));

  const ageDays = board.created_at
    ? Math.floor((Date.now() - new Date(board.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  try {
    const result = await runChapterRefocusDialogue({
      messages,
      projectName: String(project.name),
      chapterName: String(board.name),
      ageDays,
      openingLine: (board.opening_line as string | null) ?? null,
      goal: (board.goal as string | null) ?? null,
      incompleteTasks,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refocus dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refocus dialogue failed." },
      { status: 500 },
    );
  }
}
