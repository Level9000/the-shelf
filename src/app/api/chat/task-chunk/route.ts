import { NextResponse } from "next/server";
import { runTaskChunkingDialogue } from "@/lib/ai/anthropic";
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
    taskId?: string;
    projectId?: string;
    boardId?: string;
  };

  const taskId = String(payload.taskId ?? "");
  const projectId = String(payload.projectId ?? "");
  const boardId = String(payload.boardId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!taskId || !projectId || !boardId || messages.length === 0) {
    return NextResponse.json(
      { error: "taskId, projectId, boardId, and at least one message are required." },
      { status: 400 },
    );
  }

  const [{ data: task, error: taskError }, { data: board, error: boardError }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,description,column_id")
        .eq("id", taskId)
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id,name")
        .eq("id", boardId)
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  if (taskError || !task || boardError || !board) {
    return NextResponse.json({ error: "Task or chapter not found." }, { status: 404 });
  }

  const { data: column } = await supabase
    .from("board_columns")
    .select("name")
    .eq("id", String(task.column_id))
    .maybeSingle();

  try {
    const result = await runTaskChunkingDialogue({
      messages,
      taskTitle: String(task.title),
      taskDescription: task.description ? String(task.description) : null,
      columnName: column ? String(column.name) : "Backlog",
      chapterName: String(board.name),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Task chunking dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chunking failed." },
      { status: 500 },
    );
  }
}
