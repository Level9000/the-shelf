/**
 * POST /api/press/generate
 *
 * Press calls this once the gap analysis is complete and
 * ready_to_generate === true. It:
 *  1. Loads project + chapter story data
 *  2. Asks Claude to extract structured PressContent from the conversation
 *  3. Generates the .pptx or .docx file
 *  4. Returns the file as a binary download
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPressGapAnalysisPrompt } from "@/lib/ai/prompts";
import { getTemplate } from "@/lib/press/templates";
import { generatePptx } from "@/lib/press/generate-pptx";
import { generateDocx } from "@/lib/press/generate-docx";
import type { PressContent } from "@/lib/press/generate-pptx";

export const runtime = "nodejs";

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION  = "2023-06-01";
const ANTHROPIC_MODEL    = "claude-opus-4-5";

function requireKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set.");
  return key;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = (await request.json()) as {
    projectId?: string;
    templateId?: string;
    /** The full gap analysis conversation used to extract content */
    conversation?: Array<{ role: string; content: string }>;
  };

  const projectId  = String(payload.projectId ?? "");
  const templateId = String(payload.templateId ?? "");

  if (!projectId || !templateId) {
    return NextResponse.json({ error: "projectId and templateId are required." }, { status: 400 });
  }

  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
  }

  // Load project + chapter data
  const [{ data: project }, { data: boards }] = await Promise.all([
    supabase.from("projects").select("id,name,north_star").eq("id", projectId).maybeSingle(),
    supabase.from("boards")
      .select("name,goal,chapter_story,retro_completed_at")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const chapters = (boards ?? []).map((b) => ({
    name:   String(b.name),
    goal:   (b.goal as string | null) ?? null,
    story:  (b.chapter_story as string | null) ?? null,
    status: b.retro_completed_at ? "completed" : "in_progress",
  }));

  // ── Step 1: Extract structured PressContent from story data + conversation ──

  const extractionPrompt = [
    `You are Press. Extract structured content fields for a "${template.label}" from the project data below.`,
    `Return a JSON object with these exact keys: ${template.requiredFields.join(", ")}.`,
    `Use real data wherever available. For missing fields, write a placeholder in [brackets].`,
    `Be concise — this content goes directly into a document.`,
    "",
    `PROJECT: ${project.name}`,
    `NORTH STAR: ${(project.north_star as string | null) ?? "Not set"}`,
    "",
    chapters.length > 0
      ? [
          "CHAPTERS:",
          ...chapters.map((c, i) =>
            `Chapter ${i + 1} — ${c.name} [${c.status}]${c.goal ? `\nGoal: ${c.goal}` : ""}${c.story ? `\nStory: ${c.story}` : ""}`,
          ),
        ].join("\n")
      : "No chapter data yet.",
    "",
    payload.conversation?.length
      ? [
          "CONVERSATION CONTEXT (Press gap analysis):",
          payload.conversation.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n"),
        ].join("\n")
      : "",
    "",
    "Return ONLY a JSON object — no prose, no markdown fences.",
  ].join("\n");

  const apiKey = requireKey();

  const extractionRes = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: extractionPrompt }],
    }),
  });

  if (!extractionRes.ok) {
    const msg = await extractionRes.text();
    return NextResponse.json({ error: `Content extraction failed: ${msg}` }, { status: 500 });
  }

  const extractionPayload = await extractionRes.json() as {
    content?: Array<{ type: string; text?: string }>;
  };

  const rawText = extractionPayload.content?.find((b) => b.type === "text")?.text ?? "{}";

  let pressContent: PressContent = {};
  try {
    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    pressContent = JSON.parse(cleaned) as PressContent;
  } catch {
    return NextResponse.json({ error: "Could not parse content from Press." }, { status: 500 });
  }

  // Always inject project_name and north_star
  pressContent.project_name = pressContent.project_name ?? String(project.name);
  pressContent.north_star   = pressContent.north_star   ?? (String(project.north_star ?? ""));

  // Inject accumulated chapter stories
  if (!pressContent.chapter_stories && chapters.some((c) => c.story)) {
    pressContent.chapter_stories = chapters
      .filter((c) => c.story)
      .map((c, i) => `Chapter ${i + 1} — ${c.name}:\n${c.story}`)
      .join("\n\n");
  }

  // ── Step 2: Generate the file ─────────────────────────────────────────────

  try {
    let fileBuffer: Buffer;
    let mimeType: string;
    let filename: string;

    const slug = String(project.name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (template.format === "pptx") {
      fileBuffer = await generatePptx(template, pressContent);
      mimeType   = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      filename   = `${slug}-${template.id}.pptx`;
    } else {
      fileBuffer = await generateDocx(template, pressContent);
      mimeType   = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      filename   = `${slug}-${template.id}.docx`;
    }

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("Press generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}
