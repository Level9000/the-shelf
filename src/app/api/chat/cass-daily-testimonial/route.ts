import { NextResponse } from "next/server";
import { runCassDailyTestimonialDialogue } from "@/lib/ai/anthropic";
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
    alreadyProposedTasks?: string[];
  };

  const projectId = String(payload.projectId ?? "");
  const chapterId = String(payload.chapterId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];
  const alreadyProposedTasks = Array.isArray(payload.alreadyProposedTasks)
    ? payload.alreadyProposedTasks.map((t) => String(t))
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
      .select("id,name,goal")
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

  const [{ data: columns }, { data: tasks }] = await Promise.all([
    supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
    supabase.from("tasks").select("id,title,column_id").eq("board_id", chapterId),
  ]);

  const doneColumnId = (columns ?? []).find(
    (col) => String(col.name).toLowerCase() === "done",
  )?.id;
  const incompleteTasks = doneColumnId
    ? (tasks ?? []).filter((t) => String(t.column_id) !== String(doneColumnId))
    : (tasks ?? []);

  try {
    const result = await runCassDailyTestimonialDialogue({
      messages,
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      chapterName: String(board.name),
      chapterGoal: (board.goal as string | null) ?? null,
      incompleteTasks: incompleteTasks.map((t) => String(t.title)),
      accumulativeStory: (project.accumulative_story as string | null) ?? null,
      alreadyProposedTasks,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass daily testimonial dialogue failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cass daily testimonial dialogue failed.",
      },
      { status: 500 },
    );
  }
}
