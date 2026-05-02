import { NextResponse } from "next/server";
import { runProjectKickoffDialogue } from "@/lib/ai/anthropic";
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
    projectName?: string;
  };

  const projectName = String(payload.projectName ?? "").trim();
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((m) => strategicDialogueMessageSchema.safeParse(m))
        .flatMap((r) => (r.success ? [r.data] : []))
    : [];

  if (!projectName) {
    return NextResponse.json(
      { error: "Project name is required." },
      { status: 400 },
    );
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  try {
    const result = await runProjectKickoffDialogue({ messages, projectName });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Project kickoff dialogue failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Project kickoff dialogue failed.",
      },
      { status: 500 },
    );
  }
}
