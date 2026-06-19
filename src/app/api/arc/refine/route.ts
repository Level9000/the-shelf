import { NextResponse } from "next/server";
import { runProjectArcDialogue } from "@/lib/ai/anthropic";
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
    messages?: Array<{ role?: string; content?: string }>;
  };

  const projectId = String(payload.projectId ?? "");
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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, description, north_star, accumulative_story")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: chaptersRaw } = await supabase
    .from("chapters")
    .select("id, name, goal, opening_line, retro_completed_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const chapters = (chaptersRaw ?? []).map((ch, i) => ({
    index: i,
    name: ch.name as string,
    goal: ch.goal as string | null,
    openingLine: ch.opening_line as string | null,
    status: (ch.retro_completed_at
      ? "complete"
      : "active") as "upcoming" | "active" | "complete",
  }));

  try {
    const result = await runProjectArcDialogue({
      messages,
      projectName: project.name as string,
      projectDescription: project.description as string | null,
      existingValues: {
        northStar: project.north_star as string | null,
        accumulativeStory: project.accumulative_story as string | null,
      },
      chapters,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Arc refinement request failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Arc refinement failed." },
      { status: 500 },
    );
  }
}
