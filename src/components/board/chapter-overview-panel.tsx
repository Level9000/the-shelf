"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PencilLine,
  Save,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board, Chapter, Task, BoardColumn } from "@/types";
import { updateBoardOverviewAction } from "@/lib/actions/project-actions";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassFab } from "@/components/cass/CassFab";
import { CassShareChat, type Phase as CassPhase } from "@/components/cass/CassShareChat";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

// ── Generating overlay ────────────────────────────────────────────────────────

function GeneratingOverlay() {
  const text = "hang tight — I'll get this printed out for you";
  const [displayed, setDisplayed] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const fadeTimer = setTimeout(() => setVisible(true), 50);
    const startTimer = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 32);
    }, 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "36px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      <CassRecorder animState="playing" size="md" />
      <p
        style={{
          fontFamily: "'Special Elite', cursive",
          fontSize: "18px",
          lineHeight: 1.7,
          color: "#e8e0d0",
          textAlign: "center",
          maxWidth: "300px",
          opacity: 0.9,
          minHeight: "60px",
        }}
      >
        {displayed}
        {displayed.length < text.length && displayed.length > 0 && (
          <span style={{ opacity: 0.4, animation: "cassCaretBlink 0.9s step-end infinite" }}>▌</span>
        )}
      </p>
      <style>{`
        @keyframes cassCaretBlink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "0" }}>
      <p
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "9px",
          letterSpacing: "3px",
          color: "rgba(200,168,107,0.45)",
          textTransform: "uppercase",
          margin: 0,
          flexShrink: 0,
        }}
      >
        {label}
      </p>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "linear-gradient(90deg, rgba(200,168,107,0.2), transparent)",
        }}
      />
    </div>
  );
}

// ── Dark textarea ─────────────────────────────────────────────────────────────

function DarkTextarea({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={5}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(200,168,107,0.3)",
        borderRadius: "12px",
        padding: "14px 16px",
        fontFamily: "'Special Elite', cursive",
        fontSize: "14px",
        lineHeight: 1.7,
        color: "#e8e0d0",
        outline: "none",
        resize: "vertical",
        marginTop: "12px",
        boxSizing: "border-box",
      }}
    />
  );
}

// ── Edit actions ──────────────────────────────────────────────────────────────

function EditActions({
  onCancel,
  onSave,
  isPending,
}: {
  onCancel: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 16px", borderRadius: "999px",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#888", fontFamily: "'Share Tech Mono', monospace",
          fontSize: "11px", cursor: "pointer",
        }}
      >
        <X size={11} /> Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 16px", borderRadius: "999px",
          background: "rgba(200,168,107,0.15)", border: "1px solid rgba(200,168,107,0.35)",
          color: "#c8a86b", fontFamily: "'Share Tech Mono', monospace",
          fontSize: "11px", cursor: "pointer",
        }}
      >
        <Save size={11} /> {isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

// ── Cass share FAB ───────────────────────────────────────────────────────────

function CassShareFab({ onOpen }: { onOpen: () => void }) {
  return (
    <CassFab
      onClick={onOpen}
      hoverText="Ready to share this story?"
      expandedWidth="272px"
    />
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  projectName,
  northStar,
  accumulativeStory,
  chapters,
  onRefine,
  onStartRetro,
  onEndChapter,
  activeChapterUrl = null,
  onSelectShareFormat,
  onPlanChapters,
}: {
  board: Board;
  projectId: string;
  chapterId: string;
  tasks?: Task[];
  columns?: BoardColumn[];
  projectName?: string | null;
  northStar?: string | null;
  accumulativeStory?: string | null;
  chapters?: Chapter[];
  onRefine: () => void;
  onStartRetro?: () => void;
  onEndChapter?: () => void;
  activeChapterUrl?: string | null;
  onSelectShareFormat?: (format: string) => void;
  onPlanChapters?: () => void;
}) {
  const router = useRouter();

  const doneColumnId = columns?.find((col) => col.name.toLowerCase() === "done")?.id;
  const allTasksDone =
    tasks !== undefined && tasks.length > 0 && tasks.every((t) => t.columnId === doneColumnId);
  const retroAvailable = Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;
  const retroDone = Boolean(board.retroCompletedAt);

  type EditableField = "goal" | "whyItMatters" | "successLooksLike" | "doneDefinition";

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [cassPhase, setCassPhase] = useState<CassPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    goal: board.goal ?? "",
    whyItMatters: board.whyItMatters ?? "",
    successLooksLike: board.successLooksLike ?? "",
    doneDefinition: board.doneDefinition ?? "",
  });

  function handleChange(field: EditableField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCancelEdit() {
    setForm({
      goal: board.goal ?? "",
      whyItMatters: board.whyItMatters ?? "",
      successLooksLike: board.successLooksLike ?? "",
      doneDefinition: board.doneDefinition ?? "",
    });
    setError(null);
    setEditingField(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBoardOverviewAction({
          projectId,
          boardId: board.id,
          name: board.name,
          ...form,
        });
        setEditingField(null);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save the chapter overview.",
        );
      }
    });
  }

  const sectionStyle = {
    paddingTop: "32px",
    paddingBottom: "8px",
  };

  const bodyTextStyle: React.CSSProperties = {
    fontFamily: "'Special Elite', cursive",
    fontSize: "15px",
    lineHeight: 1.85,
    color: "rgba(232,224,208,0.75)",
    margin: "12px 0 0",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Special Elite', cursive",
    fontSize: "18px",
    color: "#e8e0d0",
    margin: "8px 0 0",
    lineHeight: 1.3,
  };

  const placeholderStyle: React.CSSProperties = {
    fontFamily: "'Special Elite', cursive",
    fontSize: "14px",
    lineHeight: 1.75,
    color: "rgba(200,168,107,0.25)",
    margin: "12px 0 0",
    fontStyle: "italic",
  };

  return (
    <>
      <style>{`
        @keyframes chapterPanelPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes cassCaretBlink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* Reading column */}
      <div
        className="-mx-4 flex-1 lg:mx-0"
        style={{ paddingBottom: "140px" }}
      >
        <div style={{ maxWidth: "660px", margin: "0 auto", padding: "36px 24px 0" }}>

          {/* ── Completed banner ── */}
          {retroDone && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "28px",
                padding: "10px 14px",
                borderRadius: "999px",
                background: "rgba(200,168,107,0.07)",
                border: "1px solid rgba(200,168,107,0.18)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "11px",
                  color: "rgba(200,168,107,0.6)",
                  margin: 0,
                }}
              >
                completed{" "}
                <span style={{ color: "#c8a86b" }}>
                  {new Date(board.retroCompletedAt!).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </p>
              {activeChapterUrl && (
                <Link
                  href={activeChapterUrl}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: "10px",
                    color: "#c8a86b", textDecoration: "none", flexShrink: 0,
                    letterSpacing: "0.5px",
                  }}
                >
                  Current chapter <ArrowRight size={10} />
                </Link>
              )}
            </div>
          )}

          {/* ── Write the story CTA ── */}
          {!retroDone && retroAvailable && allTasksDone && onStartRetro && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
              <button
                type="button"
                onClick={onStartRetro}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "10px 20px", borderRadius: "999px",
                  background: "linear-gradient(135deg, #c8a86b, #a8864e)",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "12px", fontWeight: 600, color: "#0a0a0a",
                  boxShadow: "0 4px 16px rgba(200,168,107,0.3)",
                }}
              >
                <BookOpen size={14} />
                All done — write the story
              </button>
            </div>
          )}

          {/* ── Story section ── */}
          {retroDone && board.chapterStory && (
            <div style={{ marginBottom: "8px" }}>
              <SectionDivider label="How it went" />
              <p
                style={{
                  fontFamily: "'Special Elite', cursive",
                  fontSize: "16px",
                  lineHeight: 1.85,
                  color: "rgba(232,224,208,0.9)",
                  margin: "16px 0 0",
                }}
              >
                {board.chapterStory}
              </p>
              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => { setChatKey((k) => k + 1); setShareDrawerOpen(true); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "8px 18px", borderRadius: "999px",
                    background: "transparent",
                    border: "1px solid rgba(200,168,107,0.3)",
                    cursor: "pointer",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "11px", color: "#c8a86b", letterSpacing: "0.5px",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(200,168,107,0.08)";
                    e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(200,168,107,0.3)";
                  }}
                >
                  <Share2 size={12} />
                  Share this story
                </button>
              </div>
            </div>
          )}

          {/* ── What ── */}
          <div style={sectionStyle}>
            <SectionDivider label="What" />
            <h3 style={headingStyle}>
              {retroDone ? "What was the bet?" : "What's the bet we're making?"}
            </h3>

            {editingField === "goal" ? (
              <>
                <DarkTextarea
                  value={form.goal}
                  onChange={(v) => handleChange("goal", v)}
                  placeholder="What belief are you acting on? State the bet plainly."
                  autoFocus
                />
                <EditActions onCancel={handleCancelEdit} onSave={handleSave} isPending={isPending} />
                {error && editingField === "goal" && (
                  <p style={{ color: "#f87171", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", marginTop: "8px" }}>{error}</p>
                )}
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <p style={board.goal?.trim() ? bodyTextStyle : placeholderStyle}>
                  {copyOrFallback(board.goal, "What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds.")}
                </p>
                {!retroDone && (
                  <button
                    type="button"
                    onClick={() => setEditingField("goal")}
                    style={{
                      position: "absolute", top: "8px", right: 0,
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(200,168,107,0.4)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.1)"; e.currentTarget.style.color = "#c8a86b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(200,168,107,0.4)"; }}
                    aria-label="Edit chapter goal"
                  >
                    <PencilLine size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Why ── */}
          <div style={sectionStyle}>
            <SectionDivider label="Why" />
            <h3 style={headingStyle}>
              {retroDone ? "Why did this matter at the time?" : "Why does this matter right now?"}
            </h3>

            {editingField === "whyItMatters" ? (
              <>
                <DarkTextarea
                  value={form.whyItMatters}
                  onChange={(v) => handleChange("whyItMatters", v)}
                  placeholder="What's the window? What's the pressure?"
                  autoFocus
                />
                <EditActions onCancel={handleCancelEdit} onSave={handleSave} isPending={isPending} />
                {error && editingField === "whyItMatters" && (
                  <p style={{ color: "#f87171", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", marginTop: "8px" }}>{error}</p>
                )}
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <p style={board.whyItMatters?.trim() ? bodyTextStyle : placeholderStyle}>
                  {copyOrFallback(board.whyItMatters, "What's the window? What's the pressure? Why is this the right chapter to run right now?")}
                </p>
                {!retroDone && (
                  <button
                    type="button"
                    onClick={() => setEditingField("whyItMatters")}
                    style={{
                      position: "absolute", top: "8px", right: 0,
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(200,168,107,0.4)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.1)"; e.currentTarget.style.color = "#c8a86b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(200,168,107,0.4)"; }}
                    aria-label="Edit why this chapter matters"
                  >
                    <PencilLine size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── How ── */}
          <div style={sectionStyle}>
            <SectionDivider label="How" />
            <h3 style={headingStyle}>
              {retroDone ? "What needed to be true?" : "What has to be true?"}
            </h3>

            {editingField === "successLooksLike" ? (
              <>
                <DarkTextarea
                  value={form.successLooksLike}
                  onChange={(v) => handleChange("successLooksLike", v)}
                  placeholder="List the conditions that need to hold."
                  autoFocus
                />
                <EditActions onCancel={handleCancelEdit} onSave={handleSave} isPending={isPending} />
                {error && editingField === "successLooksLike" && (
                  <p style={{ color: "#f87171", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", marginTop: "8px" }}>{error}</p>
                )}
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <p style={board.successLooksLike?.trim() ? bodyTextStyle : placeholderStyle}>
                  {copyOrFallback(board.successLooksLike, "List the conditions that need to hold. Each one is something the board can work toward directly.")}
                </p>
                {!retroDone && (
                  <button
                    type="button"
                    onClick={() => setEditingField("successLooksLike")}
                    style={{
                      position: "absolute", top: "8px", right: 0,
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(200,168,107,0.4)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.1)"; e.currentTarget.style.color = "#c8a86b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(200,168,107,0.4)"; }}
                    aria-label="Edit what success looks like"
                  >
                    <PencilLine size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── When ── */}
          <div style={sectionStyle}>
            <SectionDivider label="When" />
            <h3 style={headingStyle}>
              {retroDone ? "What did we have to show for it?" : "What will we have to show?"}
            </h3>

            {editingField === "doneDefinition" ? (
              <>
                <DarkTextarea
                  value={form.doneDefinition}
                  onChange={(v) => handleChange("doneDefinition", v)}
                  placeholder="What tangible thing will exist or be demonstrably true at the end?"
                  autoFocus
                />
                <EditActions onCancel={handleCancelEdit} onSave={handleSave} isPending={isPending} />
                {error && editingField === "doneDefinition" && (
                  <p style={{ color: "#f87171", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", marginTop: "8px" }}>{error}</p>
                )}
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <p style={board.doneDefinition?.trim() ? bodyTextStyle : placeholderStyle}>
                  {copyOrFallback(board.doneDefinition, "What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to.")}
                </p>
                {!retroDone && (
                  <button
                    type="button"
                    onClick={() => setEditingField("doneDefinition")}
                    style={{
                      position: "absolute", top: "8px", right: 0,
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(200,168,107,0.4)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.1)"; e.currentTarget.style.color = "#c8a86b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(200,168,107,0.4)"; }}
                    aria-label="Edit done definition"
                  >
                    <PencilLine size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile: all chapters ── */}
          {chapters && chapters.length > 0 && (
            <div className="lg:hidden" style={{ marginTop: "52px" }}>
              <div
                style={{
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(200,168,107,0.15) 30%, rgba(200,168,107,0.15) 70%, transparent)",
                  marginBottom: "28px",
                }}
              />
              <p
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "3px",
                  color: "rgba(200,168,107,0.4)",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                All chapters
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {chapters.map((ch, i) => {
                  const status = ch.retroCompletedAt
                    ? "completed"
                    : ch.kickoffCompletedAt
                    ? "active"
                    : "planned";
                  const isCurrent = ch.id === chapterId;

                  return (
                    <Link
                      key={ch.id}
                      href={`/projects/${projectId}/chapters/${ch.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        background: isCurrent ? "rgba(200,168,107,0.08)" : "transparent",
                        border: isCurrent ? "1px solid rgba(200,168,107,0.18)" : "1px solid transparent",
                        textDecoration: "none",
                        opacity: status === "planned" && !isCurrent ? 0.4 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: status === "completed" ? "rgba(134,239,172,0.15)" : status === "active" ? "rgba(200,168,107,0.12)" : "rgba(255,255,255,0.05)",
                        }}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 size={12} style={{ color: "#86efac" }} />
                        ) : status === "active" ? (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", display: "block", animation: "chapterPanelPulse 2s ease-in-out infinite" }} />
                        ) : (
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "rgba(200,168,107,0.4)" }}>{i + 1}</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", color: isCurrent ? "#c8a86b" : "rgba(200,168,107,0.4)", margin: 0, letterSpacing: "1px" }}>
                          Chapter {i + 1}{isCurrent && " · current"}
                        </p>
                        {ch.goal && (
                          <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "rgba(232,224,208,0.7)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ch.goal}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {onPlanChapters && (
                <button
                  type="button"
                  onClick={onPlanChapters}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "12px 14px", width: "100%",
                    background: "transparent", border: "none",
                    cursor: "pointer", marginTop: "4px",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "11px", color: "rgba(200,168,107,0.5)",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={12} />
                  Plan new chapters
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Refine FAB — before retro ── */}
      {!retroDone && (
        <CassFab onClick={onRefine} hoverText="Refine this chapter" expandedWidth="252px" />
      )}

      {/* ── Cass share FAB — after retro ── */}
      {retroDone && !shareDrawerOpen && (
        <CassShareFab onOpen={() => { setChatKey((k) => k + 1); setShareDrawerOpen(true); }} />
      )}

      {/* ── Share drawer backdrop ── */}
      {shareDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setShareDrawerOpen(false)}
        />
      )}

      {/* ── Generating overlay ── */}
      {cassPhase === "generating" && <GeneratingOverlay />}

      {/* ── Share drawer ── */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[30%] lg:min-w-[340px]"
        style={{
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%)",
          transform: shareDrawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: shareDrawerOpen ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        }}
        aria-hidden={!shareDrawerOpen}
      >
        {/* Progress bar */}
        <div style={{ height: "3px", background: "rgba(200,168,107,0.1)", flexShrink: 0, width: "100%" }}>
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, rgba(200,168,107,0.6), #c8a86b)",
              width:
                cassPhase === "refine1" ? "33%" :
                cassPhase === "refine2" ? "66%" :
                cassPhase === "generating" ? "100%" :
                "0%",
              transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Drawer header */}
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 20px 14px",
          }}
        >
          <button
            type="button"
            onClick={() => setShareDrawerOpen(false)}
            aria-label="Close share panel"
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

          <div
            style={{
              width: "64px", height: "64px", borderRadius: "50%",
              overflow: "hidden", position: "relative",
              background: "#1a1a1a",
              boxShadow: "0 0 0 1.5px rgba(200,168,107,0.35), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                position: "absolute", top: 0, left: 0,
                transformOrigin: "top left",
                transform: "scale(0.5333) translateY(-6.5px)",
              }}
            >
              <CassRecorder animState="idle" size="sm" />
            </div>
          </div>
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "9px", letterSpacing: "2.5px",
              color: "#c8a86b", textTransform: "uppercase",
              margin: "6px 0 0", opacity: 0.7,
            }}
          >
            Cass
          </p>
        </div>

        <div style={{ height: "1px", background: "rgba(200,168,107,0.08)", flexShrink: 0 }} />

        <CassShareChat
          key={chatKey}
          onPhaseChange={setCassPhase}
          onComplete={(format) => {
            setCassPhase(null);
            setShareDrawerOpen(false);
            onSelectShareFormat?.(format);
          }}
        />
      </div>
    </>
  );
}
