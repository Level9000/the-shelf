import { NextResponse } from "next/server";
import { runCassStoryShareRefinement } from "@/lib/ai/anthropic";
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
    currentStory?: string;
    instruction?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const boardId = String(payload.boardId ?? "");
  const currentStory = String(payload.currentStory ?? "").trim();
  const instruction = String(payload.instruction ?? "").trim();

  if (!projectId || !boardId) {
    return NextResponse.json(
      { error: "Project and chapter are required." },
      { status: 400 },
    );
  }

  if (!currentStory) {
    return NextResponse.json(
      { error: "Current story is required." },
      { status: 400 },
    );
  }

  if (!instruction || instruction.length > 1000) {
    return NextResponse.json(
      { error: "Instruction is required (max 1000 characters)." },
      { status: 400 },
    );
  }

  // Load board and project for context
  const [{ data: project }, { data: board }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id,name,goal")
      .eq("id", boardId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project || !board) {
    return NextResponse.json(
      { error: "Chapter context not found." },
      { status: 404 },
    );
  }

  try {
    const refinedStory = await runCassStoryShareRefinement({
      projectName: String(project.name),
      chapterName: String(board.name),
      chapterGoal: (board.goal as string | null) ?? null,
      currentStory,
      instruction,
    });

    return NextResponse.json({ refinedStory });
  } catch (error) {
    console.error("Cass story refinement failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Story refinement failed.",
      },
      { status: 500 },
    );
  }
}
