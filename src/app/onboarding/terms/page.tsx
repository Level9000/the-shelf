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
    <div style={{
      minHeight: "100dvh",
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 32px",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        width: "100%",
        maxWidth: "360px",
      }}>

        {/* Tape image */}
        <img
          src="/icons/authored-by-tape-icon.png"
          alt="Authored By"
          style={{ width: "100%", maxWidth: "300px", height: "auto" }}
        />

        {/* Heading */}
        <p style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "16px",
          lineHeight: 1.55,
          color: "rgba(255, 255, 255, 0.6)",
          margin: 0,
          textAlign: "center",
        }}>
          Before you start writing your story, please review and accept our Terms of Service and Privacy Policy.
        </p>

        <TermsConsentForm />

      </div>
    </div>
  );
}
