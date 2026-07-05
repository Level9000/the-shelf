import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runShareGapCheck } from "@/lib/ai/anthropic";
import { GAP_CHECKLISTS, GAP_BEAT_DESCRIPTIONS } from "@/lib/press/gap-checklists";
import { scopeChapters } from "@/lib/press/scope";
import type { AudienceId, ScopeId } from "@/lib/press/share-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = (await request.json()) as {
    projectId?: string;
    audienceId?: string;
    scope?: string;
    scopeDetail?: string;
  };

  const projectId = String(payload.projectId ?? "");
  const audienceId = payload.audienceId as AudienceId | undefined;
  const scope = payload.scope as ScopeId | undefined;

  if (!projectId) return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
  if (!audienceId || !scope) return NextResponse.json({ error: "audienceId and scope are required." }, { status: 400 });

  const checklist = GAP_CHECKLISTS[audienceId];
  if (!checklist || checklist.length === 0) {
    return NextResponse.json({ missingBeats: [] });
  }

  const [{ data: project }, { data: boards }, { data: fragments }] = await Promise.all([
    supabase.from("projects").select("id,name,north_star").eq("id", projectId).maybeSingle(),
    supabase.from("boards")
      .select("name,goal,chapter_story,retro_completed_at")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase.from("story_fragments")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const allChapters = (boards ?? []).map((b) => ({
    name: String(b.name),
    goal: (b.goal as string | null) ?? null,
    story: (b.chapter_story as string | null) ?? null,
    status: b.retro_completed_at ? "completed" : "in_progress",
  }));
  const scopedChapters = scopeChapters(scope, allChapters);

  const beats = checklist.map((key) => ({
    key,
    description: GAP_BEAT_DESCRIPTIONS[key] ?? key,
  }));

  try {
    const result = await runShareGapCheck({
      projectName: String(project.name),
      northStar: (project.north_star as string | null) ?? null,
      audienceLabel: audienceId,
      beats,
      chapters: scopedChapters,
      fragments: (fragments ?? []).map((f) => String(f.content)),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Share gap check failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gap check failed." },
      { status: 500 },
    );
  }
}
