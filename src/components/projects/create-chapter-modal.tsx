"use client";

import { useState, useTransition } from "react";
import { PlusCircle } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { createChapterAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function CreateChapterModal({
  open,
  project,
  onClose,
  onCreated,
}: {
  open: boolean;
  project: ProjectWithChapters | null;
  onClose: () => void;
  onCreated: (chapterId: string) => void;
}) {
  const [name, setName] = useState("");
  const [carryIncomplete, setCarryIncomplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!project) return null;

  const currentProject = project;
  const sourceBoardId = currentProject.chapters.at(-1)?.id ?? null;

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createChapterAction({
          projectId: currentProject.id,
          sourceBoardId,
          carryIncomplete,
          name,
        });
        setName("");
        setCarryIncomplete(true);
        onClose();
        onCreated(result.chapterId);
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Failed to create chapter.",
        );
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New chapter for ${currentProject.name}`}
      description="Each chapter is its own sprint board inside the same project."
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Chapter name</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Chapter ${currentProject.chapters.length + 1}`}
          />
        </div>
        <label className="flex items-start gap-3 rounded-[1.25rem] bg-[var(--surface-muted)] p-4">
          <input
            type="checkbox"
            checked={carryIncomplete}
            onChange={(event) => setCarryIncomplete(event.target.checked)}
            className="mt-1 size-4"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              Carry incomplete tasks forward
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Move unfinished tasks from the previous chapter into this new one.
            </p>
          </div>
        </label>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-0 mt-6 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={isPending}>
          <PlusCircle className="mr-2 size-4" />
          {isPending ? "Creating..." : "Create chapter"}
        </Button>
      </div>
    </Modal>
  );
}
