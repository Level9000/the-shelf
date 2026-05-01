"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProjectCreateForm({
  className,
  showHeader = true,
  submitLabel = "Start kickoff →",
}: {
  className?: string;
  showHeader?: boolean;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    router.push(`/projects/new?name=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex min-h-0 h-full flex-col",
        showHeader && "surface-card hairline rounded-[2rem] p-6",
        className,
      )}
    >
      {showHeader ? (
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Start a new project</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Give it a name — we&apos;ll walk you through the rest.
            </p>
          </div>
        </div>
      ) : null}
      <div className={cn(showHeader && "mt-5", "min-h-0 flex-1 space-y-4 overflow-y-auto pr-1")}>
        <div>
          <label className="mb-2 block text-sm font-medium">Project name</label>
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New launch planning"
            required
            autoFocus
          />
        </div>
        <p className="text-xs leading-5 text-[var(--muted)]">
          After naming your project, you&apos;ll have a short conversation with Shelf AI to set your north star, define success, and get a suggested workplan — before a single task is created.
        </p>
      </div>
      <div className="sticky bottom-0 mt-5 flex shrink-0 justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Starting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
