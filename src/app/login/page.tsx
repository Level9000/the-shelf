import { loginAction } from "@/lib/actions/auth-actions";
import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to capture loose voice notes and turn them into motion."
      submitLabel="Sign in"
      secondaryHref="/signup"
      secondaryLabel="Create an account"
      secondaryPrompt="New to Shelf?"
      action={loginAction}
      nextPath={next}
    />
  );
}
