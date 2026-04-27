import { NextResponse } from "next/server";
import {
  confirmedStrategicTemplateSchema,
  proposedTaskSchema,
  strategicDialogueMessageSchema,
} from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function buildTranscript(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  return messages
    .map((message) =>
      `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`,
    )
    .join("\n\n");
}

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
    template?: Record<string, unknown> | null;
    tasks?: Array<Record<string, unknown>>;
  };

  const projectId = String(payload.projectId ?? "");
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((message) => strategicDialogueMessageSchema.safeParse(message))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];
  const templateResult = confirmedStrategicTemplateSchema.safeParse(payload.template);
  const tasks = Array.isArray(payload.tasks)
    ? payload.tasks
        .map((task) => proposedTaskSchema.safeParse(task))
        .flatMap((result) => (result.success ? [result.data] : []))
    : [];

  if (!projectId) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Conversation history is required." },
      { status: 400 },
    );
  }

  if (tasks.length === 0) {
    return NextResponse.json(
      { error: "At least one task is required." },
      { status: 400 },
    );
  }

  if (!templateResult.success) {
    return NextResponse.json(
      { error: "A reusable template is required." },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const transcript = buildTranscript(messages);
  const template = templateResult.data;

  const { data: upsertedTemplateRows, error: upsertTemplateError } = await supabase
    .from("workflow_templates")
    .upsert(
      {
        user_id: user.id,
        name: template.name,
        trigger_phrase: template.triggerPhrase,
        description: template.description || null,
      },
      {
        onConflict: "user_id,name",
      },
    )
    .select("id")
    .limit(1);

  if (upsertTemplateError || !upsertedTemplateRows?.[0]) {
    return NextResponse.json(
      { error: upsertTemplateError?.message ?? "Failed to save template." },
      { status: 500 },
    );
  }

  const templateId = String(upsertedTemplateRows[0].id);

  const { error: deleteStepsError } = await supabase
    .from("workflow_template_steps")
    .delete()
    .eq("template_id", templateId);

  if (deleteStepsError) {
    return NextResponse.json(
      { error: deleteStepsError.message },
      { status: 500 },
    );
  }

  const { error: insertStepsError } = await supabase
    .from("workflow_template_steps")
    .insert(
      tasks.map((task, index) => ({
        template_id: templateId,
        position: (index + 1) * 1000,
        title: task.title.trim(),
        description: task.description.trim() || null,
        suggested_column: task.suggestedColumn,
        priority: task.priority ?? null,
        due_date: task.dueDate || null,
      })),
    );

  if (insertStepsError) {
    return NextResponse.json(
      { error: insertStepsError.message },
      { status: 500 },
    );
  }

  const { data: capture, error: captureError } = await supabase
    .from("voice_captures")
    .insert({
      user_id: user.id,
      project_id: projectId,
      transcript,
      ai_parsed_json: { tasks },
      status: "ready",
      error_message: null,
    })
    .select("id")
    .single();

  if (captureError || !capture) {
    return NextResponse.json(
      {
        error:
          captureError?.message ?? "Failed to prepare strategic dialogue review.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: capture.id,
    templateId,
    transcript,
    tasks: tasks.map((task, index) => ({
      id: `${capture.id}-${index}`,
      ...task,
    })),
  });
}
