import { NextResponse } from "next/server";
import { runStrategicTextDialogue } from "@/lib/ai/openai";
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
        .map((message) => strategicDialogueMessageSchema.safeParse(message))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];

  if (!projectId) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const result = await runStrategicTextDialogue({
      messages,
      projectName: project.name,
      projectDescription: project.description,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Strategic dialogue request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Strategic dialogue failed.",
      },
      { status: 500 },
    );
  }
}
