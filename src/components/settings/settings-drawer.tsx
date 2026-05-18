"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { deleteChapterAction, deleteProjectAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/settings/settings-form";
import { SideDrawer } from "@/components/ui/side-drawer";

export function SettingsContent({
  profile,
  currentProjectId,
  currentProjectName,
  currentChapterId,
  currentChapterName,
  onClose,
}: {
  profile: UserProfile;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [deleteProjectInput, setDeleteProjectInput] = useState("");
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [isDeletingProject, startDeleteProjectTransition] = useTransition();

  function handleDeleteProject() {
    if (!currentProjectId) return;
    setDeleteProjectError(null);
    startDeleteProjectTransition(async () => {
      try {
        await deleteProjectAction({ projectId: currentProjectId });
        onClose?.();
        router.push("/projects");
        router.refresh();
      } catch (err) {
        setDeleteProjectError(err instanceof Error ? err.message : "Failed to delete the project.");
      }
    });
  }

  function handleDeleteChapter() {
    if (!currentProjectId || !currentChapterId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteChapterAction({ projectId: currentProjectId, boardId: currentChapterId });
        onClose?.();
        router.push(`/projects/${currentProjectId}`);
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete the chapter.");
      }
    });
  }

  const hasDangerZone = Boolean(currentProjectId && (currentChapterId || currentProjectName));

  return (
    <div className="flex flex-col gap-6">
      {hasDangerZone && (
        <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
            <TriangleAlert className="size-4" />
            Danger zone
          </div>

          {/* ── Delete chapter ── */}
          {currentChapterId && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Chapter</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--ink)]">{currentChapterName ?? "Untitled chapter"}</span>
                {" "}— removes its board, columns, and all tasks permanently.
              </p>
              {confirmingDelete ? (
                <div className="mt-3 rounded-[1.25rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  <p className="font-semibold">Delete this chapter?</p>
                  <p className="mt-1 leading-6">This action cannot be undone.</p>
                  {deleteError && (
                    <p className="mt-2 rounded-xl bg-rose-100 px-3 py-2 text-xs">{deleteError}</p>
                  )}
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>
                      Keep chapter
                    </Button>
                    <Button variant="danger" onClick={handleDeleteChapter} disabled={isDeleting}>
                      {isDeleting ? "Deleting..." : "Delete chapter"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                    Delete chapter
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Divider ── */}
          {currentChapterId && currentProjectName && (
            <div className="my-5 border-t border-black/8" />
          )}

          {/* ── Delete project ── */}
          {currentProjectName && (
            <div className={currentChapterId ? "" : "mt-4"}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Project</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--ink)]">{currentProjectName}</span>
                {" "}— permanently deletes all chapters, boards, and tasks.
              </p>
              {confirmingDeleteProject ? (
                <div className="mt-3 rounded-[1.25rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  <p className="font-semibold">Type the project name to confirm:</p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-rose-600/80">{currentProjectName}</p>
                  <input
                    type="text"
                    value={deleteProjectInput}
                    onChange={(e) => setDeleteProjectInput(e.target.value)}
                    placeholder={currentProjectName}
                    className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[var(--ink)] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  {deleteProjectError && (
                    <p className="mt-2 rounded-xl bg-rose-100 px-3 py-2 text-xs">{deleteProjectError}</p>
                  )}
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => { setConfirmingDeleteProject(false); setDeleteProjectInput(""); setDeleteProjectError(null); }}
                      disabled={isDeletingProject}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteProject}
                      disabled={isDeletingProject || deleteProjectInput !== currentProjectName}
                    >
                      {isDeletingProject ? "Deleting..." : "Delete project"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <Button variant="danger" onClick={() => setConfirmingDeleteProject(true)}>
                    Delete project
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <SettingsForm profile={profile} />
    </div>
  );
}

export function SettingsDrawer({
  open,
  profile,
  onClose,
  currentProjectId,
  currentProjectName,
  currentChapterId,
  currentChapterName,
}: {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
}) {
  return (
    <SideDrawer
      open={open}
      title="Settings"
      description="Manage your Shelf profile and membership."
      onClose={onClose}
      side="right"
    >
      <SettingsContent
        profile={profile}
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        currentChapterId={currentChapterId}
        currentChapterName={currentChapterName}
        onClose={onClose}
      />
    </SideDrawer>
  );
}
