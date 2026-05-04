import { NextResponse } from "next/server";
import { runStrategicTextDialogue } from "@/lib/ai/openai";
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
  const boardId = payload.boardId ? String(payload.boardId) : null;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((message) => strategicDialogueMessageSchema.safeParse(message))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];

  if (!projectId) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Fetch chapter context and existing backlog if a boardId was provided
  let chapterContext: {
    name: string;
    goal: string | null;
    whyItMatters: string | null;
    successLooksLike: string | null;
    doneDefinition: string | null;
  } | null = null;

  let existingTasks: Array<{ title: string; columnName: string }> = [];

  if (boardId) {
    const { data: board } = await supabase
      .from("boards")
      .select("name,goal,why_it_matters,success_looks_like,done_definition")
      .eq("id", boardId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (board) {
      chapterContext = {
        name: board.name,
        goal: board.goal ?? null,
        whyItMatters: board.why_it_matters ?? null,
        successLooksLike: board.success_looks_like ?? null,
        doneDefinition: board.done_definition ?? null,
      };
    }

    // Fetch all tasks for this board along with their column names
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, board_columns(name)")
      .eq("board_id", boardId)
      .order("created_at", { ascending: true });

    if (tasks && tasks.length > 0) {
      existingTasks = tasks.map((task) => ({
        title: task.title,
        columnName:
          (task.board_columns as { name?: string } | null)?.name ?? "To Do",
      }));
    }
  }

  try {
    const result = await runStrategicTextDialogue({
      messages,
      projectName: project.name,
      projectDescription: project.description,
      chapterContext,
      existingTasks,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Strategic dialogue request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Strategic dialogue failed.",
      },
      { status: 500 },
    );
  }
}
