import { signupAction } from "@/lib/actions/auth-actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <AuthForm
      title="Create your Shelf"
      subtitle="Start with email and password. Social providers can layer in later."
      submitLabel="Create account"
      secondaryHref="/login"
      secondaryLabel="Sign in"
      secondaryPrompt="Already have an account?"
      action={signupAction}
    />
  );
}
