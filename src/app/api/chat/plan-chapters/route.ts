import { NextResponse } from "next/server";
import { runChapterPlannerDialogue } from "@/lib/ai/anthropic";
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
    avatar?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const avatar = payload.avatar ?? "cass";
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "At least one message is required." }, { status: 400 });
  }

  const [{ data: project, error: projectError }, { data: boards, error: boardsError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,name,north_star,accumulative_story")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("name,goal,kickoff_completed_at,retro_completed_at")
        .eq("project_id", projectId)
        .order("position", { ascending: true }),
    ]);

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (boardsError) {
    return NextResponse.json({ error: "Could not load chapters." }, { status: 500 });
  }

  const existingChapters = (boards ?? []).map((b) => {
    const status = b.retro_completed_at
      ? "completed"
      : b.kickoff_completed_at
        ? "working_on_it"
        : "planned";
    return {
      name: String(b.name),
      goal: (b.goal as string | null) ?? null,
      status: status as "completed" | "working_on_it" | "planned",
    };
  });

  try {
    const result = await runChapterPlannerDialogue({
      messages,
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      accumulativeStory: (project.accumulative_story as string | null) ?? null,
      existingChapters,
      avatar,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chapter planner dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chapter planner failed." },
      { status: 500 },
    );
  }
}
