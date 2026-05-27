"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Board, BoardSnapshot, Project, ProjectWithChapters, UserProfile } from "@/types";
import { ArrowLeft, ArrowUp, Check, LoaderCircle, X } from "lucide-react";
import { ChapterOverviewPanel } from "@/components/board/chapter-overview-panel";
import { EndChapterModal } from "@/components/board/end-chapter-modal";
import { StoryHub } from "@/components/board/story-hub";
import { CassChapterKickoff } from "@/components/cass/CassChapterKickoff";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassProgressBar } from "@/components/cass/CassProgressBar";
import { CassRetroChat } from "@/components/cass/CassRetroChat";
import { CassStoryPlayer } from "@/components/cass/CassStoryPlayer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { updateBoardOverviewFieldAction } from "@/lib/actions/project-actions";
import type { ProjectOverviewSection } from "@/lib/ai/schema";

// ── Cass Refine Drawer ────────────────────────────────────────────────────────

const REFINE_SECTIONS = [
  { key: "goal" as const,             nav: "What",  shortTitle: "The bet",    title: "What's the bet?",                prompt: "Let's sharpen the bet. What's the core hypothesis this chapter is acting on?" },
  { key: "whyItMatters" as const,     nav: "Why",   shortTitle: "Why now",    title: "Why does this matter right now?", prompt: "What's the urgency here? Why is this the right chapter to run at this moment?" },
  { key: "successLooksLike" as const, nav: "How",   shortTitle: "Conditions", title: "What has to be true?",            prompt: "What are the specific conditions that need to hold for this chapter to work?" },
  { key: "doneDefinition" as const,   nav: "When",  shortTitle: "Proof",      title: "What will we have to show?",      prompt: "What tangible thing will exist at the end? This is the proof point the retro will hold you to." },
];

const REFINE_QUESTION = "Which section would you like to refine?";

type RefineMsg = { role: "user" | "assistant"; content: string };
type RefineMode = "menu" | "chat";

function CassRefineDrawer({
  open,
  project,
  board,
  onClose,
}: {
  open: boolean;
  project: Project;
  board: Board;
  onClose: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Menu state ──
  const [mode, setMode] = useState<RefineMode>("menu");
  const [menuDisplayed, setMenuDisplayed] = useState("");
  const [optionsReady, setOptionsReady] = useState(false);
  const [menuSelected, setMenuSelected] = useState<string | null>(null);

  // ── Chat state ──
  const initialApproved = useMemo(
    () => Object.fromEntries(REFINE_SECTIONS.map((s) => [s.key, board[s.key] ?? ""])) as Record<ProjectOverviewSection, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [approvedSections, setApprovedSections] = useState(initialApproved);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<RefineMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();

  const currentSection = REFINE_SECTIONS[currentIndex] ?? REFINE_SECTIONS[0];
  const completedCount = REFINE_SECTIONS.filter((s) => approvedSections[s.key]?.trim()).length;
  const progressPercent = completedCount === 4 ? 100 : mode === "chat" ? Math.round(25 + completedCount * 20) : Math.round(15 + completedCount * 18);

  // Reset to menu + typewrite on each open
  useEffect(() => {
    if (!open) return;
    setMode("menu");
    setMenuDisplayed("");
    setOptionsReady(false);
    setMenuSelected(null);
    setMessages([]);
    setDraft("");
    setError(null);
    setApprovalOpen(false);

    let i = 0;
    const id = setInterval(() => {
      i++;
      setMenuDisplayed(REFINE_QUESTION.slice(0, i));
      if (i >= REFINE_QUESTION.length) {
        clearInterval(id);
        setTimeout(() => setOptionsReady(true), 200);
      }
    }, 26);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [messages, approvalOpen]);

  function selectSection(idx: number) {
    const section = REFINE_SECTIONS[idx];
    if (!section) return;
    setMenuSelected(section.nav);
    setCurrentIndex(idx);
    setTimeout(() => {
      setMessages([{ role: "assistant", content: section.prompt }]);
      setMode("chat");
    }, 380);
  }

  async function requestReply(nextMsgs: RefineMsg[]) {
    const res = await fetch("/api/chapter-overview/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, boardId: board.id, currentSection: currentSection.key, messages: nextMsgs }),
    });
    const payload = await res.json() as { reply?: string; readyForApproval?: boolean; draftValue?: string; error?: string };
    if (!res.ok) throw new Error(payload.error ?? "Refinement failed.");
    const reply = payload.reply?.trim();
    if (!reply) throw new Error("Empty response.");
    setMessages((m) => [...m, { role: "assistant", content: reply }]);
    if (payload.readyForApproval && payload.draftValue?.trim()) {
      setApprovalDraft(payload.draftValue.trim());
      setApprovalOpen(true);
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || isApproving) return;
    const next: RefineMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setError(null);
    startTransition(async () => {
      try { await requestReply(next); }
      catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    });
  }

  function handleApprove() {
    if (!approvalDraft.trim()) return;
    startApproveTransition(async () => {
      try {
        await updateBoardOverviewFieldAction({ projectId: project.id, boardId: board.id, field: currentSection.key, value: approvalDraft });
        const updated = { ...approvedSections, [currentSection.key]: approvalDraft };
        setApprovedSections(updated);
        setApprovalOpen(false);
        const nextSection = REFINE_SECTIONS.find((s) => s.key !== currentSection.key && !updated[s.key]?.trim()) ?? null;
        setMessages((m) => [...m, {
          role: "assistant",
          content: nextSection
            ? `Locked in. Let's move on to ${nextSection.title.toLowerCase()}. ${nextSection.prompt}`
            : "That's everything aligned. Every section is complete and this chapter clearly ladders up to your broader story.",
        }]);
        if (nextSection) setCurrentIndex(REFINE_SECTIONS.findIndex((s) => s.key === nextSection.key));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  const CASSB: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,168,107,0.22)",
    borderRadius: "12px 12px 12px 2px", padding: "12px 16px",
    fontFamily: "'Special Elite', cursive", fontSize: "16px",
    lineHeight: "1.7", color: "#d4cec4", maxWidth: "92%",
  };
  const USER_B: React.CSSProperties = {
    background: "rgba(200,168,107,0.1)", border: "1px solid rgba(200,168,107,0.22)",
    borderRadius: "12px 12px 2px 12px", padding: "10px 16px",
    fontFamily: "'Share Tech Mono', monospace", fontSize: "14px",
    lineHeight: "1.5", color: "#c8a86b", maxWidth: "80%",
  };

  return (
    <>
      <style>{`
        @keyframes refineCaretBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0; } }
        @keyframes refineSpin { to { transform: rotate(360deg); } }
        @keyframes refineOptionIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: "rgba(0,0,0,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.3s ease" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[38%] lg:min-w-[400px]"
        style={{
          background: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%), #0a0a0a",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
        }}
        aria-hidden={!open}
      >
        <CassProgressBar percent={progressPercent} />

        {/* Header */}
        <div style={{ flexShrink: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 14px" }}>
          {/* Back to menu — only in chat mode */}
          {mode === "chat" && (
            <button
              type="button"
              onClick={() => setMode("menu")}
              style={{ position: "absolute", top: "14px", left: "16px", height: "32px", padding: "0 12px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#888", border: "none", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "0.5px", transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#d4cec4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
            >
              ← back
            </button>
          )}
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: "14px", right: "16px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(255,255,255,0.06)", color: "#888", border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#d4cec4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
          >
            <X size={14} />
          </button>

          {/* Full Cass recorder */}
          <CassRecorder animState={isPending ? "playing" : "idle"} size="sm" />

          {/* Progress dots — only in chat mode */}
          {mode === "chat" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              {REFINE_SECTIONS.map((s, i) => {
                const done = Boolean(approvedSections[s.key]?.trim());
                const current = i === currentIndex && !done;
                return (
                  <div key={s.key} title={s.title} style={{ width: current ? "20px" : "7px", height: "7px", borderRadius: "999px", background: done ? "#c8a86b" : current ? "rgba(200,168,107,0.5)" : "rgba(255,255,255,0.12)", transition: "all 0.3s ease" }} />
                );
              })}
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.4)", margin: "0 0 0 4px", letterSpacing: "1px" }}>{completedCount}/4</p>
            </div>
          )}
        </div>

        <div style={{ height: "1px", background: "rgba(200,168,107,0.08)", flexShrink: 0 }} />

        {/* ── Menu mode ── */}
        {mode === "menu" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Cass question bubble */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
              <div style={CASSB}>
                {menuDisplayed}
                {menuDisplayed.length > 0 && menuDisplayed.length < REFINE_QUESTION.length && (
                  <span style={{ opacity: 0.5, animation: "refineCaretBlink 0.9s step-end infinite" }}>▌</span>
                )}
              </div>
            </div>

            {/* Section chips */}
            {optionsReady && !menuSelected && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
                {REFINE_SECTIONS.map((s, i) => {
                  const filled = Boolean(board[s.key]?.trim());
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => selectSection(i)}
                      style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)",
                        borderRadius: "12px", padding: "13px 16px",
                        display: "flex", alignItems: "center", gap: "14px",
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "border-color 0.15s, background 0.15s",
                        animation: "refineOptionIn 0.28s ease forwards",
                        animationDelay: `${i * 110}ms`,
                        opacity: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    >
                      {/* Radio circle */}
                      <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#d4cec4", margin: 0, lineHeight: "1.3" }}>
                            {s.nav} — {s.title}
                          </p>
                        </div>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", color: "rgba(200,168,107,0.4)", margin: "3px 0 0", lineHeight: "1.4" }}>
                          {filled ? "Already filled in — refine the language" : "Not set yet"}
                        </p>
                      </div>
                      {/* Status dot */}
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: filled ? "#c8a86b" : "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected echo */}
            {menuSelected && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={USER_B}>{menuSelected}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Chat mode ── */}
        {mode === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "10px" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                  )}
                  <div style={msg.role === "assistant" ? CASSB : USER_B}>{msg.content}</div>
                </div>
              ))}

              {isPending && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                  <div style={{ ...CASSB, display: "flex", gap: "5px", alignItems: "center" }}>
                    {[0, 1, 2].map((d) => (
                      <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c8a86b", opacity: 0.4, animation: `refineCaretBlink 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Inline approval card */}
              {approvalOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                  <div style={{ background: "rgba(200,168,107,0.06)", border: "1px solid rgba(200,168,107,0.25)", borderRadius: "14px", padding: "14px 16px" }}>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", margin: "0 0 8px" }}>
                      Draft — {currentSection.shortTitle}
                    </p>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "14px", lineHeight: 1.75, color: "#d4cec4", margin: 0 }}>{approvalDraft}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button" onClick={() => setApprovalOpen(false)} disabled={isApproving}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#d4cec4"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#888"; }}
                    >Keep refining</button>
                    <button
                      type="button" onClick={handleApprove} disabled={isApproving}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 14px", borderRadius: "999px", background: "linear-gradient(135deg, #c8a86b, #a8864e)", border: "none", cursor: isApproving ? "not-allowed" : "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", fontWeight: 600, color: "#0a0a0a", opacity: isApproving ? 0.7 : 1 }}
                    >
                      {isApproving ? <LoaderCircle size={11} style={{ animation: "refineSpin 1s linear infinite" }} /> : <Check size={11} />}
                      {isApproving ? "Saving…" : "Approve"}
                    </button>
                  </div>
                </div>
              )}

              {error && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{error}</p>}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "10px 16px 14px" }}>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.35)", textTransform: "uppercase", margin: "0 0 10px" }}>
                {currentSection.nav} — {currentSection.title}
              </p>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Reply about ${currentSection.shortTitle.toLowerCase()}…`}
                  rows={2}
                  disabled={isPending || isApproving}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,168,107,0.2)", borderRadius: "12px", padding: "10px 14px", resize: "none", fontFamily: "'Special Elite', cursive", fontSize: "14px", lineHeight: 1.6, color: "#d4cec4", outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button" onClick={sendMessage} disabled={!draft.trim() || isPending || isApproving}
                  style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", border: "none", cursor: draft.trim() && !isPending ? "pointer" : "not-allowed", background: draft.trim() && !isPending && !isApproving ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                >
                  {isPending
                    ? <LoaderCircle size={16} style={{ color: "#c8a86b", animation: "refineSpin 1s linear infinite" }} />
                    : <ArrowUp size={16} style={{ color: draft.trim() && !isApproving ? "#0a0a0a" : "#555" }} />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Shell helpers ─────────────────────────────────────────────────────────────

type KickoffMode = "full" | "confirmation" | false;

function chapterKickoffMode(snapshot: BoardSnapshot): KickoffMode {
  const { board } = snapshot;
  if (board.kickoffCompletedAt) return false;
  if (board.kickoffPrefilledAt) return "confirmation";
  return (
    !board.goal?.trim() &&
    !board.whyItMatters?.trim() &&
    !board.successLooksLike?.trim() &&
    !board.doneDefinition?.trim()
  )
    ? "full"
    : false;
}

function classifyTasks(snapshot: BoardSnapshot) {
  const doneColumnId = snapshot.columns.find(
    (col) => col.name.toLowerCase() === "done",
  )?.id;

  const completedTasks = doneColumnId
    ? snapshot.tasks.filter((t) => t.columnId === doneColumnId)
    : [];
  const remainingTasks = doneColumnId
    ? snapshot.tasks.filter((t) => t.columnId !== doneColumnId)
    : snapshot.tasks;

  return { completedTasks, remainingTasks };
}

export function ChapterOverviewShell({
  snapshot,
  projects,
  profile,
  currentProjectId,
  currentChapterId,
  initialShareFormat = null,
}: {
  snapshot: BoardSnapshot;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId: string;
  initialShareFormat?: string | null;
}) {
  const router = useRouter();
  const kickoffMode = chapterKickoffMode(snapshot);
  const [kickoffDismissed, setKickoffDismissed] = useState(false);
  const [refining, setRefining] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [storyPlayerData, setStoryPlayerData] = useState<{
    chapterStory: string;
    pullQuote: string;
  } | null>(null);
  const [showStoryHub, setShowStoryHub] = useState(false);
  const [endChapterModalOpen, setEndChapterModalOpen] = useState(false);
  const validFormats = ["email", "blog", "linkedin", "podcast"];
  const [activeShareFormat, setActiveShareFormat] = useState<string | null>(
    initialShareFormat && validFormats.includes(initialShareFormat) ? initialShareFormat : null,
  );

  const showKickoff = kickoffMode !== false && !kickoffDismissed;

  // Determine chapter number and previous chapter goal for Cass
  const currentProjectChapters = useMemo(
    () => projects.find((p) => p.id === currentProjectId)?.chapters ?? [],
    [projects, currentProjectId],
  );
  const chapterIndex = currentProjectChapters.findIndex(
    (c) => c.id === currentChapterId,
  );
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : 1;
  const { completedTasks, remainingTasks } = useMemo(
    () => classifyTasks(snapshot),
    [snapshot],
  );


  function handleEndChapterConfirmed(_nextChapterId: string | null) {
    setEndChapterModalOpen(false);
    setRetroOpen(true);
  }

  function handleRetroComplete(data: { chapterStory: string; pullQuote: string }) {
    setRetroOpen(false);
    setStoryPlayerData(data);
  }

  const activeChapterUrl = (() => {
    const currentProject = projects.find((p) => p.id === currentProjectId);
    const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
    return activeChapter
      ? `/projects/${currentProjectId}/chapters/${activeChapter.id}/board`
      : null;
  })();


  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={currentProjectId}
        currentChapterId={currentChapterId}
        mobileEyebrow={snapshot.board.name}
        mobileTitle={snapshot.project.name}
        activeNav="story"
        onPlanChapters={() => router.push(`/projects/${currentProjectId}?plan=true`)}
      >
        <div className="flex h-full min-h-0 flex-col">
          {showKickoff ? (
            <CassChapterKickoff
              project={snapshot.project}
              board={snapshot.board}
              columns={snapshot.columns}
              chapterNumber={chapterNumber}
              onComplete={() => { setKickoffDismissed(true); router.refresh(); }}
              onDismiss={undefined}
              isPrefilled={kickoffMode === "confirmation"}
            />
          ) : retroOpen ? (
            <CassRetroChat
              project={{
                id: snapshot.project.id,
                name: snapshot.project.name,
                accumulativeStory: snapshot.project.accumulativeStory,
              }}
              board={snapshot.board}
              completedTasks={completedTasks}
              remainingTasks={remainingTasks}
              onComplete={handleRetroComplete}
              onDismiss={() => setRetroOpen(false)}
            />
          ) : storyPlayerData ? (
            <CassStoryPlayer
              chapterName={snapshot.board.name}
              chapterStory={storyPlayerData.chapterStory}
              pullQuote={storyPlayerData.pullQuote}
              projectId={currentProjectId}
              boardId={currentChapterId}
              onShareThis={() => {
                setStoryPlayerData(null);
                setShowStoryHub(true);
                router.refresh();
              }}
              onClose={() => {
                setStoryPlayerData(null);
                router.refresh();
              }}
            />
          ) : showStoryHub ? (
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowStoryHub(false)}
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
              >
                <ArrowLeft className="size-4" />
                Back to chapter
              </button>
              <StoryHub
                board={snapshot.board}
                project={{
                  id: snapshot.project.id,
                  name: snapshot.project.name,
                  accumulativeStory: snapshot.project.accumulativeStory,
                }}
                completedTasks={completedTasks}
                remainingTasks={remainingTasks}
              />
            </div>
          ) : activeShareFormat ? (
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActiveShareFormat(null)}
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
              >
                <ArrowLeft className="size-4" />
                Back to chapter
              </button>
              <StoryHub
                board={snapshot.board}
                project={{
                  id: snapshot.project.id,
                  name: snapshot.project.name,
                  accumulativeStory: snapshot.project.accumulativeStory,
                }}
                completedTasks={completedTasks}
                remainingTasks={remainingTasks}
                initialFormat={activeShareFormat}
              />
            </div>
          ) : (
            <ChapterOverviewPanel
              board={snapshot.board}
              projectId={currentProjectId}
              chapterId={currentChapterId}
              tasks={snapshot.tasks}
              columns={snapshot.columns}
              projectName={snapshot.project.name}
              northStar={snapshot.project.northStar}
              accumulativeStory={snapshot.project.accumulativeStory}
              chapters={projects.find((p) => p.id === currentProjectId)?.chapters}
              onRefine={() => setRefining(true)}
              onStartRetro={() => setRetroOpen(true)}
              onEndChapter={() => setEndChapterModalOpen(true)}
              onSelectShareFormat={setActiveShareFormat}
              onPlanChapters={() => router.push(`/projects/${currentProjectId}?plan=true`)}
              activeChapterUrl={activeChapterUrl}
            />
          )}
        </div>
      </ProjectShellFrame>

      <EndChapterModal
        open={endChapterModalOpen}
        onClose={() => setEndChapterModalOpen(false)}
        onConfirm={handleEndChapterConfirmed}
        projectId={currentProjectId}
        boardId={currentChapterId}
        incompleteTasks={{
          count: remainingTasks.length,
          titles: remainingTasks.map((t) => t.title),
        }}
      />

      <CassRefineDrawer
        open={refining}
        project={snapshot.project}
        board={snapshot.board}
        onClose={() => setRefining(false)}
      />
    </>
  );
}
