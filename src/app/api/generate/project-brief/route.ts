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
    raw_description?: string;
  };

  if (!body.raw_description?.trim()) {
    return NextResponse.json({ error: "raw_description is required." }, { status: 400 });
  }

  try {
    const result = await generateProjectPlanFromBrief({
      raw_description: body.raw_description,
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
