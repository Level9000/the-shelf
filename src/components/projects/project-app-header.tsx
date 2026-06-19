"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { useTheme } from "@/lib/theme-context";

// ── Chapter status ────────────────────────────────────────────────────────────
function chapterStatus(ch: ProjectWithChapters["chapters"][number]): "completed" | "active" | "planned" {
  if (ch.retroCompletedAt) return "completed";
  if (!ch.retroCompletedAt) return "active";
  return "planned";
}

// ── Tape label (Story / Board toggle) ────────────────────────────────────────

const TORN_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

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
  return (
    <span
      onClick={disabled ? undefined : onClick}
      style={{
        fontFamily: "var(--font-cass)",
        fontSize: "18px",
        fontWeight: 700,
        padding: "5px 14px",
        background: active ? "#f5c84a" : "#e8dfc0",
        clipPath: TORN_CLIP,
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

// ── Drawer nav item ───────────────────────────────────────────────────────────

function NavItem({
  active,
  muted,
  isDark,
  onClick,
  children,
}: {
  active?: boolean;
  muted?: boolean;
  isDark: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);

  const activeBg   = isDark ? "rgba(245,200,74,0.08)"  : "rgba(160,100,10,0.07)";
  const hoverBg    = isDark ? "rgba(255,255,255,0.04)"  : "rgba(0,0,0,0.04)";
  const divider    = isDark ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.07)";
  const activeClr  = isDark ? "#f5c84a"                 : "#8b5e0a";
  const mutedClr   = isDark ? "rgba(245,200,74,0.35)"   : "rgba(160,100,10,0.5)";
  const hoverClr   = isDark ? "#f8f8f6"                 : "rgba(26,14,0,0.9)";
  const normalClr  = isDark ? "rgba(248,248,246,0.6)"   : "rgba(26,14,0,0.6)";
  const dotClr     = isDark ? "#f5c84a"                 : "#8b5e0a";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 20px",
        background: active ? activeBg : hover && !muted ? hoverBg : "transparent",
        border: "none",
        borderTop: `1px solid ${divider}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {active && (
        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: dotClr, flexShrink: 0 }} />
      )}
      <span style={{
        fontFamily: muted ? "'Barlow Condensed', sans-serif" : "'Lora', Georgia, serif",
        fontSize: muted ? "15px" : "14px",
        fontWeight: muted ? 600 : active ? 600 : 400,
        letterSpacing: muted ? "0.12em" : "0",
        textTransform: muted ? "uppercase" : "none",
        color: active ? activeClr : muted ? mutedClr : hover ? hoverClr : normalClr,
        lineHeight: 1.4,
        transition: "color 0.15s",
      }}>
        {children}
      </span>
    </button>
  );
}

// ── Drawer section header ─────────────────────────────────────────────────────

function NavSectionHeader({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: "20px 20px 6px" }}>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "13px", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: isDark ? "rgba(245,200,74,0.4)" : "rgba(160,100,10,0.5)",
      }}>
        {children}
      </span>
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
  const [pendingProject, setPendingProject] = useState<ProjectWithChapters | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const effectiveNavChapterId = navChapterId ?? currentChapterId;
  const hasChapter = Boolean(effectiveNavChapterId);
  const currentChapterIndex = currentProject?.chapters.findIndex((ch) => ch.id === effectiveNavChapterId) ?? -1;
  const chapterNumber = currentChapterIndex >= 0 ? currentChapterIndex + 1 : null;

  const isBoard = activeNav === "board";
  const isStory = activeNav === "story" || activeNav === "overview";
  const isDark = theme === "dark";

  const displayedProject = pendingProject ?? currentProject;

  function closeDrawer() {
    setDrawerOpen(false);
    setPendingProject(null);
  }

  function handleProjectClick(p: ProjectWithChapters) {
    if (p.id === currentProjectId) {
      setPendingProject(null);
    } else if (p.chapters.length === 0) {
      router.push(`/projects/${p.id}`);
      closeDrawer();
    } else {
      setPendingProject(p);
    }
  }

  function handleSelectChapter(ch: { id: string }) {
    if (pendingProject) {
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
        {/* Hamburger */}
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

        {/* Breadcrumb — desktop only */}
        {currentProject && (
          <div className="hidden lg:block" style={{ zIndex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "18px", fontWeight: 500,
              color: isDark ? "rgba(248,248,246,0.4)" : "rgba(26,14,0,0.45)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block",
            }}>
              {currentProject.name}{chapterNumber ? `: Chapter ${chapterNumber}` : ""}
            </span>
          </div>
        )}

        {/* STORY / BOARD toggle — absolutely centred */}
        <div
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: "8px", zIndex: 2,
          }}
        >
          <TapeLabel active={isStory} side="left" onClick={goStory}>STORY</TapeLabel>
          <PillToggle on={isBoard} disabled={!hasChapter} onClick={handlePillToggle} />
          <TapeLabel active={isBoard} disabled={!hasChapter} side="right" onClick={goBoard}>BOARD</TapeLabel>
        </div>

        {/* Settings */}
        <div style={{ display: "flex", alignItems: "center", zIndex: 1, flexShrink: 0, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            style={{
              width: "34px", height: "34px",
              borderRadius: "6px",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}`,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
              flexShrink: 0,
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
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ── Navigation drawer ── */}
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
          background: isDark ? "#181818" : "#faf9f4",
          borderRight: `1px solid ${isDark ? "#282828" : "rgba(0,0,0,0.08)"}`,
          boxShadow: isDark ? "8px 0 40px rgba(0,0,0,0.8)" : "8px 0 40px rgba(0,0,0,0.12)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}>

          {/* Header — tape logo centered, X at right */}
          <div style={{
            background: isDark ? "#0a0a0a" : "#f0ebe0",
            borderBottom: `1px solid ${isDark ? "#1e1e1e" : "rgba(0,0,0,0.08)"}`,
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", flexShrink: 0,
          }}>
            <img
              src="/icons/authored-by-tape-icon.png"
              alt="Authored By"
              style={{ height: "40px", width: "auto", objectFit: "contain" }}
            />
            <button
              type="button"
              onClick={closeDrawer}
              style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)",
                background: "transparent", border: "none",
                color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)",
                cursor: "pointer", padding: "4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.8)" : "rgba(26,14,0,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)"; }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Projects */}
          <NavSectionHeader isDark={isDark}>Select Project</NavSectionHeader>
          {projects.map((p) => (
            <NavItem
              key={p.id}
              isDark={isDark}
              active={p.id === (pendingProject?.id ?? currentProjectId)}
              onClick={() => handleProjectClick(p)}
            >
              {p.name}
            </NavItem>
          ))}
          <NavItem isDark={isDark} muted onClick={() => { router.push("/projects/new"); closeDrawer(); }}>
            + New Project
          </NavItem>

          {/* Chapters */}
          <NavSectionHeader isDark={isDark}>
            {pendingProject ? `Chapters — ${pendingProject.name}` : "Select Chapter"}
          </NavSectionHeader>
          {pendingProject && (
            <div style={{
              padding: "2px 20px 6px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "10px", letterSpacing: "0.1em",
              color: isDark ? "rgba(245,200,74,0.3)" : "rgba(160,100,10,0.4)",
            }}>
              Pick a chapter to open ↓
            </div>
          )}
          {displayedProject?.chapters.map((ch, i) => {
            const st = chapterStatus(ch);
            return (
              <NavItem
                key={ch.id}
                isDark={isDark}
                active={!pendingProject && ch.id === (currentChapterId ?? navChapterId)}
                onClick={() => handleSelectChapter(ch)}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                  <span>Chapter {i + 1}</span>
                  {st === "active" && (
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "9px", fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: isDark ? "#c8a86b" : "rgba(22,19,15,0.6)",
                      border: `1px solid ${isDark ? "rgba(200,168,107,0.3)" : "rgba(0,0,0,0.15)"}`,
                      borderRadius: "999px",
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}>Active</span>
                  )}
                  {st === "planned" && (
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "9px", fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: isDark ? "rgba(200,168,107,0.3)" : "rgba(0,0,0,0.25)",
                      border: `1px solid ${isDark ? "rgba(200,168,107,0.12)" : "rgba(0,0,0,0.08)"}`,
                      borderRadius: "999px",
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}>Planned</span>
                  )}
                </span>
              </NavItem>
            );
          })}
          {!pendingProject && onPlanChapters && (
            <NavItem isDark={isDark} muted onClick={() => { onPlanChapters?.(); closeDrawer(); }}>
              + Plan new chapters
            </NavItem>
          )}
        </div>
      </div>
    </>
  );
}
