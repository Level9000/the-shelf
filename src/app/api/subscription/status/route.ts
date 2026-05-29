import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();
    const subscription = await getUserSubscription(supabase, user.id);
    return NextResponse.json(subscription);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
