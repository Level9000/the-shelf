"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { useTheme } from "@/lib/theme-context";

// ── LED menu item ─────────────────────────────────────────────────────────────

const BOTH_TORN_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

function LedItem({
  active,
  muted,
  onClick,
  children,
}: {
  active?: boolean;
  muted?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);

  const bg = (active || hover)
    ? "#f5c84a"
    : muted
    ? "rgba(232,212,176,0.45)"
    : "#e8dfc0";

  const textColor = (active || hover) ? "#1a0e00" : muted ? "rgba(26,14,0,0.45)" : "#3a2a0a";
  const shadow = (active || hover) && !muted
    ? "0 0 20px rgba(245,200,74,0.5), 0 2px 8px rgba(0,0,0,0.22)"
    : "0 1px 4px rgba(0,0,0,0.10)";

  return (
    <div style={{ padding: "3px 0" }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          background: bg,
          border: "none",
          clipPath: BOTH_TORN_CLIP,
          cursor: "pointer",
          padding: "8px 28px 10px",
          textAlign: "left",
          display: "block",
          fontFamily: "var(--font-cass)",
          fontSize: "20px",
          fontWeight: 700,
          color: textColor,
          textTransform: "uppercase",
          fontStyle: muted ? "italic" : "normal",
          letterSpacing: "0.01em",
          lineHeight: 1.3,
          boxShadow: shadow,
          transform: (active || hover) && !muted ? "translateY(-1px)" : "translateY(0)",
          transition: "background 0.15s, box-shadow 0.15s, color 0.15s, transform 0.12s",
        }}
      >
        {children}
      </button>
    </div>
  );
}

// Flat left edge, torn right edge — left side sits flush against the drawer wall
const DRAWER_TAPE_CLIP = "polygon(0% 0%, calc(100% - 2px) 0%, 100% 20%, calc(100% - 4px) 48%, 100% 72%, calc(100% - 2px) 100%, 0% 100%)";

function LedMenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 0 6px" }}>
      <span style={{
        display: "inline-block",
        fontFamily: "var(--font-cass)",
        fontSize: "11px",
        letterSpacing: "0.15em",
        color: "#1a0e00",
        background: "#e8dfc0",
        padding: "4px 22px 5px 14px",
        clipPath: DRAWER_TAPE_CLIP,
        boxShadow: "3px 1px 5px rgba(0,0,0,0.35)",
        textTransform: "uppercase",
      }}>
        {children}
      </span>
    </div>
  );
}

// ── Tape label ────────────────────────────────────────────────────────────────

function TapeLabel({
  children,
  active,
  disabled,
  side,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  side: "left" | "right";
  onClick: () => void;
}) {
  const clip = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";
  return (
    <span
      onClick={disabled ? undefined : onClick}
      style={{
        fontFamily: "var(--font-cass)",
        fontSize: "18px",
        fontWeight: 700,
        padding: "5px 14px",
        background: active ? "#f5c84a" : "#e8dfc0",
        clipPath: clip,
        boxShadow: side === "left" ? "2px 1px 5px rgba(0,0,0,0.35)" : "-2px 1px 5px rgba(0,0,0,0.35)",
        color: active ? "#1a0e00" : disabled ? "#b8a870" : "#9a8450",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        transition: "color 0.28s, background 0.28s",
        position: "relative",
        zIndex: 1,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </span>
  );
}

// ── Pill toggle ───────────────────────────────────────────────────────────────

function PillToggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: "relative",
        width: "48px", height: "26px",
        background: on
          ? (isDark ? "#1e1608" : "#e0dbd2")
          : (isDark ? "#151209" : "#e8e4dc"),
        borderRadius: "13px",
        border: `1.5px solid ${on ? "#c8880a" : (isDark ? "#3a2e10" : "rgba(26,14,0,0.18)")}`,
        boxShadow: on
          ? (isDark
              ? "inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(200,136,10,0.25), 0 0 20px rgba(200,120,0,0.12)"
              : "inset 0 2px 4px rgba(0,0,0,0.08), 0 0 10px rgba(200,136,10,0.18), 0 0 18px rgba(200,120,0,0.09)")
          : (isDark
              ? "inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05)"
              : "inset 0 2px 4px rgba(0,0,0,0.07)"),
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
        transition: "background 0.3s, border-color 0.3s",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px", left: "3px",
        width: "18px", height: "18px",
        borderRadius: "50%",
        background: on
          ? "radial-gradient(circle at 35% 30%, #ffd060, #c87010)"
          : "radial-gradient(circle at 35% 30%, #c8b880, #7a6030)",
        border: "1px solid #5a4820",
        boxShadow: on
          ? "0 2px 5px rgba(0,0,0,0.6), 0 0 8px rgba(255,180,30,0.7), inset 0 1px 0 rgba(255,255,200,0.3)"
          : "0 2px 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
        transform: on ? "translateX(22px)" : "translateX(0)",
        transition: "transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), background 0.28s, box-shadow 0.28s",
      }} />
    </div>
  );
}

// ── Main header ───────────────────────────────────────────────────────────────

export function ProjectAppHeader({
  projects,
  currentProjectId,
  currentChapterId,
  navChapterId,
  onOpenSettings,
  activeNav,
  onPlanChapters,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  currentChapterId?: string | null;
  navChapterId?: string | null;
  onOpenSettings: () => void;
  activeNav?: "overview" | "story" | "board";
  onPlanChapters?: () => void;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Project selected in step 1 — waiting for track selection before navigating
  const [pendingProject, setPendingProject] = useState<ProjectWithChapters | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const effectiveNavChapterId = navChapterId ?? currentChapterId;
  const hasChapter = Boolean(effectiveNavChapterId);
  const currentChapterIndex = currentProject?.chapters.findIndex((ch) => ch.id === effectiveNavChapterId) ?? -1;
  const chapterNumber = currentChapterIndex >= 0 ? currentChapterIndex + 1 : null;

  const isBoard = activeNav === "board";
  const isStory = activeNav === "story" || activeNav === "overview";
  const isDark = theme === "dark";

  // The project whose tracks are shown in "Select Track"
  const displayedProject = pendingProject ?? currentProject;

  // Nav drawer theme-aware colors
  const drawerBg = isDark ? "#0d1109" : "#faf9f4";
  const drawerBorder = isDark ? "#3a3010" : "rgba(26,14,0,0.10)";
  const drawerShadow = isDark
    ? "8px 0 40px rgba(0,0,0,0.95), inset -1px 0 0 rgba(255,180,30,0.04)"
    : "8px 0 40px rgba(0,0,0,0.12)";
  const drawerHeaderBorder = isDark ? "#1a1608" : "rgba(26,14,0,0.10)";
  const drawerCloseColor = isDark ? "#7a6a2e" : "rgba(26,14,0,0.4)";

  function closeDrawer() {
    setDrawerOpen(false);
    setPendingProject(null);
  }

  function handleProjectClick(p: ProjectWithChapters) {
    if (p.id === currentProjectId) {
      // Tapping the active project clears any pending selection
      setPendingProject(null);
    } else if (p.chapters.length === 0) {
      // No tracks to pick from — navigate directly
      router.push(`/projects/${p.id}`);
      closeDrawer();
    } else {
      // Step 1: show this project's tracks, wait for track selection
      setPendingProject(p);
    }
  }

  function handleSelectChapter(ch: { id: string }) {
    if (pendingProject) {
      // Step 2: navigate to the chosen track in the pending project
      router.push(`/projects/${pendingProject.id}/chapters/${ch.id}/board`);
      closeDrawer();
    } else if (isBoard) {
      router.push(`/projects/${currentProjectId}/chapters/${ch.id}/board`);
      closeDrawer();
    } else {
      const el = document.getElementById(`chapter-${ch.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.push(`/projects/${currentProjectId}?chapter=${ch.id}`);
      closeDrawer();
    }
  }

  function handlePillToggle() {
    if (!effectiveNavChapterId) return;
    if (isBoard) {
      router.push(`/projects/${currentProjectId}?chapter=${effectiveNavChapterId}`);
    } else {
      router.push(`/projects/${currentProjectId}/chapters/${effectiveNavChapterId}/board`);
    }
  }

  function goStory() {
    const chapterParam = effectiveNavChapterId ? `?chapter=${effectiveNavChapterId}` : "";
    router.push(`/projects/${currentProjectId}${chapterParam}`);
  }

  function goBoard() {
    if (!effectiveNavChapterId) return;
    router.push(`/projects/${currentProjectId}/chapters/${effectiveNavChapterId}/board`);
  }

  return (
    <>
      {/* ── Panel ── */}
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

        {/* ── Hamburger ── */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
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
        >
          <Menu size={16} />
        </button>

        {/* ── Project / Chapter breadcrumb — desktop only ── */}
        {currentProject && (
          <div className="hidden lg:block" style={{ zIndex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: "var(--font-cass)",
              fontSize: "14px",
              letterSpacing: "0.06em",
              color: isDark ? "rgba(232,223,192,0.45)" : "rgba(26,14,0,0.38)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}>
              {currentProject.name}{chapterNumber ? `: Track ${chapterNumber}` : ""}
            </span>
          </div>
        )}

        {/* ── STORY / BOARD toggle — always absolutely centred ── */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 2,
          }}
        >
          <TapeLabel active={isStory} side="left" onClick={goStory}>
            STORY
          </TapeLabel>
          <PillToggle on={isBoard} disabled={!hasChapter} onClick={handlePillToggle} />
          <TapeLabel active={isBoard} disabled={!hasChapter} side="right" onClick={goBoard}>
            BOARD
          </TapeLabel>
        </div>

        {/* ── Settings ── */}
        <div style={{ display: "flex", alignItems: "center", zIndex: 1, flexShrink: 0, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            style={{
              width: "30px", height: "30px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"; }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* ── Navigation drawer (all screen sizes) ── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          pointerEvents: drawerOpen ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={closeDrawer}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.75)",
            opacity: drawerOpen ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />

        {/* Panel */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: "280px",
          background: drawerBg,
          borderRight: `1.5px solid ${drawerBorder}`,
          boxShadow: drawerShadow,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.25s, border-color 0.25s",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Drawer close button */}
          <div style={{
            display: "flex", justifyContent: "flex-end",
            padding: "10px 12px 8px",
            borderBottom: `1px solid ${drawerHeaderBorder}`,
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={closeDrawer}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: drawerCloseColor, padding: "4px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Project section */}
          <LedMenuHeader>Select Project</LedMenuHeader>
          {projects.map((p) => (
            <LedItem
              key={p.id}
              active={p.id === (pendingProject?.id ?? currentProjectId)}
              onClick={() => handleProjectClick(p)}
            >
              {p.name}
            </LedItem>
          ))}
          <LedItem muted onClick={() => { router.push("/projects/new"); closeDrawer(); }}>
            + New Project
          </LedItem>

          {/* Track section — shows pending project's tracks while waiting for step 2 */}
          <LedMenuHeader>
            {pendingProject ? `Tracks — ${pendingProject.name}` : "Select Track"}
          </LedMenuHeader>
          {pendingProject && (
            <div style={{
              padding: "4px 14px 2px",
              fontFamily: "var(--font-cass)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: isDark ? "rgba(200,168,107,0.55)" : "rgba(26,14,0,0.42)",
            }}>
              Pick a track to open ↓
            </div>
          )}
          {displayedProject?.chapters.map((ch, i) => (
            <LedItem
              key={ch.id}
              active={!pendingProject && ch.id === (currentChapterId ?? navChapterId)}
              onClick={() => handleSelectChapter(ch)}
            >
              Track {i + 1}
            </LedItem>
          ))}
          {!pendingProject && onPlanChapters && (
            <LedItem muted onClick={() => { onPlanChapters?.(); closeDrawer(); }}>
              + Plan new tracks
            </LedItem>
          )}
        </div>
      </div>
    </>
  );
}
