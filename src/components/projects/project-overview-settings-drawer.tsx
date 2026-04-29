"use client";

import { useState, useTransition } from "react";
import { TriangleAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, ProjectMember, ProjectWithChapters } from "@/types";
import {
  deleteProjectAction,
} from "@/lib/actions/project-actions";
import { ProjectAccessManager } from "@/components/projects/project-access-modal";
import { Button } from "@/components/ui/button";
import { SideDrawer } from "@/components/ui/side-drawer";

export function ProjectOverviewSettingsDrawer({
  open,
  project,
  currentUser,
  members,
  onClose,
}: {
  open: boolean;
  project: ProjectWithChapters;
  currentUser: AppUser;
  members: ProjectMember[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOwner = currentUser.id === project.userId;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteProjectAction({ projectId: project.id });
        router.push("/dashboard");
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete the project.",
        );
      }
    });
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      side="right"
      title={`${project.name} settings`}
      description="Manage project access and delete the project if it is no longer needed."
    >
      <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Users className="size-4 text-[var(--accent)]" />
          Access and collaboration
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Member access lives here now so the overview page can stay focused on the story.
        </p>
      </section>

      <ProjectAccessManager
        project={project}
        currentUser={currentUser}
        members={members}
        onUpdated={() => router.refresh()}
      />

      {isOwner ? (
        <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
            <TriangleAlert className="size-4" />
            Danger zone
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Deleting a project removes its chapters, tasks, and voice captures.
          </p>

          {confirmingDelete ? (
            <div className="mt-4 rounded-[1.4rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
              <p className="font-semibold">Delete this entire project?</p>
              <p className="mt-1 leading-6">
                This action cannot be undone.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                >
                  Keep project
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete project"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="sticky bottom-0 mt-5 flex justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Delete project
              </Button>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </SideDrawer>
  );
}
