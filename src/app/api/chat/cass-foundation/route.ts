import { NextResponse } from "next/server";
import { runCassFoundationDialogue } from "@/lib/ai/anthropic";
import { strategicDialogueMessageSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadCassStoryContext, summarizeChapterHighlight } from "@/lib/ai/cass-context";
import { refreshBackstoryGapSignal } from "@/lib/ai/backstory-gap";

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
    gapHint?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const gapHint = payload.gapHint ? String(payload.gapHint) : null;
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
    .select("id, name, north_star, story_foundation")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const storyContext = await loadCassStoryContext(supabase, projectId);
  const existingFoundation = (project.story_foundation as string | null) ?? null;

  try {
    const result = await runCassFoundationDialogue({
      messages,
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      pastChapterNames: storyContext.pastChapterNames,
      chapterHighlights: storyContext.chapterSummaries
        .map(summarizeChapterHighlight)
        .filter((h): h is string => Boolean(h))
        .slice(-5),
      existingFoundation,
      gapHint,
    });

    if (result.done && result.foundationSummary) {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          story_foundation: result.foundationSummary,
          story_foundation_updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (updateError) throw new Error(updateError.message);

      const fullConversation = [...messages, { role: "assistant" as const, content: result.reply }];
      const { error: fragmentError } = await supabase.from("story_fragments").insert({
        user_id: user.id,
        project_id: projectId,
        chapter_id: null,
        source: "foundation",
        content: result.foundationSummary,
        conversation: fullConversation,
      });

      if (fragmentError) console.error("Failed to save foundation fragment", fragmentError);

      try {
        await refreshBackstoryGapSignal(supabase, projectId);
      } catch (err) {
        console.error("cass-foundation: backstory gap refresh failed", err);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cass foundation dialogue failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
