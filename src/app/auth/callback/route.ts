import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CURRENT_TERMS_VERSION } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/welcome";
  const safeNext = next.startsWith("/") ? next : "/welcome";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Check whether this user has accepted the current terms version.
      // If not, send them through the consent gate before reaching the app.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("terms_version")
        .eq("id", data.user.id)
        .single();

      if (!profile?.terms_version || profile.terms_version !== CURRENT_TERMS_VERSION) {
        return NextResponse.redirect(`${origin}/onboarding/terms`);
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  console.error("[auth/callback] No code in callback. Params:", Object.fromEntries(searchParams));
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
