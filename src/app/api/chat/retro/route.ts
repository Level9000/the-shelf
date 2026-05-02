import { NextResponse } from "next/server";
import { runChapterRetroDialogue } from "@/lib/ai/anthropic";
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
        .select("id,name,accumulative_story")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select(
          "id,name,goal,why_it_matters,success_looks_like,done_definition,opening_line,kickoff_completed_at",
        )
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

  // Fetch tasks + columns to classify completed vs remaining
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

  const doneColumnId = (columns ?? []).find(
    (col) => String(col.name).toLowerCase() === "done",
  )?.id;

  const allTasks = tasks ?? [];
  const completedTasks = doneColumnId
    ? allTasks.filter((t) => String(t.column_id) === String(doneColumnId))
    : [];
  const remainingTasks = doneColumnId
    ? allTasks.filter((t) => String(t.column_id) !== String(doneColumnId))
    : allTasks;

  // Load previous chapters for context
  const { data: previousBoards } = await supabase
    .from("boards")
    .select("name,chapter_story")
    .eq("project_id", projectId)
    .neq("id", chapterId)
    .not("retro_completed_at", "is", null)
    .order("position", { ascending: true });

  try {
    const result = await runChapterRetroDialogue({
      messages,
      chapter: {
        goal: (board.goal as string | null) ?? null,
        whyItMatters: (board.why_it_matters as string | null) ?? null,
        successLooksLike: (board.success_looks_like as string | null) ?? null,
        doneDefinition: (board.done_definition as string | null) ?? null,
        openingLine: (board.opening_line as string | null) ?? null,
      },
      completedTasks: completedTasks.map((t) => ({ title: String(t.title) })),
      remainingTasks: remainingTasks.map((t) => ({ title: String(t.title) })),
      projectStory: (project.accumulative_story as string | null) ?? null,
      previousChapters: (previousBoards ?? []).map((b) => ({
        name: String(b.name),
        chapterStory: (b.chapter_story as string | null) ?? null,
      })),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Retro dialogue failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Retro dialogue failed.",
      },
      { status: 500 },
    );
  }
}
