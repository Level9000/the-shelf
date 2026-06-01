import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TermsConsentForm } from "./terms-consent-form";

export default async function OnboardingTermsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in — shouldn't be here
  if (!user) redirect("/login");

  // Already accepted — skip through
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("terms_version")
    .eq("id", user.id)
    .single();

  if (profile?.terms_version) redirect("/projects");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">

        {/* Logo */}
        <img
          src="/icons/authored_by_transparent.png"
          alt="Authored By"
          className="h-auto w-full max-w-[220px]"
          style={{
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15)) drop-shadow(0 12px 32px rgba(0,0,0,0.10))",
          }}
        />

        {/* Card */}
        <div className="w-full rounded-2xl border border-black/8 bg-zinc-50 px-7 py-8 shadow-sm">
          <h1 className="text-lg font-bold text-zinc-900" style={{ fontFamily: "var(--font-literata, Georgia, serif)" }}>
            One last step
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Before you start writing your story, please review and accept our Terms of Service and Privacy Policy.
          </p>

          <TermsConsentForm />
        </div>

      </div>
    </div>
  );
}
