import { NextResponse } from "next/server";
import { runSharePodcastGeneration } from "@/lib/ai/anthropic";
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
    chapterId?: string;
    messages?: Array<{ role?: string; content?: string }>;
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

  const [{ data: project }, { data: board }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,accumulative_story")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id,name,goal,chapter_story,retro_completed_at")
      .eq("id", chapterId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project || !board) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  if (!board.retro_completed_at) {
    return NextResponse.json(
      { error: "Complete the chapter retro first." },
      { status: 400 },
    );
  }

  const [{ data: columns }, { data: tasks }] = await Promise.all([
    supabase.from("board_columns").select("id,name").eq("board_id", chapterId),
    supabase.from("tasks").select("id,title,column_id").eq("board_id", chapterId),
  ]);

  const doneColumnId = (columns ?? []).find(
    (c) => String(c.name).toLowerCase() === "done",
  )?.id;
  const allTasks = tasks ?? [];
  const completedTasks = doneColumnId
    ? allTasks.filter((t) => t.column_id === doneColumnId).map((t) => String(t.title))
    : allTasks.map((t) => String(t.title));

  try {
    const result = await runSharePodcastGeneration({
      messages,
      chapterName: String(board.name),
      goal: (board.goal as string | null) ?? null,
      chapterStory: (board.chapter_story as string | null) ?? null,
      completedTasks,
      projectName: String(project.name),
      projectStory: (project.accumulative_story as string | null) ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Share podcast generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      { status: 500 },
    );
  }
}
