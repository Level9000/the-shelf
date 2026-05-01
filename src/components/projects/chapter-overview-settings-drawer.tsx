"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Board } from "@/types";
import { deleteChapterAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { SideDrawer } from "@/components/ui/side-drawer";

export function ChapterOverviewSettingsDrawer({
  open,
  projectId,
  board,
  onClose,
}: {
  open: boolean;
  projectId: string;
  board: Board;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteChapterAction({
          projectId,
          boardId: board.id,
        });
        router.push(`/projects/${projectId}`);
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete the chapter.",
        );
      }
    });
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      side="right"
      title={`${board.name} settings`}
      description="Manage this chapter and remove it when the work is no longer needed."
    >
      <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
          <TriangleAlert className="size-4" />
          Danger zone
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Deleting a chapter removes its board, columns, and tasks.
        </p>

        {confirmingDelete ? (
          <div className="mt-4 rounded-[1.4rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-semibold">Delete this chapter?</p>
            <p className="mt-1 leading-6">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmingDelete(false)}
                disabled={isPending}
              >
                Keep chapter
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete chapter"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="sticky bottom-0 mt-5 flex justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Delete chapter
            </Button>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </SideDrawer>
  );
}
