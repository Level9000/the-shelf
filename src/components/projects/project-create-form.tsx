"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type State = {
  error?: string;
};

const initialState: State = {};

async function wrappedAction(_state: State, formData: FormData): Promise<State> {
  try {
    await createProjectAction(formData);
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create the project.",
    };
  }
}

export function ProjectCreateForm({
  className,
  showHeader = true,
  submitLabel = "Create project",
}: {
  className?: string;
  showHeader?: boolean;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(wrappedAction, initialState);

  return (
    <form
      action={action}
      className={cn(
        showHeader && "surface-card hairline rounded-[2rem] p-6",
        className,
      )}
    >
      {showHeader ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Create a project</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Every project gets a default voice-ready board.
            </p>
          </div>
        </div>
      ) : null}
      <div className={cn(showHeader && "mt-5", "space-y-4")}>
        <div>
          <label className="mb-2 block text-sm font-medium">Project name</label>
          <Input name="name" placeholder="New launch planning" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <Textarea
            name="description"
            placeholder="Optional project framing for better AI task extraction."
            className="min-h-[110px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Goal</label>
          <Textarea
            name="goal"
            placeholder="What is this project trying to achieve?"
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Why this matters</label>
          <Textarea
            name="whyItMatters"
            placeholder="Why is this work worth doing now?"
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            What success looks like
          </label>
          <Textarea
            name="successLooksLike"
            placeholder="Describe the outcome you want to see."
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            How we know we are done
          </label>
          <Textarea
            name="doneDefinition"
            placeholder="Define the completion signal for this project."
            className="min-h-[88px]"
          />
        </div>
      </div>
      {state.error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
