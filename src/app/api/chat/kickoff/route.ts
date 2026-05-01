import { NextResponse } from "next/server";
import { runChapterKickoffDialogue } from "@/lib/ai/anthropic";
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
        .select("id,name,description,goal,why_it_matters")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id,name")
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

  // Fetch previous chapters including their opening lines so Claude can
  // maintain narrative continuity across the project story arc.
  const { data: previousBoards } = await supabase
    .from("boards")
    .select("name,goal,opening_line")
    .eq("project_id", projectId)
    .neq("id", chapterId)
    .order("position", { ascending: true });

  try {
    const result = await runChapterKickoffDialogue({
      messages,
      projectName: String(project.name),
      projectDescription: project.description as string | null,
      // Use the project goal as the north star proxy until the Project
      // Kickoff Chat (Act 1) is built and produces a dedicated northStar field.
      northStar: (project.goal as string | null) ?? null,
      projectWhyItMatters: (project.why_it_matters as string | null) ?? null,
      previousChapters: (previousBoards ?? []).map((b) => ({
        name: String(b.name),
        goal: (b.goal as string | null) ?? null,
        openingLine: (b.opening_line as string | null) ?? null,
      })),
      chapterName: String(board.name),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chapter kickoff dialogue failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Kickoff dialogue failed.",
      },
      { status: 500 },
    );
  }
}
