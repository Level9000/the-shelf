import { NextResponse } from "next/server";
import { runPressIntroDialogue } from "@/lib/ai/anthropic";
import { strategicDialogueMessageSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = (await request.json()) as {
    messages?: Array<{ role?: string; content?: string }>;
    projectId?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const messages  = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectId) return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
  if (messages.length === 0) return NextResponse.json({ error: "At least one message is required." }, { status: 400 });

  const [{ data: project }, { data: boards }] = await Promise.all([
    supabase.from("projects").select("id,name,north_star").eq("id", projectId).maybeSingle(),
    supabase.from("boards")
      .select("name,goal,chapter_story,kickoff_completed_at,retro_completed_at")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const allBoards = boards ?? [];
  const completedChapters = allBoards
    .filter((b) => b.retro_completed_at)
    .map((b) => ({
      name:  String(b.name),
      goal:  (b.goal as string | null) ?? null,
      story: (b.chapter_story as string | null) ?? null,
    }));

  try {
    const result = await runPressIntroDialogue({
      messages,
      projectName:       String(project.name),
      northStar:         (project.north_star as string | null) ?? null,
      completedChapters,
      totalChapters:     allBoards.length,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Press intro failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Press intro failed." },
      { status: 500 },
    );
  }
}
