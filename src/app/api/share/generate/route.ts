import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runShareDraftGeneration } from "@/lib/ai/anthropic";
import { FORMAT_RULES } from "@/lib/press/format-rules";
import { scopeChapters } from "@/lib/press/scope";
import type { FormatId, GapResolution, ScopeId } from "@/lib/press/share-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = (await request.json()) as {
    projectId?: string;
    audienceLabel?: string;
    format?: string;
    scope?: string;
    scopeDetail?: string;
    gapResolutions?: GapResolution[];
    currentDraft?: string;
    refinementInstruction?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const audienceLabel = String(payload.audienceLabel ?? "");
  const format = payload.format as FormatId | undefined;
  const scope = payload.scope as ScopeId | undefined;
  const gapResolutions = Array.isArray(payload.gapResolutions) ? payload.gapResolutions : [];

  if (!projectId || !audienceLabel || !format || !scope) {
    return NextResponse.json({ error: "projectId, audienceLabel, format, and scope are required." }, { status: 400 });
  }

  const formatRule = FORMAT_RULES[format];
  if (!formatRule) return NextResponse.json({ error: `Unknown format: ${format}` }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("id,name,north_star,voice_profile").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: boards } = await supabase.from("boards")
    .select("name,goal,chapter_story,retro_completed_at")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const allChapters = (boards ?? []).map((b) => ({
    name: String(b.name),
    goal: (b.goal as string | null) ?? null,
    story: (b.chapter_story as string | null) ?? null,
    status: b.retro_completed_at ? "completed" : "in_progress",
  }));
  const scopedChapters = scopeChapters(scope, allChapters);

  const gapNotes = gapResolutions.flatMap((g) => {
    if (g.action === "added" && g.content) return [`- ${g.beatKey}: ${g.content}`];
    if (g.action === "tbd") return [`- ${g.beatKey}: not yet available — mention this briefly as "coming soon" rather than omitting it silently`];
    return [];
  });

  try {
    const result = await runShareDraftGeneration({
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      voiceProfile: (project.voice_profile as string | null) ?? null,
      audienceLabel,
      formatRule,
      scope,
      scopeDetail: payload.scopeDetail,
      chapters: scopedChapters,
      gapNotes,
      revision: payload.currentDraft && payload.refinementInstruction
        ? { currentDraft: payload.currentDraft, instruction: payload.refinementInstruction }
        : null,
    });
    return NextResponse.json({ draft: result.content });
  } catch (error) {
    console.error("Share draft generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draft generation failed." },
      { status: 500 },
    );
  }
}
