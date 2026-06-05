import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found.", { status: 404 });
  }

  const devEmail = process.env.DEV_TEST_EMAIL ?? "dev@authoredby.local";
  const devPassword = process.env.DEV_TEST_PASSWORD ?? "devpassword-authored-by";

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: devEmail,
    password: devPassword,
  });

  if (error) {
    return new Response(
      `Dev login failed: ${error.message}\n\n` +
      `Make sure you have created the test user. Visit http://localhost:3000/dev-login for setup SQL.`,
      { status: 500, headers: { "Content-Type": "text/plain" } },
    );
  }

  redirect("/projects");
}
