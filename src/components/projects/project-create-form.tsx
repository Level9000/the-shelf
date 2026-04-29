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
        "flex min-h-0 h-full flex-col",
        showHeader && "surface-card hairline rounded-[2rem] p-6",
        className,
      )}
    >
      {showHeader ? (
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Create a project</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Every project gets a default voice-ready board.
            </p>
          </div>
        </div>
      ) : null}
      <div className={cn(showHeader && "mt-5", "min-h-0 flex-1 space-y-4 overflow-y-auto pr-1")}>
        <div>
          <label className="mb-2 block text-sm font-medium">Project name</label>
          <Input name="name" placeholder="New launch planning" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <Textarea
            name="description"
            placeholder="Add a short description of what this board is for."
            className="min-h-[110px]"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Goal (optional)</label>
          <Textarea
            name="goal"
            placeholder="What is this project trying to achieve?"
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Why this matters (optional)
          </label>
          <Textarea
            name="whyItMatters"
            placeholder="Why is this work worth doing now?"
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            What success looks like (optional)
          </label>
          <Textarea
            name="successLooksLike"
            placeholder="Describe the outcome you want to see."
            className="min-h-[88px]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            How we know we are done (optional)
          </label>
          <Textarea
            name="doneDefinition"
            placeholder="Define the completion signal for this project."
            className="min-h-[88px]"
          />
        </div>
      </div>
      {state.error ? (
        <p className="mt-4 shrink-0 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-0 mt-5 flex shrink-0 justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
