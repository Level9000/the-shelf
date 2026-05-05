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
      title="Welcome Back"
      subtitle="Sign in to continue making progress on your founders story."
      submitLabel="Sign in"
      secondaryHref="/signup"
      secondaryLabel="Create an account"
      secondaryPrompt="New to Shelf?"
      action={loginAction}
      nextPath={next}
    />
  );
}
