import { NextResponse } from "next/server";
import { runWeeklyPlanningDialogue } from "@/lib/ai/openai";
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
    projectId?: string;
    boardId?: string;
    messages?: Array<{ role?: string; content?: string }>;
  };

  const projectId = String(payload.projectId ?? "");
  const boardId = String(payload.boardId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((message) => strategicDialogueMessageSchema.safeParse(message))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];

  if (!projectId || !boardId) {
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

  const [{ data: project, error: projectError }, { data: board, error: boardError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,name")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id,project_id,name,goal,success_looks_like")
        .eq("id", boardId)
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id,title,description,priority,due_date,column_id")
        .eq("project_id", projectId)
        .eq("board_id", boardId),
    ]);

  if (projectError || !project || boardError || !board || tasksError || !tasks) {
    return NextResponse.json(
      { error: "Weekly planning context not found." },
      { status: 404 },
    );
  }

  const { data: columns, error: columnsError } = await supabase
    .from("board_columns")
    .select("id,name")
    .eq("board_id", boardId);

  if (columnsError || !columns) {
    return NextResponse.json(
      { error: "Board columns not found." },
      { status: 404 },
    );
  }

  const columnNameById = new Map(
    columns.map((column) => [String(column.id), String(column.name)]),
  );

  const backlogTasks = tasks
    .filter((task) => columnNameById.get(String(task.column_id)) === "Do This Week")
    .map((task) => ({
      id: String(task.id),
      title: String(task.title),
      description: (task.description as string | null) ?? null,
      priority: (task.priority as string | null) ?? null,
      dueDate: (task.due_date as string | null) ?? null,
    }));

  const currentWeekTasks = tasks
    .filter((task) => columnNameById.get(String(task.column_id)) === "Do This Week")
    .map((task) => ({
      id: String(task.id),
      title: String(task.title),
      description: (task.description as string | null) ?? null,
      priority: (task.priority as string | null) ?? null,
      dueDate: (task.due_date as string | null) ?? null,
    }));

  try {
    const result = await runWeeklyPlanningDialogue({
      messages,
      projectName: project.name,
      chapterName: board.name,
      chapterGoal: board.goal,
      chapterSuccessLooksLike: board.success_looks_like,
      backlogTasks,
      currentWeekTasks,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Weekly planning dialogue request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Weekly planning dialogue failed.",
      },
      { status: 500 },
    );
  }
}
