import { NextResponse } from "next/server";
import { runToneVoiceRefinerDialogue } from "@/lib/ai/anthropic";
import { strategicDialogueMessageSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadCassStoryContext } from "@/lib/ai/cass-context";
import { saveVoiceProfileAction } from "@/lib/actions/voice-profile-actions";

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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, voice_profile")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const storyContext = await loadCassStoryContext(supabase, projectId);
  const sampleExcerpts = storyContext.chapterSummaries
    .map((c) => c.storyExcerpt)
    .filter((s): s is string => Boolean(s))
    .slice(-3);
  const existingProfile = (project.voice_profile as string | null) ?? null;

  try {
    const result = await runToneVoiceRefinerDialogue({
      messages,
      projectName: String(project.name),
      sampleExcerpts,
      existingProfile,
    });

    if (result.done && result.voiceProfile) {
      const fullConversation = [...messages, { role: "assistant" as const, content: result.reply }];
      await saveVoiceProfileAction({
        projectId,
        voiceProfile: result.voiceProfile,
        conversation: fullConversation,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tone voice refiner dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
