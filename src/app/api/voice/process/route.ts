import { NextResponse } from "next/server";
import { extractTasksFromTranscript, transcribeAudioFile } from "@/lib/ai/openai";
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

  const formData = await request.formData();
  const file = formData.get("audio");
  const projectId = String(formData.get("projectId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: capture, error: captureError } = await supabase
    .from("voice_captures")
    .insert({
      user_id: user.id,
      project_id: projectId,
      status: "processing",
    })
    .select("id")
    .single();

  if (captureError || !capture) {
    const message = captureError?.message ?? "Failed to create voice capture.";
    const constraintHint =
      message.includes("audio_path") && message.includes("not-null")
        ? "Your Supabase database is missing the migration that removed the voice audio_path requirement. Apply migration 20260422_000003_stop_persisting_voice_audio.sql and try again."
        : message;

    console.error("Voice capture creation failed", captureError);
    return NextResponse.json(
      { error: constraintHint },
      { status: 500 },
    );
  }

  try {
    const transcript = await transcribeAudioFile(file);
    const parsed = await extractTasksFromTranscript({
      transcript,
      projectName: project.name,
      projectDescription: project.description,
    });

    const { error: updateError } = await supabase
      .from("voice_captures")
      .update({
        transcript,
        ai_parsed_json: parsed,
        status: "ready",
        error_message: null,
      })
      .eq("id", capture.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      id: capture.id,
      transcript,
      tasks: parsed.tasks.map((task, index) => ({
        id: `${capture.id}-${index}`,
        ...task,
      })),
    });
  } catch (error) {
    await supabase
      .from("voice_captures")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Voice processing failed.",
      })
      .eq("id", capture.id);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Voice processing failed.",
      },
      { status: 500 },
    );
  }
}
