"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Check, ChevronRight, LoaderCircle, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { CassProgressBar } from "@/components/cass/CassProgressBar";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassFab } from "@/components/cass/CassFab";
import { createPlannedChaptersAction } from "@/lib/actions/project-actions";
import { renderParagraphs } from "@/lib/render-paragraphs";
import { useTheme } from "@/lib/theme-context";
import { TapeButton } from "@/components/ui/tape-button";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chapterStatus(chapter: Chapter): "completed" | "working_on_it" | "planned" {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

// ── Chat history types ───────────────────────────────────────────────────────

type ChatThread = {
  id: string;
  label: string;
  completedAt: string;
  messages: Array<{ role: string; content: string }>;
};

/** Pull the human-readable reply out of a message.
 *  Older kickoff/retro flows may have stored raw JSON; newer tool-use flows
 *  store the extracted `reply` string directly. */
function extractContent(msg: { role: string; content: string }): string {
  if (msg.role === "assistant") {
    const trimmed = msg.content.trimStart();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof parsed.reply === "string") return parsed.reply;
      } catch { /* fall through */ }
    }
  }
  return msg.content;
}

// ── Chat history drawer (read-only) ─────────────────────────────────────────

function ChatHistoryDrawer({
  thread,
  onClose,
}: {
  thread: ChatThread | null;
  onClose: () => void;
}) {
  const open = Boolean(thread);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever a thread opens
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, thread?.id]);

  const completedDate = thread
    ? new Date(thread.completedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: open ? "auto" : "none" }}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)",
          transition: "opacity 0.3s", opacity: open ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(480px, 100vw)",
          display: "flex", flexDirection: "column",
          background: "#0d0c09",
          borderLeft: "1px solid rgba(200,168,107,0.12)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(200,168,107,0.08)",
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: "12px",
        }}>
          <div>
            <p style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "11px", letterSpacing: "3px",
              color: "rgba(200,168,107,0.45)", textTransform: "uppercase", marginBottom: "5px",
            }}>
              Cass · Archived
            </p>
            <p style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "21px", color: "#d4cec4", lineHeight: 1.2,
            }}>
              {thread?.label ?? ""}
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "4px", background: "none", border: "none",
              cursor: "pointer", color: "rgba(200,168,107,0.5)", flexShrink: 0, marginTop: "2px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Completed banner */}
        <div style={{
          padding: "10px 20px",
          background: "rgba(74,222,128,0.05)",
          borderBottom: "1px solid rgba(74,222,128,0.1)",
        }}>
          <p style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "11px", letterSpacing: "0.8px",
            color: "rgba(74,222,128,0.75)", margin: 0,
          }}>
            ✓&nbsp; this conversation completed on {completedDate}
          </p>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {thread?.messages.map((msg, i) => {
            const content = extractContent(msg);
            if (!content.trim()) return null;
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  background: isUser ? "rgba(200,168,107,0.09)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isUser ? "rgba(200,168,107,0.14)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  padding: "10px 14px",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "12.5px", lineHeight: 1.65,
                  color: isUser ? "#c8a86b" : "rgba(232,224,208,0.88)",
                  whiteSpace: "pre-wrap",
                }}>
                  {content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Disabled input area */}
        <div style={{ padding: "14px 20px 28px", borderTop: "1px solid rgba(200,168,107,0.08)" }}>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(200,168,107,0.07)",
            borderRadius: "12px", padding: "14px 16px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "11px", letterSpacing: "1px",
              color: "rgba(200,168,107,0.28)", margin: 0,
            }}>
              this conversation has ended
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared drawer styles ──────────────────────────────────────────────────────

const CASSB_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 12px 2px",
  padding: "12px 16px",
  fontFamily: "'Special Elite', cursive",
  fontSize: "16px",
  lineHeight: "1.65",
  color: "#d4cec4",
} as const;

const USER_BUBBLE_STYLE = {
  background: "rgba(200,168,107,0.1)",
  border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 2px 12px",
  padding: "10px 16px",
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: "14px",
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
        await createPlannedChaptersAction({
          projectId: project.id,
          chapters: toCreate,
          conversation: planMessages,
        });
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

  const chronicleProgressPercent =
    mode === "done" ? 100 :
    mode === "proposal" ? 80 :
    mode === "planning" ? 50 :
    15;

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
        <CassProgressBar percent={chronicleProgressPercent} />

        {/* Header — consistent across all modes */}
        <div style={{ flexShrink: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 14px" }}>
          {/* Back button — only in planning/proposal */}
          {(mode === "planning" || mode === "proposal") && (
            <div style={{ position: "absolute", top: "14px", left: "16px" }}>
              <TapeButton variant="ghost" size="sm" onClick={() => setMode("menu")}>← back</TapeButton>
            </div>
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
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#d4cec4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
          >
            <X size={14} />
          </button>

          {/* Cass recorder */}
          <CassRecorder animState={isPending ? "playing" : "idle"} size="sm" />
          <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2.5px", color: "#c8a86b", textTransform: "uppercase", margin: "6px 0 0", opacity: 0.7 }}>
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
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#d4cec4", margin: 0, lineHeight: "1.3" }}>{label}</p>
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.4)", margin: "3px 0 0", lineHeight: "1.4" }}>{sub}</p>
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
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: 0 }}>
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
                    lineHeight: 1.6, color: "#d4cec4", outline: "none",
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
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: "0 0 4px" }}>
                      Chapter {project.chapters.length + i - [...removedIndices].filter((r) => r < i).length + 1}
                    </p>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "15px", color: "#d4cec4", margin: 0 }}>{ch.name}</p>
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
              <TapeButton variant="ghost" size="sm" onClick={() => setMode("planning")}>← back to chat</TapeButton>
              <TapeButton
                variant="primary"
                size="md"
                onClick={handleConfirm}
                disabled={isSaving || proposedChapters.filter((_, i) => !removedIndices.has(i)).length === 0}
              >
                {isSaving ? "Saving…" : `Add ${proposedChapters.filter((_, i) => !removedIndices.has(i)).length} chapter${proposedChapters.filter((_, i) => !removedIndices.has(i)).length !== 1 ? "s" : ""} to story`}
              </TapeButton>
            </div>
          </>
        )}

        {/* ── Done mode ── */}
        {mode === "done" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", gap: "24px" }}>
            <CassRecorder animState="idle" size="sm" />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "3px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", margin: "0 0 10px" }}>
                Chapters planned
              </p>
              <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "22px", color: "#d4cec4", margin: 0, lineHeight: 1.3 }}>
                {savedCount} {savedCount === 1 ? "chapter" : "chapters"} added to your story
              </p>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.4)", margin: "10px 0 0", lineHeight: 1.6 }}>
                Each one is ready to kick off whenever you are.
              </p>
            </div>
            <TapeButton variant="primary" size="md" onClick={onClose}>Done</TapeButton>
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
  onOpenThread,
}: {
  chapter: Chapter;
  index: number;
  projectId: string;
  isLast: boolean;
  onOpenThread: (t: ChatThread) => void;
}) {
  const status = chapterStatus(chapter);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware colors
  const bodyColor       = isDark ? "rgba(232,224,208,0.8)"   : "rgba(22,19,15,0.78)";
  const mutedColor      = isDark ? "rgba(200,168,107,0.4)"   : "rgba(0,0,0,0.38)";
  const faintColor      = isDark ? "rgba(200,168,107,0.3)"   : "rgba(0,0,0,0.25)";
  const inProgressColor = isDark ? "rgba(232,224,208,0.5)"   : "rgba(22,19,15,0.6)";
  const threadLabelColor= isDark ? "rgba(232,224,208,0.7)"   : "rgba(22,19,15,0.7)";
  const pulseColor      = isDark ? "#c8a86b"                 : "rgba(22,19,15,0.5)";
  const dividerGrad     = isDark
    ? "linear-gradient(90deg, transparent, rgba(200,168,107,0.18) 20%, rgba(200,168,107,0.18) 80%, transparent)"
    : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 80%, transparent)";
  const threadBg        = isDark ? "rgba(200,168,107,0.04)"  : "rgba(0,0,0,0.02)";
  const threadBorder    = isDark ? "rgba(200,168,107,0.1)"   : "rgba(0,0,0,0.07)";
  const threadHoverBg   = isDark ? "rgba(200,168,107,0.08)"  : "rgba(0,0,0,0.05)";
  const threadHoverBdr  = isDark ? "rgba(200,168,107,0.18)"  : "rgba(0,0,0,0.12)";
  const iconColor       = isDark ? "rgba(200,168,107,0.5)"   : "rgba(0,0,0,0.35)";
  const chevronColor    = isDark ? "rgba(200,168,107,0.35)"  : "rgba(0,0,0,0.25)";
  const dateColor       = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.35)";

  // Build the list of completed chat threads for this chapter
  const threads: ChatThread[] = [];
  if (chapter.kickoffConversation && chapter.kickoffCompletedAt) {
    threads.push({
      id: `kickoff-${chapter.id}`,
      label: "Chapter Kickoff",
      completedAt: chapter.kickoffCompletedAt,
      messages: chapter.kickoffConversation,
    });
  }
  chapter.boardConversations.forEach((conv, i) => {
    threads.push({
      id: `board-conv-${chapter.id}-${i}`,
      label: conv.label,
      completedAt: conv.completedAt,
      messages: conv.messages,
    });
  });
  if (chapter.retroConversation && chapter.retroCompletedAt) {
    threads.push({
      id: `retro-${chapter.id}`,
      label: "Chapter Retro",
      completedAt: chapter.retroCompletedAt,
      messages: chapter.retroConversation,
    });
  }

  return (
    <div id={`chapter-${chapter.id}`}>
      {/* Gold rule divider between chapters */}
      {index > 0 && (
        <div
          style={{
            height: "1px",
            background: dividerGrad,
            margin: "48px 0",
          }}
        />
      )}

      <div style={{ opacity: status === "planned" ? 0.4 : 1, transition: "opacity 0.2s" }}>
        {/* Chapter name — links to the chapter page */}
        <Link
          href={`/projects/${projectId}/chapters/${chapter.id}`}
          style={{ textDecoration: "none" }}
        >
          <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", margin: 0, lineHeight: 1.3 }}>
            <span style={{
              display: "inline-block",
              background: "#e8dfc0",
              color: "#1a0e00",
              padding: "3px 14px 5px",
              clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
            }}>
              {chapter.name}
            </span>
          </h2>
        </Link>

        {/* Completed: pull quote */}
        {status === "completed" && chapter.openingLine && (
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "20px", lineHeight: 1.3, margin: "14px 0 0" }}>
            <span style={{
              display: "inline-block",
              background: "#f5c84a",
              color: "#1a0e00",
              padding: "3px 14px 5px",
              clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
            }}>
              &ldquo;{chapter.openingLine}&rdquo;
            </span>
          </p>
        )}

        {/* Completed: full chapter story */}
        {status === "completed" && chapter.chapterStory && renderParagraphs(chapter.chapterStory, {
          fontFamily: "Verdana, Geneva, sans-serif",
          fontSize: "15px",
          color: bodyColor,
          lineHeight: 1.85,
          margin: "16px 0 0",
        })}

        {/* Completed: no story yet — show the bet */}
        {status === "completed" && !chapter.chapterStory && chapter.goal && (
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px",
              color: mutedColor,
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
                background: pulseColor,
                flexShrink: 0,
                marginTop: "5px",
                animation: "overviewPulse 2s ease-in-out infinite",
              }}
            />
            <p
              style={{
                fontFamily: "Verdana, Geneva, sans-serif",
                fontSize: "14px",
                color: inProgressColor,
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
              color: faintColor,
              lineHeight: 1.65,
              margin: "10px 0 0",
            }}
          >
            {chapter.goal}
          </p>
        )}

        {/* ── Chat history threads ── */}
        {threads.length > 0 && (
          <div style={{ marginTop: "36px" }}>
            <p style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "11px", letterSpacing: "3px",
              color: faintColor,
              textTransform: "uppercase", margin: "0 0 10px",
            }}>
              Conversations
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenThread(t)}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    background: threadBg,
                    border: `1px solid ${threadBorder}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer", width: "100%", textAlign: "left",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = threadHoverBg;
                    e.currentTarget.style.borderColor = threadHoverBdr;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = threadBg;
                    e.currentTarget.style.borderColor = threadBorder;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MessageCircle size={13} style={{ color: iconColor, flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "12px", color: threadLabelColor,
                    }}>
                      {t.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "11px", color: dateColor,
                    }}>
                      {new Date(t.completedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                    <ChevronRight size={12} style={{ color: chevronColor }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
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
  const [historyThread, setHistoryThread] = useState<ChatThread | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware colors for the overview page
  const mastheadLabelColor  = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.38)";
  const northStarColor      = isDark ? "#c8a86b"                 : "rgba(22,19,15,0.55)";
  const mastheadDivider     = isDark
    ? "linear-gradient(90deg, rgba(200,168,107,0.25), rgba(200,168,107,0.06) 70%, transparent)"
    : "linear-gradient(90deg, rgba(0,0,0,0.15), rgba(0,0,0,0.04) 70%, transparent)";
  const projThreadFaintColor= isDark ? "rgba(200,168,107,0.3)"   : "rgba(0,0,0,0.25)";
  const projThreadBg        = isDark ? "rgba(200,168,107,0.04)"  : "rgba(0,0,0,0.02)";
  const projThreadBorder    = isDark ? "rgba(200,168,107,0.1)"   : "rgba(0,0,0,0.07)";
  const projThreadHoverBg   = isDark ? "rgba(200,168,107,0.08)"  : "rgba(0,0,0,0.05)";
  const projThreadHoverBdr  = isDark ? "rgba(200,168,107,0.18)"  : "rgba(0,0,0,0.12)";
  const projIconColor       = isDark ? "rgba(200,168,107,0.5)"   : "rgba(0,0,0,0.35)";
  const projLabelColor      = isDark ? "rgba(232,224,208,0.7)"   : "rgba(22,19,15,0.7)";
  const projDateColor       = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.35)";
  const projChevronColor    = isDark ? "rgba(200,168,107,0.35)"  : "rgba(0,0,0,0.25)";
  const emptyStateColor     = isDark ? "rgba(232,224,208,0.3)"   : "rgba(22,19,15,0.28)";

  // Scroll to the selected chapter whenever lastChapterId changes
  useEffect(() => {
    if (!lastChapterId) return;
    // Small delay ensures the DOM is fully painted before scrolling
    const t = setTimeout(() => {
      const el = document.getElementById(`chapter-${lastChapterId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [lastChapterId]);

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
        activeNav="story"
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
                <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: "clamp(32px, 5vw, 46px)", margin: 0, lineHeight: 1.2 }}>
                  <span style={{
                    display: "inline-block",
                    background: "#f5c84a",
                    color: "#1a0e00",
                    padding: "4px 16px 6px",
                    clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                    boxShadow: "2px 3px 8px rgba(0,0,0,0.4)",
                  }}>
                    {project.name}
                  </span>
                </h1>

                {project.northStar && (
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: northStarColor,
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
                    background: mastheadDivider,
                    marginTop: "28px",
                  }}
                />
              </header>

              {/* ── Project-level conversations ── */}
              {(() => {
                const projectThreads: ChatThread[] = [];
                if (project.projectKickoffConversation && project.projectKickoffCompletedAt) {
                  projectThreads.push({
                    id: "project-kickoff",
                    label: "Project Setup",
                    completedAt: project.projectKickoffCompletedAt,
                    messages: project.projectKickoffConversation,
                  });
                }
                project.planningConversations.forEach((session, i) => {
                  projectThreads.push({
                    id: `planning-${i}`,
                    label: "Chapter Planning",
                    completedAt: session.completedAt,
                    messages: session.messages,
                  });
                });
                if (projectThreads.length === 0) return null;
                return (
                  <div style={{ marginBottom: "52px" }}>
                    <p style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "11px", letterSpacing: "3px",
                      color: projThreadFaintColor,
                      textTransform: "uppercase", margin: "0 0 10px",
                    }}>
                      Project Conversations
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {projectThreads.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setHistoryThread(t)}
                          style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between",
                            background: projThreadBg,
                            border: `1px solid ${projThreadBorder}`,
                            borderRadius: "10px",
                            padding: "10px 14px",
                            cursor: "pointer", width: "100%", textAlign: "left",
                            transition: "background 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = projThreadHoverBg;
                            e.currentTarget.style.borderColor = projThreadHoverBdr;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = projThreadBg;
                            e.currentTarget.style.borderColor = projThreadBorder;
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <MessageCircle size={13} style={{ color: projIconColor, flexShrink: 0 }} />
                            <span style={{
                              fontFamily: "'Share Tech Mono', monospace",
                              fontSize: "12px", color: projLabelColor,
                            }}>
                              {t.label}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{
                              fontFamily: "'Share Tech Mono', monospace",
                              fontSize: "11px", color: projDateColor,
                            }}>
                              {new Date(t.completedAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                            </span>
                            <ChevronRight size={12} style={{ color: projChevronColor }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
                      onOpenThread={setHistoryThread}
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
                      color: emptyStateColor,
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
          <CassFab
            onClick={() => setCassDrawerOpen(true)}
            hoverText="Plan your next chapter"
            teaserText="I can help you map out what comes next."
            expandedWidth="268px"
          />
        )}

      </ProjectShellFrame>

      {/* ── Chat history drawer ── */}
      <ChatHistoryDrawer
        thread={historyThread}
        onClose={() => setHistoryThread(null)}
      />

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
