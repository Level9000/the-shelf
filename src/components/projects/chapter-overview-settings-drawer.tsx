"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Board } from "@/types";
import { deleteChapterAction } from "@/lib/actions/project-actions";
import { TapeButton } from "@/components/ui/tape-button";
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
            : "Failed to delete the track.",
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
      description="Manage this track and remove it when the work is no longer needed."
    >
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <p className="text-sm leading-6 text-[var(--muted)]">
          Deleting a track removes its board, columns, and tasks.
        </p>

        {confirmingDelete ? (
          <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
            <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: "#f87171", fontWeight: 600 }}>Delete this track?</p>
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
                Keep track
              </TapeButton>
              <TapeButton
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting…" : "Delete track"}
              </TapeButton>
            </div>
          </div>
        ) : (
          <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
            Delete track
          </TapeButton>
        )}

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </SideDrawer>
  );
}
