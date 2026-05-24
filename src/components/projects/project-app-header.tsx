"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";

// ── LED menu item ─────────────────────────────────────────────────────────────

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
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "12px",
        fontStyle: muted ? "italic" : "normal",
        color: active ? "#e8a020" : hover ? "#e8a020" : muted ? "#5a4a18" : "#9a7820",
        textShadow: active ? "0 0 6px rgba(232,160,32,0.4)" : "none",
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: hover ? "rgba(232,160,32,0.07)" : "transparent",
        border: "none",
        borderBottom: "1px solid #131008",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      <span style={{ fontSize: "10px", color: "#e8a020", minWidth: "10px", flexShrink: 0 }}>
        {active ? "▸" : ""}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
    </button>
  );
}

function LedMenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: "8px",
      letterSpacing: "0.28em",
      color: "#4a3a12",
      textTransform: "uppercase",
      padding: "8px 14px 6px",
      borderBottom: "1px solid #1a1608",
    }}>
      {children}
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
        fontFamily: "'Caveat', cursive",
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
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: "relative",
        width: "48px", height: "26px",
        background: on ? "#1e1608" : "#151209",
        borderRadius: "13px",
        border: `1.5px solid ${on ? "#c8880a" : "#3a2e10"}`,
        boxShadow: on
          ? "inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(200,136,10,0.25), 0 0 20px rgba(200,120,0,0.12)"
          : "inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05)",
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const effectiveNavChapterId = navChapterId ?? currentChapterId;
  const hasChapter = Boolean(effectiveNavChapterId);

  const isBoard = activeNav === "board";
  const isStory = activeNav === "story" || activeNav === "overview";

  function handleSelectProject(p: ProjectWithChapters) {
    const activeChapter =
      p.chapters.find((ch) => !ch.retroCompletedAt) ??
      p.chapters[p.chapters.length - 1];
    const dest = activeChapter
      ? `/projects/${p.id}?chapter=${activeChapter.id}`
      : `/projects/${p.id}`;
    router.push(dest);
  }

  function handleSelectChapter(ch: { id: string }) {
    if (isBoard) {
      router.push(`/projects/${currentProjectId}/chapters/${ch.id}/board`);
    } else {
      const el = document.getElementById(`chapter-${ch.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.push(`/projects/${currentProjectId}?chapter=${ch.id}`);
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
          background: isStory ? "#0d0d0d" : "#ffffff",
          borderBottom: `1px solid ${isStory ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
          boxShadow: isStory ? "0 2px 12px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.06)",
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
            background: isStory ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isStory ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isStory ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            flexShrink: 0,
            zIndex: 1,
            transition: "background 0.25s, border-color 0.25s, color 0.25s",
          }}
        >
          <Menu size={16} />
        </button>

        {/* ── STORY / BOARD toggle — always absolutely centred ── */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 2,
            gap: "5px",
          }}
        >
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "7.5px",
            letterSpacing: "0.18em",
            color: isStory ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
            textTransform: "uppercase",
            userSelect: "none",
          }}>
            view
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TapeLabel active={isStory} side="left" onClick={goStory}>
              STORY
            </TapeLabel>
            <PillToggle on={isBoard} disabled={!hasChapter} onClick={handlePillToggle} />
            <TapeLabel active={isBoard} disabled={!hasChapter} side="right" onClick={goBoard}>
              BOARD
            </TapeLabel>
          </div>
        </div>

        {/* ── Settings + Logout ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", zIndex: 1, flexShrink: 0, marginLeft: "auto" }}>
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
              color: isStory ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = isStory ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isStory ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"; }}
          >
            <Settings size={14} />
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              style={{
                width: "30px", height: "30px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isStory ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isStory ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isStory ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"; }}
            >
              <LogOut size={14} />
            </button>
          </form>
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
          onClick={() => setDrawerOpen(false)}
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
          background: "#0d1109",
          borderRight: "1.5px solid #3a3010",
          boxShadow: "8px 0 40px rgba(0,0,0,0.95), inset -1px 0 0 rgba(255,180,30,0.04)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Drawer header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 16px 12px",
            borderBottom: "1px solid #1a1608",
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "9px", letterSpacing: "0.3em",
              color: "#4a3a12", textTransform: "uppercase",
            }}>
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#7a6a2e", padding: "4px",
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
              active={p.id === currentProjectId}
              onClick={() => { setDrawerOpen(false); handleSelectProject(p); }}
            >
              {p.name}
            </LedItem>
          ))}
          <LedItem muted onClick={() => { router.push("/projects/new"); setDrawerOpen(false); }}>
            + New Project
          </LedItem>

          {/* Divider */}
          <div style={{ height: "1px", background: "#1a1608", margin: "6px 0" }} />

          {/* Chapter section */}
          <LedMenuHeader>Select Chapter</LedMenuHeader>
          {currentProject?.chapters.map((ch, i) => (
            <LedItem
              key={ch.id}
              active={ch.id === (currentChapterId ?? navChapterId)}
              onClick={() => { setDrawerOpen(false); handleSelectChapter(ch); }}
            >
              Ch {i + 1} — {ch.name}
            </LedItem>
          ))}
          {onPlanChapters && (
            <LedItem muted onClick={() => { onPlanChapters?.(); setDrawerOpen(false); }}>
              + Plan new chapters
            </LedItem>
          )}
        </div>
      </div>
    </>
  );
}
