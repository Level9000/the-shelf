import { NextResponse } from "next/server";
import { runCassBoardDialogue } from "@/lib/ai/anthropic";
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
    mode?: "tasks" | "braindump" | "breakup";
    messages?: Array<{ role?: string; content?: string }>;
    breakupTask?: { title?: string; description?: string | null; columnName?: string } | null;
  };

  const projectId = String(payload.projectId ?? "");
  const boardId = payload.boardId ? String(payload.boardId) : null;
  const mode: "tasks" | "braindump" | "breakup" =
    payload.mode === "braindump" ? "braindump" : payload.mode === "breakup" ? "breakup" : "tasks";
  const breakupTask = payload.breakupTask
    ? {
        title: String(payload.breakupTask.title ?? ""),
        description: payload.breakupTask.description ?? null,
        columnName: String(payload.breakupTask.columnName ?? "Do This Week"),
      }
    : null;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectId) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "At least one message is required." }, { status: 400 });
  }

  // ── Project ──────────────────────────────────────────────────────────────────
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // ── Chapter context ───────────────────────────────────────────────────────────
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

    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, board_columns(name)")
      .eq("board_id", boardId)
      .order("created_at", { ascending: true });

    if (tasks && tasks.length > 0) {
      existingTasks = tasks.map((t) => ({
        title: t.title,
        columnName: (t.board_columns as { name?: string } | null)?.name ?? "Do This Week",
      }));
    }
  }

  // ── Saved templates (for Cass to surface matches) ─────────────────────────────
  const { data: templateRows } = await supabase
    .from("workflow_templates")
    .select("name, trigger_phrase, workflow_template_steps(title, position)")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .limit(8);

  const existingTemplates = (templateRows ?? []).map((t) => ({
    name: String(t.name),
    triggerPhrase: String(t.trigger_phrase),
    steps: ((t.workflow_template_steps as Array<{ title: string; position: number }> | null) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((s) => s.title),
  }));

  // ── Call AI ───────────────────────────────────────────────────────────────────
  try {
    const result = await runCassBoardDialogue({
      messages,
      projectName: project.name,
      projectDescription: project.description,
      mode,
      chapterContext,
      existingTasks,
      existingTemplates,
      breakupTask,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass board dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
