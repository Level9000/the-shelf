"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, ProjectMember, ProjectWithChapters } from "@/types";
import {
  deleteProjectAction,
} from "@/lib/actions/project-actions";
import { ProjectAccessManager } from "@/components/projects/project-access-modal";
import { TapeButton } from "@/components/ui/tape-button";
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
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Deleting a project removes its chapters, tasks, and voice captures.
          </p>

          {confirmingDelete ? (
            <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
              <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: "#f87171", fontWeight: 600 }}>Delete this entire project?</p>
              <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: "rgba(248,113,113,0.65)", marginTop: "4px" }}>
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <TapeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                >
                  Keep project
                </TapeButton>
                <TapeButton
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting…" : "Delete project"}
                </TapeButton>
              </div>
            </div>
          ) : (
            <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete project
            </TapeButton>
          )}

          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </SideDrawer>
  );
}
