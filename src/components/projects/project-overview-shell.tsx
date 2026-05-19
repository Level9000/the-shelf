"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassFab } from "@/components/cass/CassFab";
import { createPlannedChaptersAction } from "@/lib/actions/project-actions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chapterStatus(chapter: Chapter): "completed" | "working_on_it" | "planned" {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

// ── Shared drawer styles ──────────────────────────────────────────────────────

const CASSB_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 12px 2px",
  padding: "12px 16px",
  fontFamily: "'Special Elite', cursive",
  fontSize: "15px",
  lineHeight: "1.65",
  color: "#e8e0d0",
} as const;

const USER_BUBBLE_STYLE = {
  background: "rgba(200,168,107,0.1)",
  border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 2px 12px",
  padding: "10px 16px",
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#c8a86b",
  maxWidth: "80%",
} as const;

function CassDot() {
  return (
    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
  );
}

// ── Cass Chronicle drawer ─────────────────────────────────────────────────────

type DrawerMode = "menu" | "planning" | "proposal" | "done";
type PlanMessage = { role: "user" | "assistant"; content: string };

const CHRONICLE_QUESTION = "What do you want to do?";

function buildPlanOpening(project: ProjectWithChapters): string {
  const active = project.chapters.find((ch) => ch.kickoffCompletedAt && !ch.retroCompletedAt);
  if (project.chapters.length > 0) {
    return `${active ? `You're currently working on "${active.name}". ` : ""}What are you hoping to tackle next? Tell me what's on your mind and we'll shape it into chapters together.`;
  }
  return `Let's plan out your first chapter${project.northStar ? ` for "${project.northStar}"` : ""}. What's the first big bet you want to make?`;
}

function CassChronicleDrawer({
  open,
  startInPlanMode = false,
  project,
  onClose,
  onRefine,
}: {
  open: boolean;
  startInPlanMode?: boolean;
  project: ProjectWithChapters;
  onClose: () => void;
  onRefine: () => void;
}) {
  const router = useRouter();
  const lastCompletedChapter = [...project.chapters].reverse().find((c) => c.retroCompletedAt);

  // ── Menu state ──
  const [menuDisplayed, setMenuDisplayed] = useState("");
  const [optionsReady, setOptionsReady] = useState(false);
  const [menuSelected, setMenuSelected] = useState<string | null>(null);

  // ── Mode ──
  const [mode, setMode] = useState<DrawerMode>("menu");

  // ── Planning state ──
  const [planMessages, setPlanMessages] = useState<PlanMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [planError, setPlanError] = useState<string | null>(null);
  const [liveChapters, setLiveChapters] = useState<{ name: string; goal: string }[]>([]);
  const [proposedChapters, setProposedChapters] = useState<{ name: string; goal: string }[]>([]);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const startInPlanModeRef = useRef(startInPlanMode);
  useEffect(() => { startInPlanModeRef.current = startInPlanMode; }, [startInPlanMode]);

  // Scroll to bottom when messages update
  useEffect(() => {
    queueMicrotask(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [planMessages, isPending]);

  function enterPlanningMode() {
    const opening = buildPlanOpening(project);
    setPlanMessages([{ role: "assistant", content: opening }]);
    setDraft("");
    setPlanError(null);
    setLiveChapters([]);
    setProposedChapters([]);
    setRemovedIndices(new Set());
    setSavedCount(0);
    setMode("planning");
  }

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setMenuDisplayed("");
    setOptionsReady(false);
    setMenuSelected(null);
    setMode("menu");
    setPlanMessages([]);
    setDraft("");
    setPlanError(null);
    setLiveChapters([]);

    if (startInPlanModeRef.current) {
      // Skip menu, go straight to planning
      const opening = buildPlanOpening(project);
      setPlanMessages([{ role: "assistant", content: opening }]);
      setMode("planning");
      return;
    }

    // Typewrite the menu question
    let i = 0;
    const id = setInterval(() => {
      i++;
      setMenuDisplayed(CHRONICLE_QUESTION.slice(0, i));
      if (i >= CHRONICLE_QUESTION.length) {
        clearInterval(id);
        setTimeout(() => setOptionsReady(true), 200);
      }
    }, 26);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isPending) return;
    const next: PlanMessage[] = [...planMessages, { role: "user", content }];
    setPlanMessages(next);
    setDraft("");
    setPlanError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/plan-chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, messages: next }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Planning failed.");
        const reply = payload.reply?.trim();
        if (!reply) throw new Error("Empty response.");
        setPlanMessages((m) => [...m, { role: "assistant", content: reply }]);
        setLiveChapters(payload.chapters ?? []);
        if (payload.done && payload.chapters?.length > 0) {
          setProposedChapters(payload.chapters);
          setMode("proposal");
        }
      } catch (err) {
        setPlanError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleConfirm() {
    const toCreate = proposedChapters.filter((_, i) => !removedIndices.has(i));
    if (!toCreate.length) return;
    startSaveTransition(async () => {
      try {
        await createPlannedChaptersAction({ projectId: project.id, chapters: toCreate });
        setSavedCount(toCreate.length);
        setMode("done");
        router.refresh();
      } catch (err) {
        setPlanError(err instanceof Error ? err.message : "Failed to save chapters.");
      }
    });
  }

  const menuOptions = [
    {
      key: "plan",
      label: "Plan chapters",
      sub: "Map out what's coming next",
      disabled: false,
      onSelect: () => {
        setMenuSelected("plan");
        setTimeout(() => enterPlanningMode(), 380);
      },
    },
    {
      key: "craft",
      label: "Craft your story",
      sub: lastCompletedChapter ? "Turn a completed chapter into content to share" : "Complete a chapter first",
      disabled: !lastCompletedChapter,
      onSelect: lastCompletedChapter
        ? () => {
            setMenuSelected("craft");
            setTimeout(() => { onClose(); router.push(`/projects/${project.id}/chapters/${lastCompletedChapter.id}`); }, 380);
          }
        : null,
    },
    {
      key: "refine",
      label: "Refine the vision",
      sub: "Sharpen your north star and narrative arc",
      disabled: false,
      onSelect: () => {
        setMenuSelected("refine");
        setTimeout(() => { onClose(); onRefine(); }, 380);
      },
    },
  ];

  return (
    <>
      <style>{`
        @keyframes cassCaretBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0; } }
        @keyframes cassOptionIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: "rgba(0,0,0,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.3s ease" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[30%] lg:min-w-[360px]"
        style={{
          background: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%), #0a0a0a",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
        }}
        aria-hidden={!open}
      >
        {/* Header — consistent across all modes */}
        <div style={{ flexShrink: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 14px" }}>
          {/* Back button — only in planning/proposal */}
          {(mode === "planning" || mode === "proposal") && (
            <button
              type="button"
              onClick={() => setMode("menu")}
              aria-label="Back"
              style={{
                position: "absolute", top: "14px", left: "16px",
                height: "32px", padding: "0 12px",
                display: "flex", alignItems: "center", gap: "6px",
                borderRadius: "999px", background: "rgba(255,255,255,0.06)",
                color: "#888", border: "none", cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace", fontSize: "10px",
                letterSpacing: "0.5px",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e8e0d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
            >
              ← back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: "14px", right: "16px",
              width: "32px", height: "32px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "50%", background: "rgba(255,255,255,0.06)",
              color: "#888", border: "none", cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
          >
            <X size={14} />
          </button>

          {/* Cass circle */}
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", position: "relative", background: "#1a1a1a", boxShadow: "0 0 0 1.5px rgba(200,168,107,0.35), 0 4px 20px rgba(0,0,0,0.5)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: "scale(0.5333) translateY(-6.5px)" }}>
              <CassRecorder animState={isPending ? "playing" : "idle"} size="sm" />
            </div>
          </div>
          <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", letterSpacing: "2.5px", color: "#c8a86b", textTransform: "uppercase", margin: "6px 0 0", opacity: 0.7 }}>
            Cass
          </p>
        </div>

        <div style={{ height: "1px", background: "rgba(200,168,107,0.08)", flexShrink: 0 }} />

        {/* ── Menu mode ── */}
        {mode === "menu" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Cass question bubble */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <CassDot />
              <div style={CASSB_STYLE}>
                {menuDisplayed}
                {menuDisplayed.length > 0 && menuDisplayed.length < CHRONICLE_QUESTION.length && (
                  <span style={{ opacity: 0.5, animation: "cassCaretBlink 0.9s step-end infinite" }}>▌</span>
                )}
              </div>
            </div>
            {/* Options */}
            {optionsReady && !menuSelected && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
                {menuOptions.map(({ key, label, sub, disabled, onSelect }, i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onSelect ?? undefined}
                    disabled={disabled}
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)",
                      borderRadius: "12px", padding: "13px 16px",
                      display: "flex", alignItems: "center", gap: "14px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      textAlign: "left", width: "100%",
                      transition: "border-color 0.15s, background 0.15s",
                      opacity: disabled ? 0.35 : 1,
                      animation: "cassOptionIn 0.28s ease forwards",
                      animationDelay: `${i * 110}ms`,
                    }}
                    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                    <div>
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: "1.3" }}>{label}</p>
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", color: "rgba(200,168,107,0.4)", margin: "3px 0 0", lineHeight: "1.4" }}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Selected echo */}
            {menuSelected && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={USER_BUBBLE_STYLE}>{menuOptions.find((o) => o.key === menuSelected)?.label}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Planning mode ── */}
        {mode === "planning" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {planMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "10px" }}>
                  {msg.role === "assistant" && <CassDot />}
                  <div style={msg.role === "assistant" ? { ...CASSB_STYLE, maxWidth: "92%" } : USER_BUBBLE_STYLE}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isPending && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                  <CassDot />
                  <div style={{ ...CASSB_STYLE, display: "flex", gap: "5px", alignItems: "center" }}>
                    {[0, 1, 2].map((d) => (
                      <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c8a86b", opacity: 0.4, animation: `cassCaretBlink 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              {planError && (
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{planError}</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Live chapter tally — subtle, shown when chapters are forming */}
            {liveChapters.length > 0 && (
              <div style={{ flexShrink: 0, padding: "6px 20px", borderTop: "1px solid rgba(200,168,107,0.08)" }}>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: 0 }}>
                  {liveChapters.length} chapter{liveChapters.length !== 1 ? "s" : ""} taking shape…
                </p>
              </div>
            )}

            {/* Input */}
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Tell me what you want to work on next…"
                  rows={2}
                  disabled={isPending}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(200,168,107,0.2)", borderRadius: "12px",
                    padding: "10px 14px", resize: "none",
                    fontFamily: "'Special Elite', cursive", fontSize: "14px",
                    lineHeight: 1.6, color: "#e8e0d0", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || isPending}
                  style={{
                    width: "40px", height: "40px", flexShrink: 0,
                    borderRadius: "50%", border: "none", cursor: draft.trim() && !isPending ? "pointer" : "not-allowed",
                    background: draft.trim() && !isPending ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  {isPending
                    ? <LoaderCircle size={16} style={{ color: "#c8a86b", animation: "spin 1s linear infinite" }} />
                    : <ArrowUp size={16} style={{ color: draft.trim() ? "#0a0a0a" : "#555" }} />
                  }
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Proposal mode ── */}
        {mode === "proposal" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Cass intro */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%", marginBottom: "6px" }}>
                <CassDot />
                <div style={CASSB_STYLE}>
                  Here&apos;s what I put together. Remove any you don&apos;t need — you can always plan more later.
                </div>
              </div>
              {/* Chapter cards */}
              {proposedChapters.map((ch, i) =>
                removedIndices.has(i) ? null : (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(200,168,107,0.2)",
                      borderRadius: "14px", padding: "14px 16px",
                      position: "relative",
                    }}
                  >
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: "0 0 4px" }}>
                      Chapter {project.chapters.length + i - [...removedIndices].filter((r) => r < i).length + 1}
                    </p>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "15px", color: "#e8e0d0", margin: 0 }}>{ch.name}</p>
                    {ch.goal && (
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>{ch.goal}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemovedIndices((prev) => new Set([...prev, i]))}
                      aria-label="Remove"
                      style={{
                        position: "absolute", top: "10px", right: "10px",
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: "transparent", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "rgba(200,168,107,0.3)", transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(200,168,107,0.3)"; }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              )}
              {planError && (
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{planError}</p>
              )}
            </div>

            {/* Confirm bar */}
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setMode("planning")}
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#c8a86b"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.45)"; }}
              >
                ← back to chat
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving || proposedChapters.filter((_, i) => !removedIndices.has(i)).length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 20px", borderRadius: "999px",
                  background: "linear-gradient(135deg, #c8a86b, #a8864e)",
                  border: "none", cursor: isSaving ? "not-allowed" : "pointer",
                  fontFamily: "'Share Tech Mono', monospace", fontSize: "11px",
                  fontWeight: 600, color: "#0a0a0a",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving
                  ? <><LoaderCircle size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                  : <><Check size={12} /> Add {proposedChapters.filter((_, i) => !removedIndices.has(i)).length} chapter{proposedChapters.filter((_, i) => !removedIndices.has(i)).length !== 1 ? "s" : ""} to story</>
                }
              </button>
            </div>
          </>
        )}

        {/* ── Done mode ── */}
        {mode === "done" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", gap: "24px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", position: "relative", background: "#1a1a1a", boxShadow: "0 0 0 1.5px rgba(200,168,107,0.45)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: "scale(0.5333) translateY(-6.5px)" }}>
                <CassRecorder animState="idle" size="sm" />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", letterSpacing: "3px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", margin: "0 0 10px" }}>
                Chapters planned
              </p>
              <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "22px", color: "#e8e0d0", margin: 0, lineHeight: 1.3 }}>
                {savedCount} {savedCount === 1 ? "chapter" : "chapters"} added to your story
              </p>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.4)", margin: "10px 0 0", lineHeight: 1.6 }}>
                Each one is ready to kick off whenever you are.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "11px 28px", borderRadius: "999px",
                background: "linear-gradient(135deg, #c8a86b, #a8864e)",
                border: "none", cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace", fontSize: "12px",
                fontWeight: 600, color: "#0a0a0a",
              }}
            >
              Done
            </button>
          </div>
        )}

        <style>{`
          @keyframes cassCaretBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0; } }
          @keyframes cassOptionIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}

// ── Chapter entry ─────────────────────────────────────────────────────────────

function ChapterEntry({
  chapter,
  index,
  projectId,
  isLast,
}: {
  chapter: Chapter;
  index: number;
  projectId: string;
  isLast: boolean;
}) {
  const status = chapterStatus(chapter);

  return (
    <div>
      {/* Gold rule divider between chapters */}
      {index > 0 && (
        <div
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(200,168,107,0.18) 20%, rgba(200,168,107,0.18) 80%, transparent)",
            margin: "48px 0",
          }}
        />
      )}

      <div style={{ opacity: status === "planned" ? 0.4 : 1, transition: "opacity 0.2s" }}>
        {/* Chapter label */}
        <p
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "9px",
            letterSpacing: "3.5px",
            color: status === "completed" ? "rgba(200,168,107,0.55)" : "rgba(200,168,107,0.3)",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Chapter {index + 1}
          {status === "working_on_it" && (
            <span style={{ marginLeft: "10px", color: "rgba(200,168,107,0.5)" }}>· in progress</span>
          )}
          {status === "planned" && (
            <span style={{ marginLeft: "10px", color: "rgba(200,168,107,0.3)" }}>· coming up</span>
          )}
        </p>

        {/* Chapter name — links to the chapter page */}
        <Link
          href={`/projects/${projectId}/chapters/${chapter.id}`}
          style={{ textDecoration: "none" }}
        >
          <h2
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "22px",
              color: status === "completed" ? "#e8e0d0" : "rgba(232,224,208,0.6)",
              margin: 0,
              lineHeight: 1.3,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { if (status !== "planned") (e.target as HTMLElement).style.color = "#c8a86b"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = status === "completed" ? "#e8e0d0" : "rgba(232,224,208,0.6)"; }}
          >
            {chapter.name}
          </h2>
        </Link>

        {/* Completed: pull quote */}
        {status === "completed" && chapter.openingLine && (
          <p
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "17px",
              fontStyle: "italic",
              color: "#c8a86b",
              lineHeight: 1.75,
              margin: "14px 0 0",
              paddingLeft: "16px",
              borderLeft: "2px solid rgba(200,168,107,0.3)",
            }}
          >
            &ldquo;{chapter.openingLine}&rdquo;
          </p>
        )}

        {/* Completed: full chapter story */}
        {status === "completed" && chapter.chapterStory && (
          <p
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "15px",
              color: "rgba(232,224,208,0.8)",
              lineHeight: 1.85,
              margin: "16px 0 0",
            }}
          >
            {chapter.chapterStory}
          </p>
        )}

        {/* Completed: no story yet — show the bet */}
        {status === "completed" && !chapter.chapterStory && chapter.goal && (
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px",
              color: "rgba(200,168,107,0.4)",
              lineHeight: 1.7,
              margin: "12px 0 0",
              fontStyle: "italic",
            }}
          >
            {chapter.goal}
          </p>
        )}

        {/* In progress: pulsing indicator + goal */}
        {status === "working_on_it" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "14px" }}>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#c8a86b",
                flexShrink: 0,
                marginTop: "5px",
                animation: "overviewPulse 2s ease-in-out infinite",
              }}
            />
            <p
              style={{
                fontFamily: "'Special Elite', cursive",
                fontSize: "14px",
                color: "rgba(232,224,208,0.5)",
                lineHeight: 1.7,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {chapter.goal || "This chapter is being written…"}
            </p>
          </div>
        )}

        {/* Planned: goal if set, otherwise placeholder */}
        {status === "planned" && chapter.goal && (
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px",
              color: "rgba(200,168,107,0.3)",
              lineHeight: 1.65,
              margin: "10px 0 0",
            }}
          >
            {chapter.goal}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function ProjectOverviewShell({
  project,
  projects,
  profile,
  currentUser,
  projectMembers,
  lastChapterId,
  initialPlanning = false,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
  lastChapterId?: string | null;
  initialPlanning?: boolean;
}) {
  const [refining, setRefining] = useState(false);
  const [cassDrawerOpen, setCassDrawerOpen] = useState(initialPlanning);
  const [startInPlanMode, setStartInPlanMode] = useState(initialPlanning);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function openDrawerForPlanning() {
    setStartInPlanMode(true);
    setCassDrawerOpen(true);
  }

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={project.id}
        lastChapterId={lastChapterId}
        activeNav="overview"
        mobileEyebrow="Overview"
        mobileTitle={project.name}
        onPlanChapters={openDrawerForPlanning}
      >
        {refining ? (
          <div style={{ background: "var(--background, #faf9f7)", flex: 1 }}>
            <ProjectArcRefiner project={project} onClose={() => setRefining(false)} />
          </div>
        ) : (
          /* ── The Story So Far ── */
          <div
            className="-mx-4 flex-1 lg:mx-0"
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(200,168,107,0.04) 0%, transparent 65%)",
              paddingBottom: "120px",
            }}
          >
            <style>{`
              @keyframes overviewPulse {
                0%, 100% { opacity: 0.4; transform: scale(0.85); }
                50% { opacity: 1; transform: scale(1.15); }
              }
            `}</style>

            {/* Reading column */}
            <div
              style={{
                maxWidth: "660px",
                margin: "0 auto",
                padding: "48px 28px 0",
              }}
            >

              {/* ── Masthead ── */}
              <header style={{ marginBottom: "52px" }}>
                <p
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "3.5px",
                    color: "rgba(200,168,107,0.45)",
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}
                >
                  The Story So Far
                </p>
                <h1
                  style={{
                    fontFamily: "'Special Elite', cursive",
                    fontSize: "clamp(28px, 5vw, 40px)",
                    color: "#e8e0d0",
                    margin: 0,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {project.name}
                </h1>

                {project.northStar && (
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "#c8a86b",
                      margin: "14px 0 0",
                      lineHeight: 1.65,
                      opacity: 0.85,
                    }}
                  >
                    &ldquo;{project.northStar}&rdquo;
                  </p>
                )}

                {/* Thin rule under masthead */}
                <div
                  style={{
                    height: "1px",
                    background: "linear-gradient(90deg, rgba(200,168,107,0.25), rgba(200,168,107,0.06) 70%, transparent)",
                    marginTop: "28px",
                  }}
                />
              </header>

              {/* ── Chapter list ── */}
              {project.chapters.length > 0 ? (
                <div>
                  {project.chapters.map((chapter, i) => (
                    <ChapterEntry
                      key={chapter.id}
                      chapter={chapter}
                      index={i}
                      projectId={project.id}
                      isLast={i === project.chapters.length - 1}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "rgba(232,224,208,0.3)",
                      lineHeight: 1.7,
                    }}
                  >
                    The first chapter hasn&apos;t started yet.
                    <br />
                    Use the button below to plan it.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── FAB — Cass circle avatar ── */}
        {!refining && (
          <CassFab onClick={() => setCassDrawerOpen(true)} hoverText="Plan your next chapter" expandedWidth="268px" />
        )}

      </ProjectShellFrame>

      {/* ── Cass Chronicle drawer ── */}
      <CassChronicleDrawer
        open={cassDrawerOpen}
        startInPlanMode={startInPlanMode}
        project={project}
        onClose={() => { setCassDrawerOpen(false); setStartInPlanMode(false); }}
        onRefine={() => setRefining(true)}
      />

      <ProjectOverviewSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        project={project}
        currentUser={currentUser}
        members={projectMembers}
      />
    </>
  );
}
