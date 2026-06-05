import { NextResponse } from "next/server";
import { generateProjectPlanFromBrief } from "@/lib/ai/anthropic";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    project_goal?: string;
    north_star?: string;
    project_audience?: string;
    project_success?: string;
    project_biggest_risk?: string;
  };

  if (!body.project_goal) {
    return NextResponse.json({ error: "project_goal is required." }, { status: 400 });
  }

  try {
    const result = await generateProjectPlanFromBrief({
      project_goal: body.project_goal ?? "",
      north_star: body.north_star ?? "",
      project_audience: body.project_audience ?? "",
      project_success: body.project_success ?? "",
      project_biggest_risk: body.project_biggest_risk ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Project plan generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      { status: 500 },
    );
  }
}
