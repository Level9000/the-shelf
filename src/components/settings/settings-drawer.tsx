"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { deleteChapterAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/settings/settings-form";
import { SideDrawer } from "@/components/ui/side-drawer";

export function SettingsDrawer({
  open,
  profile,
  onClose,
  currentProjectId,
  currentChapterId,
  currentChapterName,
}: {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  currentProjectId?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleClose() {
    setConfirmingDelete(false);
    setDeleteError(null);
    onClose();
  }

  function handleDeleteChapter() {
    if (!currentProjectId || !currentChapterId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteChapterAction({ projectId: currentProjectId, boardId: currentChapterId });
        handleClose();
        router.push(`/projects/${currentProjectId}`);
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete the chapter.");
      }
    });
  }

  return (
    <SideDrawer
      open={open}
      title="Settings"
      description="Manage your Shelf profile and membership."
      onClose={handleClose}
      side="right"
    >
      <div className="flex flex-col gap-6">
        {currentProjectId && currentChapterId && (
          <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
              <TriangleAlert className="size-4" />
              Danger zone
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Current chapter:{" "}
              <span className="font-medium text-[var(--ink)]">
                {currentChapterName ?? "Untitled chapter"}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Deleting a chapter removes its board, columns, and all tasks permanently.
            </p>

            {confirmingDelete ? (
              <div className="mt-4 rounded-[1.4rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                <p className="font-semibold">Delete this chapter?</p>
                <p className="mt-1 leading-6">This action cannot be undone.</p>
                {deleteError && (
                  <p className="mt-2 rounded-xl bg-rose-100 px-3 py-2 text-xs">{deleteError}</p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={isDeleting}
                  >
                    Keep chapter
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteChapter}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete chapter"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                  Delete chapter
                </Button>
              </div>
            )}
          </section>
        )}

        <SettingsForm profile={profile} />
      </div>
    </SideDrawer>
  );
}
