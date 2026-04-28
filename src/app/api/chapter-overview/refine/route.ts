import { NextResponse } from "next/server";
import { runChapterOverviewDialogue } from "@/lib/ai/openai";
import {
  projectOverviewSectionSchema,
  strategicDialogueMessageSchema,
} from "@/lib/ai/schema";
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
    currentSection?: string;
    messages?: Array<{ role?: string; content?: string }>;
  };

  const projectId = String(payload.projectId ?? "");
  const boardId = String(payload.boardId ?? "");
  const sectionResult = projectOverviewSectionSchema.safeParse(
    payload.currentSection,
  );
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((message) => strategicDialogueMessageSchema.safeParse(message))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];

  if (!projectId || !boardId) {
    return NextResponse.json(
      { error: "Project and chapter are required." },
      { status: 400 },
    );
  }

  if (!sectionResult.success) {
    return NextResponse.json(
      { error: "A valid chapter overview section is required." },
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
        .select(
          "id,name,description,goal,why_it_matters,success_looks_like,done_definition",
        )
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select(
          "id,project_id,name,goal,why_it_matters,success_looks_like,done_definition",
        )
        .eq("id", boardId)
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  if (projectError || !project || boardError || !board) {
    return NextResponse.json(
      { error: "Project chapter context not found." },
      { status: 404 },
    );
  }

  try {
    const result = await runChapterOverviewDialogue({
      messages,
      projectName: project.name,
      projectDescription: project.description,
      projectOverview: {
        goal: project.goal,
        whyItMatters: project.why_it_matters,
        successLooksLike: project.success_looks_like,
        doneDefinition: project.done_definition,
      },
      chapterName: board.name,
      currentSection: sectionResult.data,
      existingValues: {
        goal: board.goal,
        whyItMatters: board.why_it_matters,
        successLooksLike: board.success_looks_like,
        doneDefinition: board.done_definition,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chapter overview dialogue request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chapter overview dialogue failed.",
      },
      { status: 500 },
    );
  }
}
