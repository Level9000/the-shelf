"use client";

import { Menu, Upload } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { useTheme } from "@/lib/theme-context";

// ── Header icon button (settings / share) ────────────────────────────────────

function HeaderIconButton({
  icon,
  onClick,
  title,
  isDark,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: "34px", height: "34px",
        borderRadius: "6px",
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}`,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
        flexShrink: 0,
        zIndex: 1,
        transition: "background 0.25s, border-color 0.25s, color 0.25s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
      }}
    >
      {icon}
    </button>
  );
}

// ── Main header ───────────────────────────────────────────────────────────────

function formatDaysLeft(days: number): string {
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  if (days === 0) return "Due today";
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} over`;
}

export function ProjectAppHeader({
  projects,
  currentProjectId,
  onOpenSettings,
  onOpenShare,
  focusedChapterId,
  activeChapterId,
  activeChapterDaysLeft,
  activeChapterProgress,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  onOpenSettings: () => void;
  onOpenShare?: () => void;
  focusedChapterId?: string | null;
  activeChapterId?: string | null;
  activeChapterDaysLeft?: number | null;
  activeChapterProgress?: { completed: number; total: number } | null;
}) {
  const { theme } = useTheme();

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const isDark = theme === "dark";

  const focusedChapterIndex = currentProject?.chapters.findIndex((ch) => ch.id === focusedChapterId) ?? -1;
  const focusedChapter = focusedChapterIndex >= 0 ? currentProject?.chapters[focusedChapterIndex] : null;
  const focusedChapterLabel = focusedChapter
    ? (focusedChapter.chapterHeadline || `Chapter ${focusedChapterIndex + 1}`)
    : null;

  // The Active/days-left pills and progress bar only make sense while the
  // in-view chapter is the one actually being worked on.
  const isFocusedChapterActive = Boolean(focusedChapterId) && focusedChapterId === activeChapterId;
  const daysLeftLabel = isFocusedChapterActive && activeChapterDaysLeft != null
    ? formatDaysLeft(activeChapterDaysLeft)
    : null;
  const headerProgressPercent = isFocusedChapterActive && activeChapterProgress && activeChapterProgress.total > 0
    ? Math.round((activeChapterProgress.completed / activeChapterProgress.total) * 100)
    : null;

  return (
    <>
      {/* ── Top bar ── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          padding: "10px 20px",
          gap: "16px",
          height: "84px",
          background: isDark ? "#0d0d0d" : "#ffffff",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
          boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.06)",
          flexShrink: 0,
          transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
        }}
      >
        {/* Settings — top left */}
        <HeaderIconButton icon={<Menu size={16} />} onClick={onOpenSettings} title="Settings" isDark={isDark} />

        {/* Breadcrumb — desktop only */}
        {currentProject && (
          <div className="hidden lg:block" style={{ zIndex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "18px", fontWeight: 500,
              color: isDark ? "rgba(248,248,246,0.4)" : "rgba(26,14,0,0.45)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block",
            }}>
              {currentProject.name}
            </span>
          </div>
        )}

        {(
          /* Chapter-focus indicator — absolutely centred.
             Shows the Authored By icon at rest; snaps to the in-view
             chapter's label as the user scrolls (driven by ProjectShellFrame's
             scroll observer). */
          <div
            style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)",
              zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              maxWidth: "min(60vw, 320px)", minWidth: 0,
            }}
          >
            <span
              key={focusedChapterLabel ?? "icon"}
              style={{
                display: "inline-flex", flexDirection: "column", alignItems: "center",
                animation: "headerChapterSnapIn 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards",
                minWidth: 0, maxWidth: "100%",
              }}
            >
              {focusedChapterLabel ? (
                <>
                  <span style={{
                    fontFamily: "'Literata', Georgia, serif",
                    fontSize: "clamp(20px, 3.5vw, 26px)", fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    color: isDark ? "rgba(232,224,208,0.92)" : "rgba(22,19,15,0.88)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: "100%", minWidth: 0, display: "block",
                  }}>
                    {focusedChapterLabel}
                  </span>
                  {isFocusedChapterActive && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "3px" }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: "9px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: isDark ? "#c8a86b" : "rgba(22,19,15,0.7)",
                        border: `1px solid ${isDark ? "rgba(200,168,107,0.35)" : "rgba(0,0,0,0.18)"}`,
                        borderRadius: "999px", padding: "1px 7px",
                        whiteSpace: "nowrap",
                      }}>
                        Active
                      </span>
                      {daysLeftLabel && (
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "9px", fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: isDark ? "rgba(200,168,107,0.6)" : "rgba(22,19,15,0.5)",
                          border: `1px solid ${isDark ? "rgba(200,168,107,0.25)" : "rgba(0,0,0,0.13)"}`,
                          borderRadius: "999px", padding: "1px 7px",
                          whiteSpace: "nowrap",
                        }}>
                          {daysLeftLabel}
                        </span>
                      )}
                    </div>
                  )}
                  {isFocusedChapterActive && headerProgressPercent !== null && (
                    <div style={{
                      width: "100%", height: "3px", borderRadius: "2px",
                      background: isDark ? "rgba(245,200,74,0.12)" : "rgba(245,200,74,0.15)",
                      overflow: "hidden", marginTop: "5px",
                    }}>
                      <div style={{
                        width: `${headerProgressPercent}%`, height: "100%",
                        background: "linear-gradient(90deg, rgba(200,168,107,0.65) 0%, #c8a86b 100%)",
                        borderRadius: "2px",
                        transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      }} />
                    </div>
                  )}
                </>
              ) : (
                <img
                  src="/icons/authored-by-tape-icon.png"
                  alt="Authored By"
                  style={{ height: "52px", width: "auto", objectFit: "contain" }}
                />
              )}
            </span>
          </div>
        )}
        <style>{`
          @keyframes headerChapterSnapIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Share — top right */}
        {onOpenShare && (
          <div style={{ display: "flex", alignItems: "center", zIndex: 1, flexShrink: 0, marginLeft: "auto" }}>
            <HeaderIconButton icon={<Upload size={16} />} onClick={onOpenShare} title="Share" isDark={isDark} />
          </div>
        )}
      </div>
    </>
  );
}
