"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { deleteChapterAction, deleteProjectAction } from "@/lib/actions/project-actions";
import { logoutAction } from "@/lib/actions/auth-actions";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useTheme } from "@/lib/theme-context";
import { SettingsForm } from "@/components/settings/settings-form";
import { TapeButton } from "@/components/ui/tape-button";

// ── Tape clip ─────────────────────────────────────────────────────────────────

// Flat left edge, torn right edge — flush against the left wall of the drawer
const TAPE_CLIP = "polygon(0% 0%, calc(100% - 2px) 0%, 100% 20%, calc(100% - 4px) 48%, 100% 72%, calc(100% - 2px) 100%, 0% 100%)";

// ── Section wrapper ───────────────────────────────────────────────────────────

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ padding: "10px 0 8px" }}>
        <span style={{
          display: "inline-block",
          fontFamily: "var(--font-cass)",
          fontSize: "11px",
          letterSpacing: "0.15em",
          color: "#1a0e00",
          background: "#e8dfc0",
          padding: "4px 22px 5px 14px",
          clipPath: TAPE_CLIP,
          boxShadow: "3px 1px 5px rgba(0,0,0,0.35)",
          textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Settings content ──────────────────────────────────────────────────────────

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
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [deleteProjectInput, setDeleteProjectInput] = useState("");
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [isDeletingProject, startDeleteProjectTransition] = useTransition();

  // Theme-aware colors
  const labelColor = isDark ? "rgba(232,223,192,0.38)" : "rgba(26,14,0,0.38)";
  const bodyColor = isDark ? "rgba(232,223,192,0.65)" : "rgba(26,14,0,0.65)";
  const strongColor = isDark ? "rgba(232,223,192,0.88)" : "rgba(26,14,0,0.88)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.03)";
  const inputColor = isDark ? "rgba(232,223,192,0.85)" : "rgba(26,14,0,0.85)";
  const themeLabelColor = isDark ? "rgba(232,223,192,0.3)" : "rgba(26,14,0,0.3)";

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
    <div>

      {/* ── Appearance ── */}
      <DrawerSection label="Appearance">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
          <span style={{
            fontFamily: "var(--font-cass)",
            fontSize: "7.5px",
            letterSpacing: "0.18em",
            color: themeLabelColor,
            textTransform: "uppercase",
            userSelect: "none",
          }}>
            theme
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* LIGHT tape label */}
            <span
              onClick={() => setTheme("light")}
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "18px",
                fontWeight: 700,
                padding: "5px 14px",
                background: theme === "light" ? "#f5c84a" : "#e8dfc0",
                clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                boxShadow: "2px 1px 5px rgba(0,0,0,0.35)",
                color: theme === "light" ? "#1a0e00" : "#9a8450",
                cursor: "pointer",
                userSelect: "none",
                transition: "color 0.28s, background 0.28s",
              }}
            >
              LIGHT
            </span>

            {/* Pill toggle — on = dark */}
            <div
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{
                position: "relative",
                width: "48px", height: "26px",
                background: theme === "dark" ? "#1e1608" : "#e0dbd2",
                borderRadius: "13px",
                border: `1.5px solid ${theme === "dark" ? "#c8880a" : "rgba(26,14,0,0.18)"}`,
                boxShadow: theme === "dark"
                  ? "inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(200,136,10,0.25), 0 0 20px rgba(200,120,0,0.12)"
                  : "inset 0 2px 4px rgba(0,0,0,0.07)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.3s, border-color 0.3s",
              }}
            >
              <div style={{
                position: "absolute",
                top: "3px", left: "3px",
                width: "18px", height: "18px",
                borderRadius: "50%",
                background: theme === "dark"
                  ? "radial-gradient(circle at 35% 30%, #ffd060, #c87010)"
                  : "radial-gradient(circle at 35% 30%, #c8b880, #7a6030)",
                border: "1px solid #5a4820",
                boxShadow: theme === "dark"
                  ? "0 2px 5px rgba(0,0,0,0.6), 0 0 8px rgba(255,180,30,0.7), inset 0 1px 0 rgba(255,255,200,0.3)"
                  : "0 2px 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
                transform: theme === "dark" ? "translateX(22px)" : "translateX(0)",
                transition: "transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), background 0.28s, box-shadow 0.28s",
              }} />
            </div>

            {/* DARK tape label */}
            <span
              onClick={() => setTheme("dark")}
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "18px",
                fontWeight: 700,
                padding: "5px 14px",
                background: theme === "dark" ? "#f5c84a" : "#e8dfc0",
                clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                boxShadow: "-2px 1px 5px rgba(0,0,0,0.35)",
                color: theme === "dark" ? "#1a0e00" : "#9a8450",
                cursor: "pointer",
                userSelect: "none",
                transition: "color 0.28s, background 0.28s",
              }}
            >
              DARK
            </span>
          </div>
        </div>
      </DrawerSection>

      {/* ── Profile ── */}
      <SettingsForm profile={profile} />

      {/* ── Danger zone ── */}
      {hasDangerZone && (
        <div>
          {/* Red tape label for danger — same flat-left/torn-right style */}
          <div style={{ padding: "10px 0 8px" }}>
            <span style={{
              display: "inline-block",
              fontFamily: "var(--font-cass)",
              fontSize: "11px",
              letterSpacing: "0.15em",
              color: "#fff0f0",
              background: "#7a1f1f",
              padding: "4px 22px 5px 14px",
              clipPath: TAPE_CLIP,
              boxShadow: "3px 1px 5px rgba(0,0,0,0.5)",
              textTransform: "uppercase",
            }}>
              Danger Zone
            </span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Delete chapter */}
            {currentChapterId && (
              <div>
                <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "11px", color: labelColor, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Chapter
                </p>
                <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: bodyColor, margin: "0 0 12px", lineHeight: 1.55 }}>
                  <span style={{ color: strongColor, fontWeight: 600 }}>{currentChapterName ?? "Untitled chapter"}</span>
                  {" "}— removes its board, columns, and all tasks permanently.
                </p>
                {confirmingDelete ? (
                  <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
                    <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", fontWeight: 600, color: "#f87171", margin: "0 0 4px" }}>Delete this chapter?</p>
                    <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "12px", color: "rgba(248,113,113,0.65)", margin: "0 0 12px" }}>This action cannot be undone.</p>
                    {deleteError && (
                      <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "12px", color: "#f87171", margin: "0 0 10px" }}>{deleteError}</p>
                    )}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <TapeButton variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>Keep chapter</TapeButton>
                      <TapeButton variant="danger" size="sm" onClick={handleDeleteChapter} disabled={isDeleting}>{isDeleting ? "Deleting…" : "Delete chapter"}</TapeButton>
                    </div>
                  </div>
                ) : (
                  <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>Delete chapter</TapeButton>
                )}
              </div>
            )}


            {/* Delete project */}
            {currentProjectName && (
              <div>
                <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "11px", color: labelColor, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Project
                </p>
                <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: bodyColor, margin: "0 0 12px", lineHeight: 1.55 }}>
                  <span style={{ color: strongColor, fontWeight: 600 }}>{currentProjectName}</span>
                  {" "}— permanently deletes all chapters, boards, and tasks.
                </p>
                {confirmingDeleteProject ? (
                  <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
                    <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", fontWeight: 600, color: "#f87171", margin: "0 0 2px" }}>Type the project name to confirm:</p>
                    <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "rgba(248,113,113,0.6)", margin: "0 0 10px" }}>{currentProjectName}</p>
                    <input
                      type="text"
                      value={deleteProjectInput}
                      onChange={(e) => setDeleteProjectInput(e.target.value)}
                      placeholder={currentProjectName}
                      style={{
                        width: "100%",
                        background: inputBg,
                        border: "1px solid rgba(248,113,113,0.22)",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        fontFamily: "Verdana, Geneva, sans-serif",
                        fontSize: "13px",
                        color: inputColor,
                        outline: "none",
                        boxSizing: "border-box",
                        marginBottom: "12px",
                      }}
                    />
                    {deleteProjectError && (
                      <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "12px", color: "#f87171", margin: "0 0 10px" }}>{deleteProjectError}</p>
                    )}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <TapeButton variant="secondary" size="sm" onClick={() => { setConfirmingDeleteProject(false); setDeleteProjectInput(""); setDeleteProjectError(null); }} disabled={isDeletingProject}>Cancel</TapeButton>
                      <TapeButton variant="danger" size="sm" onClick={handleDeleteProject} disabled={isDeletingProject || deleteProjectInput !== currentProjectName}>{isDeletingProject ? "Deleting…" : "Delete project"}</TapeButton>
                    </div>
                  </div>
                ) : (
                  <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDeleteProject(true)}>Delete project</TapeButton>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Sign out footer button ────────────────────────────────────────────────────

function SignOutButton() {
  return (
    <form action={logoutAction}>
      <TapeButton variant="secondary" size="sm" type="submit">Sign out</TapeButton>
    </form>
  );
}

// ── Drawer shell ──────────────────────────────────────────────────────────────

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
    <SideDrawer open={open} title="" onClose={onClose} side="right" footer={<SignOutButton />}>
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
