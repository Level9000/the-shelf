"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Check, CheckCircle, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { TapeButton } from "@/components/ui/tape-button";
import type { AICassBoardDialogue } from "@/lib/ai/schema";
import type { Board, BoardColumn, BoardConversationEntry, Priority, Project, ProposedTask, Task, WorkflowTemplate } from "@/types";
import { createBrainDumpCardsAction, deleteTaskAction, saveBoardConversationAction, saveWorkflowTemplateAction } from "@/lib/actions/task-actions";
import { deferTasksToNextChapterAction, endChapterEarlyAction } from "@/lib/actions/project-actions";
import { getChapterAgeDays } from "@/lib/utils";
import { CassProgressBar } from "@/components/cass/CassProgressBar";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { AvatarRecorder, useAvatarName } from "@/components/ui/AvatarRecorder";
import { CassRetroChat } from "@/components/cass/CassRetroChat";
import type { CassAnimState } from "@/components/cass/cassVoice";
import { useTheme } from "@/lib/theme-context";

// ── Speech Recognition types (not fully typed in all TS DOM libs) ─────────────

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  addEventListener(type: "result", listener: (e: SpeechRecognitionEvent) => void): void;
  addEventListener(type: "error", listener: (e: SpeechRecognitionErrorEvent) => void): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

type BoardMode = "menu" | "chat" | "completed" | "retro_nudge" | "refocus" | "retro" | "onboarding_welcome" | "new_chapter_prompt";
type ChatSubMode = "tasks" | "breakup" | "end_chapter" | "chronicle";
type RefocusPhase = "chat" | "triage" | "retro";
type TriageDecision = "keep" | "move" | "delete";
type BrainDumpState = "idle" | "recording" | "processing" | "error";
type Msg = { role: "user" | "assistant"; content: string };

const MENU_QUESTION = "What would you like to add to this chapter?";

// Small avatar name label shown under the avatar in the drawer header
function AvatarNameLabel() {
  const name = useAvatarName();
  return (
    <span style={{
      fontFamily: "var(--font-cass)",
      fontSize: "10px",
      letterSpacing: "2px",
      textTransform: "uppercase",
      color: "rgba(200,168,107,0.45)",
    }}>{name}</span>
  );
}

const MENU_OPTIONS: Array<{ key: ChatSubMode; label: string; sub: string }> = [
  { key: "tasks",     label: "Tell me what's on your mind", sub: "" },
  { key: "chronicle", label: "Add tasks I've already completed", sub: "" },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const CASS_B: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 12px 2px", padding: "12px 16px",
  fontFamily: "'Literata', Georgia, serif", fontSize: "16px",
  lineHeight: "1.7", color: "var(--ink)", maxWidth: "92%",
};
const USER_B: React.CSSProperties = {
  background: "rgba(200,168,107,0.1)", border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 2px 12px", padding: "10px 16px",
  fontFamily: "'Literata', Georgia, serif", fontSize: "14px",
  lineHeight: "1.6", color: "#c8a86b", maxWidth: "80%",
};
const PRIORITY_COLORS: Record<NonNullable<Priority>, string> = {
  high: "#f87171", medium: "#fbbf24", low: "#6ee7b7",
};
const COLUMN_LABELS: Record<string, string> = {
  "Do Today": "Today", "Do This Week": "This Week", "Backlog": "Backlog", "Done": "Done",
};

// ── Refocus opener ────────────────────────────────────────────────────────────

function buildRfOpener(board: Board, incompleteTasks: Task[], ageDays: number): string {
  if (incompleteTasks.length === 0) {
    return `Your backlog for ${board.name} is clear. If you're ready to close this chapter, let's write the recap.`;
  }
  const openingLine = board.openingLine ? `You started this chapter with: "${board.openingLine}." ` : "";
  const named = incompleteTasks.slice(0, 2).map((t) => `"${t.title}"`).join(" and ");
  const more = incompleteTasks.length > 2 ? ` and ${incompleteTasks.length - 2} more` : "";
  return `${openingLine}It's been ${ageDays} days. You still have ${named}${more} in the backlog. What's actually been getting in the way?`;
}

// ── Proposal card ─────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
const PRIORITY_CHIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:    { bg: "rgba(110,231,183,0.15)", border: "rgba(110,231,183,0.45)", text: "#6ee7b7" },
  medium: { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.45)",  text: "#fbbf24" },
  high:   { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.45)", text: "#f87171" },
};

function ProposalCard({
  task, columns, onRemove, onColumnChange, onTitleChange, onDescriptionChange, onUrgentChange, onSizeChange, onDueDateChange, onAssigneeChange,
}: {
  task: ProposedTask;
  columns: BoardColumn[];
  onRemove: () => void;
  onColumnChange: (col: string) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (desc: string) => void;
  onUrgentChange: (urgent: boolean) => void;
  onSizeChange: (size: "small" | "big" | null) => void;
  onDueDateChange: (d: string) => void;
  onAssigneeChange: (a: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [expanded, setExpanded] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description ?? "");
  const [localAssignee, setLocalAssignee] = useState((task as any).assigneeName ?? "");
  const [localDueDate, setLocalDueDate] = useState((task as any).dueDate ?? "");
  const availableCols = columns.map((c) => c.name);

  function commitTitle() { if (localTitle.trim()) onTitleChange(localTitle.trim()); else setLocalTitle(task.title); }
  function commitDesc() { onDescriptionChange(localDesc); }
  function commitAssignee() { onAssigneeChange(localAssignee); }
  function commitDueDate() { onDueDateChange(localDueDate); }

  const currentUrgent = (task as any).isUrgent as boolean ?? false;
  const currentSize   = (task as any).size as "small" | "big" | null ?? null;

  const cardTextPrimary   = isDark ? "#f8f8f6"               : "rgba(26,14,0,0.88)";
  const cardTextMuted     = isDark ? "rgba(248,248,246,0.45)" : "rgba(26,14,0,0.45)";
  const cardTextFaint     = isDark ? "rgba(248,248,246,0.3)"  : "rgba(26,14,0,0.35)";
  const cardSurface       = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.03)";
  const cardBorder        = isDark ? "rgba(200,168,107,0.18)" : "rgba(200,168,107,0.25)";
  const cardBorderExpanded = isDark ? "rgba(200,168,107,0.35)" : "rgba(200,168,107,0.45)";
  const cardInputBg       = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.04)";
  const cardBtnBg         = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.06)";
  const cardPriorityInactiveBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(26,14,0,0.12)";
  const cardSelectBg      = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.06)";

  const fieldLabel: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600,
    letterSpacing: "0.18em", textTransform: "uppercase", color: cardTextFaint,
    marginBottom: "5px",
  };
  const textField: React.CSSProperties = {
    width: "100%", background: cardInputBg, border: "1px solid rgba(200,168,107,0.22)",
    borderRadius: "8px", padding: "7px 10px", boxSizing: "border-box",
    fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: "1.5",
    color: cardTextPrimary, outline: "none", caretColor: "#c8a86b",
    colorScheme: isDark ? "dark" : "light",
  };

  return (
    <div style={{
      background: cardSurface, border: `1px solid ${expanded ? cardBorderExpanded : cardBorder}`,
      borderRadius: "14px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px",
      transition: "border-color 0.2s",
    }}>
      {/* ── Title row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {expanded ? (
          <input
            autoFocus
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            style={{ ...textField, flex: 1, fontSize: "15px", padding: "6px 10px" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.6)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.22)"; commitTitle(); }}
          />
        ) : (
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", color: cardTextPrimary, margin: 0, lineHeight: "1.55", flex: 1 }}>
            {task.title}
          </p>
        )}
        {/* Pencil / check-circle */}
        <button
          type="button"
          onClick={() => { if (!expanded) { setExpanded(true); } else { commitTitle(); commitDesc(); commitAssignee(); commitDueDate(); setExpanded(false); } }}
          title={expanded ? "Done editing" : "Edit card"}
          style={{ width: "26px", height: "26px", flexShrink: 0, borderRadius: "50%", background: expanded ? "rgba(200,168,107,0.15)" : cardBtnBg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: expanded ? "#c8a86b" : cardTextFaint, transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.15)"; e.currentTarget.style.color = "#c8a86b"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = expanded ? "rgba(200,168,107,0.15)" : cardBtnBg; e.currentTarget.style.color = expanded ? "#c8a86b" : cardTextFaint; }}
        >
          {expanded ? <CheckCircle size={13} /> : <Pencil size={12} />}
        </button>
        {/* Trash */}
        <button
          type="button" onClick={onRemove}
          style={{ width: "26px", height: "26px", flexShrink: 0, borderRadius: "50%", background: cardBtnBg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: cardTextFaint, transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = cardBtnBg; e.currentTarget.style.color = cardTextFaint; }}
        ><Trash2 size={11} /></button>
      </div>

      {/* ── Description ── */}
      {expanded ? (
        <textarea
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={commitDesc}
          placeholder="Add context or details…"
          rows={3}
          style={{ ...textField, resize: "vertical" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.22)"; }}
        />
      ) : task.description ? (
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: "1.6", color: cardTextMuted, margin: 0 }}>
          {task.description}
        </p>
      ) : null}

      {/* ── Expanded detail tray: priority + due date + assignee ── */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "4px", borderTop: `1px solid ${isDark ? "rgba(200,168,107,0.1)" : "rgba(200,168,107,0.18)"}` }}>

          {/* Urgent + Size */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {/* Urgent toggle */}
            <div style={{ flex: 1, minWidth: "120px" }}>
              <p style={fieldLabel}>Urgent</p>
              <button
                type="button"
                onClick={() => onUrgentChange(!currentUrgent)}
                style={{
                  width: "100%", padding: "5px 12px", borderRadius: "999px", cursor: "pointer",
                  background: currentUrgent ? "rgba(248,113,113,0.15)" : "transparent",
                  border: `1px solid ${currentUrgent ? "rgba(248,113,113,0.45)" : cardPriorityInactiveBorder}`,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: currentUrgent ? "#f87171" : cardTextFaint,
                  transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                }}
              >
                <span>!</span>
                <span>{currentUrgent ? "Urgent" : "Mark urgent"}</span>
              </button>
            </div>
            {/* Size chips */}
            <div style={{ flex: 1, minWidth: "140px" }}>
              <p style={fieldLabel}>Effort size</p>
              <div style={{ display: "flex", gap: "5px" }}>
                {(["small", "big"] as const).map((s) => {
                  const active = currentSize === s;
                  return (
                    <button
                      key={s} type="button"
                      onClick={() => onSizeChange(active ? null : s)}
                      style={{
                        flex: 1, padding: "5px 8px", borderRadius: "999px", cursor: "pointer",
                        background: active ? "rgba(110,156,231,0.15)" : "transparent",
                        border: `1px solid ${active ? "rgba(110,156,231,0.4)" : cardPriorityInactiveBorder}`,
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: active ? "#60a5fa" : cardTextFaint,
                        transition: "all 0.15s",
                      }}
                    >{s}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Due date + Assigned to — side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <p style={fieldLabel}>Due date</p>
              <input
                type="date"
                value={localDueDate}
                onChange={(e) => { setLocalDueDate(e.target.value); onDueDateChange(e.target.value); }}
                style={{ ...textField, colorScheme: "dark" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.22)"; commitDueDate(); }}
              />
            </div>
            <div>
              <p style={fieldLabel}>Assigned to</p>
              <input
                type="text"
                value={localAssignee}
                onChange={(e) => setLocalAssignee(e.target.value)}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.22)"; commitAssignee(); }}
                placeholder="Name or @handle"
                style={textField}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Column pill — always visible ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <select
          value={task.suggestedColumn}
          onChange={(e) => onColumnChange(e.target.value)}
          style={{ background: cardSelectBg, border: "1px solid rgba(200,168,107,0.22)", borderRadius: "999px", padding: "3px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8a86b", cursor: "pointer", outline: "none", colorScheme: isDark ? "dark" : "light" }}
        >
          {availableCols.map((c) => (
            <option key={c} value={c} style={{ background: isDark ? "#1a1a1a" : "#faf9f4", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)" }}>{COLUMN_LABELS[c] ?? c}</option>
          ))}
        </select>
        {/* Show set values as read-only badges when collapsed */}
        {!expanded && currentUrgent && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.35)", borderRadius: "999px", padding: "1px 7px" }}>
            !
          </span>
        )}
        {!expanded && currentSize && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(110,156,231,0.12)", color: "#60a5fa", border: "1px solid rgba(110,156,231,0.3)", borderRadius: "999px", padding: "1px 7px" }}>
            {currentSize} effort
          </span>
        )}
        {!expanded && (task as any).dueDate && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", color: "rgba(200,168,107,0.6)" }}>
            {(task as any).dueDate}
          </span>
        )}
        {!expanded && (task as any).assigneeName && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", color: cardTextMuted }}>
            → {(task as any).assigneeName}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Voice memo flow ───────────────────────────────────────────────────────────

type VoiceMemoPhase = "column_select" | "voice" | "text_input" | "processing";

function VoiceMemoFlow({
  columns,
  projectId,
  onCardsReady,
  skipColumnSelect,
  defaultColumn,
}: {
  columns: BoardColumn[];
  projectId: string;
  onCardsReady: (tasks: ProposedTask[], transcript: string, columnName: string) => void;
  skipColumnSelect?: boolean;
  defaultColumn?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [phase, setPhase] = useState<VoiceMemoPhase>(skipColumnSelect ? "voice" : "column_select");
  const [selectedColumn, setSelectedColumn] = useState<string>(defaultColumn ?? "");
  const [listening, setListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Column display names to show (use actual column names from board)
  const columnOptions = columns.filter(c =>
    ["Do Today", "Do This Week", "Blocked", "Done"].includes(c.name)
  );

  function processTranscript(transcript: string) {
    setPhase("processing");
    startTransition(async () => {
      try {
        const res = await fetch("/api/voice/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, transcript }),
        });
        const payload = await res.json() as { tasks?: ProposedTask[]; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Processing failed.");
        const tasks = (payload.tasks ?? []).map((t, i) => ({
          ...t,
          id: t.id ?? `voice-${i}`,
          suggestedColumn: selectedColumn, // override with user's chosen column
        }));
        onCardsReady(tasks, transcript, selectedColumn);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("voice");
      }
    });
  }

  function stopListening() {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch { /* ok */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }

  function scheduleAutoSubmit(text: string) {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        stopListening();
        processTranscript(text.trim());
      }
    }, 1800);
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition isn't supported in this browser."); return; }
    setError(null);
    transcriptRef.current = "";
    const rec = new SR();
    rec.continuous = !isIOS;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcriptRef.current += (transcriptRef.current ? " " : "") + e.results[i][0].transcript.trim();
        }
      }
      scheduleAutoSubmit(transcriptRef.current);
    };
    rec.onend = () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setListening(false);
      if (isIOS && transcriptRef.current.trim()) {
        processTranscript(transcriptRef.current.trim());
      }
    };
    rec.onerror = () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); setListening(false); };
    rec.start();
    setListening(true);
  }

  function toggleVoice() {
    if (listening) stopListening(); else startListening();
  }

  // ── Phase: column_select ──
  if (phase === "column_select") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
          Which column should these go in?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {columnOptions.map((col, i) => (
            <button
              key={col.id}
              type="button"
              onClick={() => { setSelectedColumn(col.name); setPhase("voice"); }}
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)", border: "1px solid rgba(200,168,107,0.25)",
                borderRadius: "12px", padding: "14px 18px", textAlign: "left",
                fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600,
                color: isDark ? "#d4cec4" : "rgba(26,14,0,0.88)", cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
                animation: `cassBoardOptionIn 0.28s ease ${i * 80}ms both`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.08)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)"; }}
            >
              {col.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: processing ──
  if (phase === "processing") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "32px 20px" }}>
        <AvatarRecorder animState="playing" size="md" />
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(200,168,107,0.55)", margin: 0 }}>
          Pulling out the key items…
        </p>
      </div>
    );
  }

  // ── Phase: text_input ──
  if (phase === "text_input") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px 20px", gap: "16px" }}>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
          Type what you want to capture for <strong style={{ color: "#c8a86b" }}>{selectedColumn}</strong>:
        </p>
        <textarea
          autoFocus
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Describe the tasks or ideas you want to add…"
          style={{
            flex: 1, minHeight: "140px",
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.04)", border: "1px solid rgba(200,168,107,0.22)",
            borderRadius: "10px", padding: "14px 16px",
            fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: "1.6",
            color: isDark ? "#d4cec4" : "rgba(26,14,0,0.88)", outline: "none", resize: "none", caretColor: "#c8a86b",
            colorScheme: isDark ? "dark" : "light",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.22)"; }}
        />
        {error && <p style={{ color: "#ff6b6b", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setPhase("voice")}
            style={{ background: "transparent", border: "1px solid rgba(200,168,107,0.22)", borderRadius: "8px", padding: "10px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(200,168,107,0.7)", cursor: "pointer" }}
          >
            ← Voice
          </button>
          <button
            type="button"
            onClick={() => { if (textInput.trim()) processTranscript(textInput.trim()); }}
            disabled={!textInput.trim()}
            style={{ flex: 1, background: textInput.trim() ? "#f5c84a" : isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.07)", border: "none", borderRadius: "8px", padding: "10px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: textInput.trim() ? "#1a0e00" : isDark ? "#555" : "rgba(26,14,0,0.3)", cursor: textInput.trim() ? "pointer" : "default", transition: "background 0.15s" }}
          >
            Process
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: voice ──
  const micIdleBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.07)";
  const micIdleBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(26,14,0,0.18)";
  const micIdleFill   = isDark ? "#666" : "rgba(26,14,0,0.45)";
  const statusIdleColor = isDark ? "#888" : "rgba(26,14,0,0.45)";
  const switchColor   = isDark ? "rgba(248,248,246,0.2)" : "rgba(26,14,0,0.28)";
  const switchHover   = isDark ? "rgba(248,248,246,0.5)" : "rgba(26,14,0,0.6)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px 24px", gap: "20px" }}>
      {/* Column context */}
      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(200,168,107,0.65)", margin: 0 }}>
        → {selectedColumn}
      </p>

      {/* Mic button */}
      <button
        type="button"
        {...(isIOS ? {
          onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (!listening) startListening(); },
          onPointerUp:   (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (listening) stopListening(); },
          onPointerCancel: () => { if (listening) stopListening(); },
        } : { onClick: toggleVoice })}
        aria-label={listening ? "Stop recording" : "Start recording"}
        style={{
          width: "96px", height: "96px", borderRadius: "50%",
          background: listening ? "rgba(245,200,74,0.15)" : micIdleBg,
          border: `2px solid ${listening ? "#f5c84a" : micIdleBorder}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
          boxShadow: listening ? "0 0 0 12px rgba(245,200,74,0.08), 0 0 0 24px rgba(245,200,74,0.04)" : "none",
          userSelect: "none", WebkitUserSelect: "none",
        }}
      >
        <svg width="28" height="24" viewBox="0 0 16 14" fill="none" aria-hidden="true">
          {[{ x: 0, h: 4, y: 5 }, { x: 3, h: 8, y: 3 }, { x: 6, h: 14, y: 0 }, { x: 9, h: 8, y: 3 }, { x: 12, h: 4, y: 5 }].map((bar, i) => (
            <rect key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
              fill={listening ? "#f5c84a" : micIdleFill}
              style={listening ? { animation: `chat-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
            />
          ))}
        </svg>
      </button>

      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: listening ? "#f5c84a" : statusIdleColor, transition: "color 0.2s" }}>
        {isIOS ? (listening ? "Release to send" : "Hold to speak") : (listening ? "Listening…" : "Tap to record")}
      </span>

      {error && <p style={{ color: "#ff6b6b", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", margin: 0, textAlign: "center" }}>{error}</p>}

      {/* Switch to typing */}
      <button
        type="button"
        onClick={() => { stopListening(); setPhase("text_input"); }}
        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: switchColor, transition: "color 0.15s", padding: "4px 8px", marginTop: "4px" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = switchHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = switchColor; }}
      >
        Switch to typing
      </button>
    </div>
  );
}


// ── End chapter view ─────────────────────────────────────────────────────────

function EndChapterView({
  projectId,
  boardId,
  tasks,
  columns,
  onConfirm,
  onClose,
}: {
  projectId: string;
  boardId: string;
  tasks: Task[];
  columns: BoardColumn[];
  onConfirm: (nextChapterId: string | null) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textPrimary  = isDark ? "#d4cec4"               : "rgba(26,14,0,0.88)";
  const surface       = isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)";
  const surfaceGold   = isDark ? "rgba(200,168,107,0.07)" : "rgba(200,168,107,0.10)";
  const doneColumnId = columns.find((c) => c.name.toLowerCase() === "done")?.id;
  const incompleteTasks = tasks.filter((t) => !doneColumnId || t.columnId !== doneColumnId);
  const hasIncompleteTasks = incompleteTasks.length > 0;

  const [choice, setChoice] = useState<"carry_over" | "delete" | "select" | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    () => new Set(incompleteTasks.map((t) => t.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSelected(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (hasIncompleteTasks && !choice) return;
    setError(null);
    startTransition(async () => {
      try {
        const { nextChapterId } = await endChapterEarlyAction({
          projectId,
          boardId,
          handleIncompleteTasks: hasIncompleteTasks ? (choice as "carry_over" | "delete" | "select") : "delete",
          selectedTaskIds: choice === "select" ? Array.from(selectedTaskIds) : undefined,
        });
        onConfirm(nextChapterId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Cass message — plain text, no bubble, matching the menu's question style */}
        <div style={{ maxWidth: "85%", width: "100%" }}>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
            {hasIncompleteTasks
              ? `${incompleteTasks.length} task${incompleteTasks.length === 1 ? "" : "s"} still open. What should happen to ${incompleteTasks.length === 1 ? "it" : "them"}?`
              : "All tasks are done. Ready to write this chapter’s story?"}
          </p>
        </div>

        {hasIncompleteTasks && (
          <>
            {/* Task list */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,168,107,0.1)", borderRadius: "12px", padding: "12px 14px" }}>
              <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: "0 0 10px" }}>
                Open tasks
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {incompleteTasks.slice(0, 5).map((task) => (
                  <p key={task.id} style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "rgba(232,224,208,0.7)", margin: 0, lineHeight: "1.4" }}>
                    · {task.title}
                  </p>
                ))}
                {incompleteTasks.length > 5 && (
                  <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "rgba(200,168,107,0.35)", margin: 0 }}>
                    +{incompleteTasks.length - 5} more
                  </p>
                )}
              </div>
            </div>

            {/* Carry over */}
            <button
              type="button"
              onClick={() => setChoice("carry_over")}
              style={{
                background: choice === "carry_over" ? "rgba(200,168,107,0.09)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${choice === "carry_over" ? "rgba(200,168,107,0.5)" : "rgba(200,168,107,0.18)"}`,
                borderRadius: "12px", padding: "14px 16px",
                textAlign: "left", width: "100%",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (choice !== "carry_over") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)"; e.currentTarget.style.background = "rgba(200,168,107,0.05)"; } }}
              onMouseLeave={(e) => { if (choice !== "carry_over") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
            >
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.45", color: textPrimary, margin: 0 }}>Move all to the next chapter</p>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.5)", margin: "5px 0 0" }}>Open tasks move into the next chapter&apos;s backlog</p>
            </button>

            {/* Select which tasks to move */}
            <button
              type="button"
              onClick={() => setChoice("select")}
              style={{
                background: choice === "select" ? "rgba(200,168,107,0.09)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${choice === "select" ? "rgba(200,168,107,0.5)" : "rgba(200,168,107,0.18)"}`,
                borderRadius: "12px", padding: "14px 16px",
                textAlign: "left", width: "100%",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (choice !== "select") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)"; e.currentTarget.style.background = "rgba(200,168,107,0.05)"; } }}
              onMouseLeave={(e) => { if (choice !== "select") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
            >
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.45", color: textPrimary, margin: 0 }}>Select the tasks I want to move</p>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.5)", margin: "5px 0 0" }}>Pick which ones carry over — everything else is deleted</p>
            </button>

            {/* Task picker — shown once "select" is chosen */}
            {choice === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(200,168,107,0.45)", margin: 0 }}>
                    {selectedTaskIds.size} of {incompleteTasks.length} will move
                  </p>
                  <TapeButton
                    type="button"
                    onClick={selectedTaskIds.size === incompleteTasks.length
                      ? () => setSelectedTaskIds(new Set())
                      : () => setSelectedTaskIds(new Set(incompleteTasks.map((t) => t.id)))}
                    variant="ghost"
                    size="sm"
                  >
                    {selectedTaskIds.size === incompleteTasks.length ? "Deselect all" : "Select all"}
                  </TapeButton>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {incompleteTasks.map((task) => {
                    const checked = selectedTaskIds.has(task.id);
                    const borderIdle = isDark ? "rgba(255,255,255,0.08)" : "rgba(26,14,0,0.09)";
                    const bgIdle = isDark ? "rgba(255,255,255,0.02)" : "rgba(26,14,0,0.02)";
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => toggleSelected(task.id)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "12px",
                          background: checked ? "rgba(200,168,107,0.07)" : bgIdle,
                          border: `1px solid ${checked ? "rgba(200,168,107,0.35)" : borderIdle}`,
                          borderRadius: "10px", padding: "12px 14px",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                      >
                        <div style={{
                          width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "2px",
                          border: `1.5px solid ${checked ? "#c8a86b" : "rgba(200,168,107,0.3)"}`,
                          background: checked ? "rgba(200,168,107,0.18)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {checked && <Check size={10} style={{ color: "#c8a86b" }} />}
                        </div>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: "1.5", color: checked ? "#d4cec4" : "rgba(248,248,246,0.4)", margin: 0, flex: 1 }}>
                          {task.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.4)", margin: "2px 0 0" }}>
                  Unchecked tasks are deleted when you start the recap.
                </p>
              </div>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => setChoice("delete")}
              style={{
                background: choice === "delete" ? "rgba(248,113,113,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${choice === "delete" ? "rgba(248,113,113,0.35)" : "rgba(200,168,107,0.18)"}`,
                borderRadius: "12px", padding: "14px 16px",
                textAlign: "left", width: "100%",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (choice !== "delete") { e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)"; e.currentTarget.style.background = "rgba(248,113,113,0.04)"; } }}
              onMouseLeave={(e) => { if (choice !== "delete") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
            >
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.45", color: choice === "delete" ? "#fca5a5" : textPrimary, margin: 0 }}>Remove them — this chapter is done</p>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.5)", margin: "5px 0 0" }}>Incomplete tasks are deleted. The chapter closes clean.</p>
            </button>
          </>
        )}

        {error && <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "#f87171", margin: 0 }}>{error}</p>}

        {/* Start the recap — same plain card style as the menu options */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || (hasIncompleteTasks && !choice)}
          style={{
            background: isPending || (hasIncompleteTasks && !choice) ? surface : surfaceGold,
            border: `1px solid rgba(200,168,107,${isPending || (hasIncompleteTasks && !choice) ? "0.12" : "0.45"})`,
            borderRadius: "12px", padding: "14px 16px",
            display: "flex", alignItems: "center", gap: "10px",
            cursor: isPending || (hasIncompleteTasks && !choice) ? "default" : "pointer",
            textAlign: "left", width: "100%",
            transition: "background 0.15s, border-color 0.15s",
            opacity: isPending || (hasIncompleteTasks && !choice) ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!isPending && !(hasIncompleteTasks && !choice)) e.currentTarget.style.background = "rgba(200,168,107,0.16)"; }}
          onMouseLeave={(e) => { if (!isPending && !(hasIncompleteTasks && !choice)) e.currentTarget.style.background = surfaceGold; }}
        >
          {isPending && <LoaderCircle size={14} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite", flexShrink: 0 }} />}
          <div>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.45", color: textPrimary, margin: 0 }}>
              {isPending ? "Working…" : "Start the recap"}
            </p>
          </div>
        </button>
      </div>
    </>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function CassBoardDrawer({
  open,
  project,
  board,
  columns,
  templates,
  tasks,
  breakupTask,
  completedChapterMode,
  retroNudge = false,
  onStartRetro,
  initialMode,
  fromOnboarding = false,
  chapterNumber = 1,
  chapterDaysLeft = null,
  onNavigateToLatest,
  onPlanChapters,
  onRefocus,
  onEndChapterConfirmed,
  onRetroComplete,
  onClose,
  onTasksAdded,
  onTaskDeleted,
}: {
  open: boolean;
  project: Project;
  board: Board;
  columns: BoardColumn[];
  templates: WorkflowTemplate[];
  tasks: Task[];
  breakupTask?: Task | null;
  completedChapterMode?: boolean;
  retroNudge?: boolean;
  onStartRetro?: () => void;
  initialMode?: "retro" | "new_chapter" | "end_chapter";
  fromOnboarding?: boolean;
  chapterNumber?: number;
  chapterDaysLeft?: number | null;
  onNavigateToLatest?: () => void;
  onPlanChapters?: () => void;
  onRefocus?: () => void;
  onEndChapterConfirmed?: (nextChapterId: string | null) => void;
  onRetroComplete?: (data: { chapterStory: string; pullQuote: string; headline?: string; subheadline?: string; chapterType?: string }) => void;
  onClose: () => void;
  onTasksAdded: () => void;
  onTaskDeleted?: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const proposalsStartRef = useRef<HTMLDivElement | null>(null);

  // ── Theme ────────────────────────────────────────────────────────────────────
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const drawerBg    = isDark
    ? "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%), #0a0a0a"
    : "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.07) 0%, transparent 60%), #faf9f4";
  const textPrimary   = isDark ? "#d4cec4"               : "rgba(26,14,0,0.88)";
  const textSecondary = isDark ? "rgba(212,206,196,0.6)"  : "rgba(26,14,0,0.6)";
  const textMuted     = isDark ? "rgba(212,206,196,0.45)" : "rgba(26,14,0,0.38)";
  const surface       = isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)";
  const surfaceGold   = isDark ? "rgba(200,168,107,0.07)" : "rgba(200,168,107,0.10)";
  const borderGoldDim = "rgba(200,168,107,0.22)";
  const borderSubtle  = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.08)";
  const btnBg         = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.06)";
  const btnBgHover    = isDark ? "rgba(255,255,255,0.1)"  : "rgba(26,14,0,0.1)";
  const btnColor      = isDark ? "#888"                   : "rgba(26,14,0,0.4)";
  const btnColorHover = isDark ? "#d4cec4"                : "rgba(26,14,0,0.8)";
  const inputBg       = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.04)";
  const dividerColor  = isDark ? "rgba(200,168,107,0.08)" : "rgba(200,168,107,0.12)";
  const shadowColor   = isDark ? "rgba(0,0,0,0.4)"        : "rgba(0,0,0,0.18)";

  // A chapter whose retro has already been completed — the regular "add
  // something new" menu should only offer logging missed past work.
  const isPastChapter = Boolean(board.retroCompletedAt);
  const menuQuestionText = isPastChapter
    ? "You've already completed this chapter. Do you need to add something that was missed?"
    : MENU_QUESTION;
  const visibleMenuOptions = isPastChapter
    ? MENU_OPTIONS.filter((opt) => opt.key === "chronicle")
    : MENU_OPTIONS.filter((opt) => opt.key !== "chronicle");

  // Shadow module-level constants with theme-aware versions
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const CASS_B: React.CSSProperties = {
    background: surface,
    border: `1px solid ${borderGoldDim}`,
    borderRadius: "12px 12px 12px 2px",
    padding: "12px 16px",
    fontFamily: "'Literata', Georgia, serif",
    fontSize: "16px",
    lineHeight: "1.7",
    color: textPrimary,
    maxWidth: "92%",
  };
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const USER_B: React.CSSProperties = {
    background: "rgba(200,168,107,0.1)",
    border: "1px solid rgba(200,168,107,0.22)",
    borderRadius: "18px 18px 4px 18px",
    padding: "10px 14px",
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "15px",
    lineHeight: "1.55",
    color: isDark ? "#e8c789" : "#8a6d2f",
    maxWidth: "80%",
  };

  // ── Menu state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<BoardMode>("menu");
  const [menuDisplayed, setMenuDisplayed] = useState("");
  const [optionsReady, setOptionsReady] = useState(false);
  const [menuSelected, setMenuSelected] = useState<string | null>(null);
  const [chatSubMode, setChatSubMode] = useState<ChatSubMode>("tasks");

  // ── Chat (tasks) state ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [chatError, setChatError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AICassBoardDialogue["status"]>("chatting");

  // ── Chronicle state ───────────────────────────────────────────────────────────
  const [chronicleMethod, setChronicleMethod] = useState<"talk" | "voice" | null>(null);

  // ── Inline voice state (chronicle-voice — logging already-completed work) ────
  const [voicePhase, setVoicePhase] = useState<"column_select" | "voice" | "text_input" | "processing">("column_select");
  const [voiceColumn, setVoiceColumn] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState("");
  const [voiceFinalTranscript, setVoiceFinalTranscript] = useState<string | null>(null);
  const [voiceTextInput, setVoiceTextInput] = useState("");
  const voiceRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef("");
  const voicePauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ── Dictation into the chat textarea (tasks/braindump mode) ──────────────────
  const [chatMicListening, setChatMicListening] = useState(false);
  const chatMicRecognitionRef = useRef<any>(null);
  const chatMicTranscriptRef = useRef("");
  const chatMicPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Review / confirm state ────────────────────────────────────────────────────
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ProposedTask[]>([]);
  const [templateDraft, setTemplateDraft] = useState<AICassBoardDialogue["templateDraft"] | null>(null);
  const [suggestSaveAsTemplate, setSuggestSaveAsTemplate] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);
  const [newChapterDeclined, setNewChapterDeclined] = useState(false);

  // ── Template save state ───────────────────────────────────────────────────────
  const [templateSaving, startTemplateSaveTransition] = useTransition();
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // ── Refocus state ─────────────────────────────────────────────────────────────
  const [rfPhase, setRfPhase] = useState<RefocusPhase>("chat");
  const [rfMessages, setRfMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [rfDraft, setRfDraft] = useState("");
  const [rfTriageMap, setRfTriageMap] = useState<Record<string, TriageDecision>>({});
  const [rfError, setRfError] = useState<string | null>(null);
  const [rfDoneCount, setRfDoneCount] = useState<{ deleted: number; moved: number } | null>(null);
  const [rfIsPending, startRfTransition] = useTransition();
  const [rfIsSaving, startRfSaveTransition] = useTransition();

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setDraft("");
    setChatError(null);
    setAiStatus("chatting");
    setProposedTasks([]);
    setReviewTasks([]);
    setTemplateDraft(null);
    setSuggestSaveAsTemplate(false);
    setSavedOk(false);
    setTemplateSaved(false);
    setTemplateError(null);
    setChronicleMethod(null);
    setRfPhase("chat");
    setRfMessages([]);
    setRfDraft("");
    setRfTriageMap({});
    setRfError(null);
    setRfDoneCount(null);
    setNewChapterDeclined(false);

    // If arriving from onboarding, show the welcome message first
    if (fromOnboarding) {
      setMode("onboarding_welcome");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // If forced into retro mode, skip straight to that experience
    if (initialMode === "retro") {
      setMode("retro");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // Starting a new chapter requires ending the current one first — explain that
    // before anything else, rather than dropping them into the normal menu.
    if (initialMode === "new_chapter") {
      setMode("new_chapter_prompt");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // Triggered from the chapter-focus-bar "End chapter" link — skip the
    // additive "add something" menu entirely and go straight there.
    if (initialMode === "end_chapter") {
      setChatSubMode("end_chapter");
      setMode("chat");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // All tasks done but retro not yet started — nudge toward the retro
    if (retroNudge) {
      setMode("retro_nudge");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // If this is a completed chapter, show the "what's next?" screen
    if (completedChapterMode) {
      setMode("completed");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      return;
    }

    // If we have a breakup task, skip the menu and auto-enter breakup chat
    if (breakupTask) {
      setMode("chat");
      setChatSubMode("breakup");
      setMenuDisplayed("");
      setOptionsReady(false);
      setMenuSelected(null);
      const openingMsg: Msg = {
        role: "user",
        content: `I want to break up the task: "${breakupTask.title}"`,
      };
      setTimeout(() => {
        setMessages([openingMsg]);
        startTransition(async () => {
          try {
            const result = await callApiBreakup([openingMsg]);
            applyAiResult(result, [openingMsg]);
          } catch (err) {
            setChatError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }, 120);
      return;
    }

    setMode("menu");
    setMenuDisplayed("");
    setOptionsReady(false);
    setMenuSelected(null);
    setChatSubMode(isPastChapter ? "chronicle" : "tasks");

    let i = 0;
    const id = setInterval(() => {
      i++;
      setMenuDisplayed(menuQuestionText.slice(0, i));
      if (i >= menuQuestionText.length) {
        clearInterval(id);
        setTimeout(() => setOptionsReady(true), 180);
      }
    }, 26);
    return () => { clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => {
      // When proposals first arrive, scroll so the Cass reply is visible at the top —
      // not all the way to the bottom card. If no proposals yet, scroll to bottom as usual.
      if (proposalsStartRef.current && reviewTasks.length > 0) {
        proposalsStartRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    });
  }, [messages, reviewTasks]);

  // Scroll to bottom when entering chat so the menu history scrolls away (onboarding feel)
  useEffect(() => {
    if (mode === "chat") {
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [mode]);

  // ── Mode selection from menu ──────────────────────────────────────────────────
  function selectMode(sub: ChatSubMode) {
    const label = MENU_OPTIONS.find((o) => o.key === sub)?.label ?? sub;
    setMenuSelected(label);
    setChatSubMode(sub);
    setTimeout(() => setMode("chat"), 320);

    if (sub === "tasks") {
      // Send context to the API but don't add the synthetic user message to UI —
      // menuSelected already shows the user's choice as a gray bubble above.
      // "braindump" mode: Cass listens and only clarifies when something's too
      // vague, rather than running a structured interview.
      const openingMsg: Msg = { role: "user", content: "I have some things on my mind for this chapter." };
      setTimeout(() => {
        setMessages([]);
        startTransition(async () => {
          try {
            const result = await callApi([openingMsg], "braindump");
            applyAiResult(result, []);
          } catch (err) {
            setChatError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }, 340);
    }
    // chronicle: just enter chat mode — sub-choice screen handles the rest
  }

  // ── Text chat helpers ─────────────────────────────────────────────────────────
  // The merged "tell me what's on your mind" entry point uses the "braindump"
  // dialogue mode — Cass listens and only asks a clarifying question when
  // something is too vague, rather than running a structured interview.
  // Chronicle's "talk it out" sub-flow keeps the more deliberate "tasks" prompt.
  function sendMessage() {
    sendMessageWithText(draft);
  }

  function sendMessageWithText(text: string) {
    const content = text.trim();
    if (!content || isPending || isSaving) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setChatError(null);
    startTransition(async () => {
      try {
        const result = chatSubMode === "breakup"
          ? await callApiBreakup(next)
          : await callApi(next, chatSubMode === "chronicle" ? "tasks" : "braindump");
        applyAiResult(result, next);
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  // ── Dictation into the chat textarea ──────────────────────────────────────────
  // Lets the user speak their brain dump instead of typing it. Auto-sends after
  // a pause, same feel as the old dedicated voice-memo recorder.
  function stopChatMic() {
    if (chatMicPauseTimerRef.current) clearTimeout(chatMicPauseTimerRef.current);
    if (chatMicRecognitionRef.current) {
      chatMicRecognitionRef.current.onresult = null;
      chatMicRecognitionRef.current.onend = null;
      chatMicRecognitionRef.current.onerror = null;
      try { chatMicRecognitionRef.current.stop(); } catch { /* ok */ }
      chatMicRecognitionRef.current = null;
    }
    setChatMicListening(false);
  }

  function scheduleChatMicAutoSend(text: string) {
    if (chatMicPauseTimerRef.current) clearTimeout(chatMicPauseTimerRef.current);
    chatMicPauseTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        stopChatMic();
        sendMessageWithText(text.trim());
      }
    }, 1800);
  }

  function startChatMic() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setChatError("Speech recognition isn't supported in this browser."); return; }
    setChatError(null);
    chatMicTranscriptRef.current = "";
    setDraft("");
    const rec = new SR();
    rec.continuous = !isIOS;
    rec.interimResults = true;
    rec.lang = "en-US";
    chatMicRecognitionRef.current = rec;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          chatMicTranscriptRef.current += (chatMicTranscriptRef.current ? " " : "") + e.results[i][0].transcript.trim();
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setDraft(chatMicTranscriptRef.current + (interim ? (chatMicTranscriptRef.current ? " " : "") + interim : ""));
      scheduleChatMicAutoSend(chatMicTranscriptRef.current);
    };
    rec.onend = () => {
      if (chatMicPauseTimerRef.current) clearTimeout(chatMicPauseTimerRef.current);
      setChatMicListening(false);
      if (isIOS && chatMicTranscriptRef.current.trim()) {
        sendMessageWithText(chatMicTranscriptRef.current.trim());
      }
    };
    rec.onerror = () => { if (chatMicPauseTimerRef.current) clearTimeout(chatMicPauseTimerRef.current); setChatMicListening(false); };
    rec.start();
    setChatMicListening(true);
  }

  function toggleChatMic() {
    if (chatMicListening) stopChatMic(); else startChatMic();
  }

  async function callApi(msgs: Msg[], sub: "tasks" | "braindump" | "breakup"): Promise<AICassBoardDialogue> {
    const res = await fetch("/api/chat/board-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, boardId: board.id, mode: sub, messages: msgs }),
    });
    const data = await res.json() as AICassBoardDialogue & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function callApiBreakup(msgs: Msg[]): Promise<AICassBoardDialogue> {
    if (!breakupTask) throw new Error("No breakup task.");
    const columnName = columns.find((c) => c.id === breakupTask.columnId)?.name ?? "Do This Week";
    const res = await fetch("/api/chat/board-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        boardId: board.id,
        mode: "breakup",
        messages: msgs,
        breakupTask: {
          title: breakupTask.title,
          description: breakupTask.description ?? null,
          columnName,
        },
      }),
    });
    const data = await res.json() as AICassBoardDialogue & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  function applyAiResult(result: AICassBoardDialogue, prevMsgs: Msg[]) {
    setAiStatus(result.status);
    setMessages([...prevMsgs, { role: "assistant", content: result.reply }]);
    if (result.status === "ready_for_review" && result.tasks.length > 0) {
      const stamped = result.tasks.map((t, i) => ({ ...t, id: `proposed-${i}` }));
      setProposedTasks(stamped);
      setReviewTasks(stamped);
      setSuggestSaveAsTemplate(result.suggestSaveAsTemplate);
      if (result.suggestSaveAsTemplate && result.templateDraft?.name) {
        setTemplateDraft(result.templateDraft);
      }
    }
  }

  // ── Voice (chronicle) cards ready callback ────────────────────────────────────
  const handleVoiceCardsReady = useCallback((tasks: ProposedTask[], _transcript: string, _columnName: string) => {
    const stamped = tasks.map((t, i) => ({ ...t, id: t.id ?? `voice-${i}-${Date.now()}` }));
    setProposedTasks((prev) => [...prev, ...stamped]);
    setReviewTasks((prev) => [...prev, ...stamped]);
    setSuggestSaveAsTemplate(false);
  }, []);

  // ── Inline voice helpers ──────────────────────────────────────────────────────
  function stopVoiceListening() {
    if (voicePauseTimerRef.current) clearTimeout(voicePauseTimerRef.current);
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.onresult = null;
      voiceRecognitionRef.current.onend = null;
      voiceRecognitionRef.current.onerror = null;
      try { voiceRecognitionRef.current.stop(); } catch { /* ok */ }
      voiceRecognitionRef.current = null;
    }
    setVoiceListening(false);
    setVoiceLiveTranscript("");
  }

  // Used by chronicle's "already done" voice memo, which always forces Done.
  function processVoiceTranscript(transcript: string, forcedColumn?: string) {
    setVoiceFinalTranscript(transcript);
    setVoiceLiveTranscript("");
    setVoicePhase("processing");
    startTransition(async () => {
      try {
        const res = await fetch("/api/voice/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, boardId: board.id, transcript }),
        });
        const payload = await res.json() as { tasks?: ProposedTask[]; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Processing failed.");
        const tasks = (payload.tasks ?? []).map((t: ProposedTask, i: number) => ({
          ...t,
          id: t.id ?? `voice-${i}`,
          suggestedColumn: forcedColumn || t.suggestedColumn,
        }));
        handleVoiceCardsReady(tasks, transcript, forcedColumn ?? "");
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Something went wrong.");
        setVoicePhase("voice");
      }
    });
  }

  function scheduleVoiceAutoSubmit(text: string, col: string) {
    if (voicePauseTimerRef.current) clearTimeout(voicePauseTimerRef.current);
    voicePauseTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        stopVoiceListening();
        processVoiceTranscript(text.trim(), col);
      }
    }, 1800);
  }

  function startVoiceListening() {
    const voiceCol = voiceColumn; // capture current column
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceError("Speech recognition isn't supported in this browser."); return; }
    setVoiceError(null);
    setVoiceLiveTranscript("");
    voiceTranscriptRef.current = "";
    const rec = new SR();
    rec.continuous = !isIOS;
    rec.interimResults = true;
    rec.lang = "en-US";
    voiceRecognitionRef.current = rec;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          voiceTranscriptRef.current += (voiceTranscriptRef.current ? " " : "") + e.results[i][0].transcript.trim();
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      // Show final + any in-progress interim text on screen
      const display = voiceTranscriptRef.current + (interim ? (voiceTranscriptRef.current ? " " : "") + interim : "");
      setVoiceLiveTranscript(display);
      scheduleVoiceAutoSubmit(voiceTranscriptRef.current, voiceCol);
    };
    rec.onend = () => {
      if (voicePauseTimerRef.current) clearTimeout(voicePauseTimerRef.current);
      setVoiceListening(false);
      if (isIOS && voiceTranscriptRef.current.trim()) {
        processVoiceTranscript(voiceTranscriptRef.current.trim(), voiceCol);
      }
    };
    rec.onerror = () => { if (voicePauseTimerRef.current) clearTimeout(voicePauseTimerRef.current); setVoiceListening(false); };
    rec.start();
    setVoiceListening(true);
  }

  function toggleVoiceListening() {
    if (voiceListening) stopVoiceListening(); else startVoiceListening();
  }

  // ── Save tasks ────────────────────────────────────────────────────────────────
  function handleAddTasks() {
    if (reviewTasks.length === 0 || isSaving) return;
    const columnMap = columns.map((c) => ({ id: c.id, name: c.name }));
    startSaveTransition(async () => {
      try {
        await createBrainDumpCardsAction({
          projectId: project.id,
          boardId: board.id,
          conversationId: null,
          columnMap,
          cards: reviewTasks.map((t) => ({
            title: t.title,
            column: t.suggestedColumn,
            context: t.description ?? "",
            rawQuote: "",
            priority: (t as any).priority ?? null,
            dueDate: (t as any).dueDate ?? null,
            assigneeName: (t as any).assigneeName ?? null,
          })),
        });
        // In breakup mode, delete the original task after creating the subtasks
        if (chatSubMode === "breakup" && breakupTask) {
          await deleteTaskAction({
            taskId: breakupTask.id,
            projectId: project.id,
            boardId: board.id,
          });
          onTaskDeleted?.();
        }

        // Persist conversation to board history (fire-and-forget, non-blocking)
        if (messages.length > 0) {
          const entry: BoardConversationEntry = {
            id: crypto.randomUUID(),
            mode: chatSubMode as BoardConversationEntry["mode"],
            label: chatSubMode === "breakup" && breakupTask
              ? `Broke up: "${breakupTask.title}"`
              : "Task Planning",
            completedAt: new Date().toISOString(),
            messages,
            taskCount: reviewTasks.length,
          };
          saveBoardConversationAction({ boardId: board.id, projectId: project.id, entry }).catch(() => {/* non-critical */});
        }

        setSavedOk(true);
        onTasksAdded();
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Failed to add tasks.");
      }
    });
  }

  // ── Save template ─────────────────────────────────────────────────────────────
  function handleSaveTemplate() {
    if (!templateDraft?.name || templateSaving) return;
    startTemplateSaveTransition(async () => {
      try {
        await saveWorkflowTemplateAction({
          name: templateDraft.name,
          triggerPhrase: templateDraft.triggerPhrase,
          description: templateDraft.description,
          steps: reviewTasks.map((t, i) => ({
            title: t.title,
            description: t.description ?? "",
            suggestedColumn: t.suggestedColumn,
            priority: t.priority,
            position: i,
          })),
        });
        setTemplateSaved(true);
        setTemplateError(null);
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : "Failed to save template.");
      }
    });
  }

  // ── Refocus helpers ──────────────────────────────────────────────────────────

  const rfIncompleteTasks = tasks.filter((t) => {
    const col = columns.find((c) => c.id === t.columnId);
    return col?.name.toLowerCase() !== "done";
  });

  function enterRefocusMode() {
    const ageDays = getChapterAgeDays(board) ?? 0;
    const opener = buildRfOpener(board, rfIncompleteTasks, ageDays);
    setRfMessages([{ role: "assistant", content: opener }]);
    setRfPhase("chat");
    setRfDraft("");
    setRfTriageMap({});
    setRfError(null);
    setRfDoneCount(null);
    setMenuSelected("Refocus");
    setMode("refocus");
  }

  function sendRfMessage() {
    const content = rfDraft.trim();
    if (!content || rfIsPending) return;
    const next = [...rfMessages, { role: "user" as const, content }];
    setRfMessages(next);
    setRfDraft("");
    setRfError(null);
    startRfTransition(async () => {
      try {
        const res = await fetch("/api/chat/refocus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, chapterId: board.id, messages: next }),
        });
        const payload = await res.json() as { reply: string; done: boolean; keepTaskIds: string[]; deferTaskIds: string[]; rationale: string; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Refocus failed.");
        const withReply = [...next, { role: "assistant" as const, content: payload.reply }];
        setRfMessages(withReply);
        if (payload.done) {
          const map: Record<string, TriageDecision> = {};
          for (const t of rfIncompleteTasks) {
            if (payload.deferTaskIds.includes(t.id)) map[t.id] = "move";
            else map[t.id] = "keep";
          }
          setRfTriageMap(map);
          setRfPhase("triage");
        }
      } catch (err) {
        setRfError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleRfConfirm() {
    const deleteIds = Object.entries(rfTriageMap).filter(([, v]) => v === "delete").map(([k]) => k);
    const moveIds   = Object.entries(rfTriageMap).filter(([, v]) => v === "move").map(([k]) => k);
    setRfError(null);
    startRfSaveTransition(async () => {
      try {
        if (deleteIds.length > 0) {
          await Promise.all(deleteIds.map((id) => deleteTaskAction({ taskId: id, projectId: project.id, boardId: board.id })));
        }
        if (moveIds.length > 0) {
          await deferTasksToNextChapterAction({ projectId: project.id, boardId: board.id, taskIds: moveIds });
        }
        onTasksAdded();
        setRfDoneCount({ deleted: deleteIds.length, moved: moveIds.length });
        setRfPhase("retro");
      } catch (err) {
        setRfError(err instanceof Error ? err.message : "Failed to save changes.");
      }
    });
  }

  const hasProposals = proposedTasks.length > 0;
  const isBreakupMode = chatSubMode === "breakup";
  const isEndChapterMode = chatSubMode === "end_chapter";
  const isChronicleMode = chatSubMode === "chronicle";

  // Cass anim in the header: playing while AI is thinking, talking while typewriting text
  const isTypewriting = menuDisplayed.length > 0 && menuDisplayed.length < MENU_QUESTION.length;
  const headerCassAnim: CassAnimState =
    mode === "refocus" ? (rfIsPending || rfIsSaving ? "playing" : "idle") :
    isPending ? "playing" : isTypewriting ? "talking" : "idle";

  // Progress bar percentage
  const progressPercent =
    mode === "refocus" && rfPhase === "chat"   ? 25 :
    mode === "refocus" && rfPhase === "triage" ? 55 :
    mode === "refocus" && rfPhase === "retro"  ? 80 :
    mode === "menu" ? 15 :
    mode === "completed" ? 100 :
    savedOk ? 90 :
    aiStatus === "ready_for_review" ? 72 :
    55;

  return (
    <>
      <style>{`
        @keyframes cassBoardCaretBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0; } }
        @keyframes cassBoardOptionIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cassBoardSpin { to { transform: rotate(360deg); } }
        @keyframes cassBoardPulse { 0%, 100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes cassBoardRecordPulse { 0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 8px 24px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 0 14px rgba(239,68,68,0.08), 0 8px 32px rgba(239,68,68,0.4); } }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: "rgba(0,0,0,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.3s ease" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[38%] lg:min-w-[420px]"
        style={{
          background: drawerBg,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? `-8px 0 40px ${shadowColor}` : "none",
        }}
        aria-hidden={!open}
      >
        {/* Progress bar — only for retro/refocus/lifecycle flows, not for menu/chat task flows */}
        {(mode === "refocus" || mode === "completed") && <CassProgressBar percent={progressPercent} />}

        {/* ── Header — hidden during retro/onboarding_welcome (those components own the stage) ── */}
        {!(mode === "refocus" && rfPhase === "retro") && mode !== "retro" && mode !== "onboarding_welcome" && (
        <div style={{ flexShrink: 0, position: "relative" }}>
          {/* Authored By banner */}
          <div style={{ background: isDark ? "#0a0a0a" : "#f0ebe0", borderBottom: `1px solid ${isDark ? "#1e1e1e" : "rgba(0,0,0,0.08)"}`, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src="/icons/authored-by-tape-icon.png"
              alt="Authored By"
              style={{ width: "auto", height: "52px", objectFit: "contain" }}
            />
            {/* Back button */}
            {((mode === "chat" && !savedOk) || (mode === "refocus" && rfPhase === "chat")) && (
              <div style={{ position: "absolute", top: "50%", left: "16px", transform: "translateY(-50%)" }}>
                <TapeButton
                  type="button"
                  onClick={(mode === "refocus" && rfPhase === "chat")
                    ? () => { setMode("menu"); setMenuSelected(null); }
                    : isBreakupMode
                      ? onClose
                      : () => { setMode("menu"); setMenuSelected(null); setMessages([]); setAiStatus("chatting"); setProposedTasks([]); setReviewTasks([]); setSavedOk(false); setChronicleMethod(null); }}
                  variant="ghost"
                  size="sm"
                >{isBreakupMode ? "✕ cancel" : "← back"}</TapeButton>
              </div>
            )}
            {/* Close button */}
            <button
              type="button" onClick={onClose} aria-label="Close"
              style={{ position: "absolute", top: "50%", right: "16px", transform: "translateY(-50%)", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: btnBg, color: btnColor, border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = btnBgHover; e.currentTarget.style.color = btnColorHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = btnBg; e.currentTarget.style.color = btnColor; }}
            ><X size={14} /></button>
          </div>
          {/* Label bar */}
          <div style={{ background: isDark ? "#2a2208" : "#c8a86b", padding: "6px 16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: isDark ? "rgba(200,168,107,0.85)" : "rgba(255,255,255,0.9)" }}>
              {mode === "menu" ? "Add something new" :
               chatSubMode === "end_chapter" ? "End Chapter" :
               chatSubMode === "chronicle" ? "Already Done" :
               mode === "completed" ? "What's Next" :
               mode === "retro_nudge" ? "Chapter Recap" :
               mode === "refocus" ? "Refocus" :
               mode === "new_chapter_prompt" ? "New Chapter" :
               "Add Tasks"}
            </span>
          </div>
        </div>
        )}

        {/* ── Unified menu + chat scroll container ── */}
        {/* Shared by "menu" mode and "chat" mode (tasks/breakup proposals).
            The Cass avatar + question stay at the top; selecting an option causes the
            content below it to scroll into view — matching the onboarding scroll feel. */}
        {(mode === "menu" || (mode === "chat" && !isEndChapterMode)) && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", scrollbarWidth: "none" }}>

            {/* Cass avatar — always at top */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <CassRecorder animState={mode === "menu" ? headerCassAnim : (isPending ? "playing" : "talking")} size="sm" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)" }}>
                Cass · Story Guide
              </span>
            </div>

            {/* Cass question — plain Lora, left-aligned, no bubble */}
            <div style={{ maxWidth: "85%", width: "100%" }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
                {mode === "menu" ? (
                  <>
                    {menuDisplayed}
                    {menuDisplayed.length > 0 && menuDisplayed.length < menuQuestionText.length && (
                      <span style={{ opacity: 0.5, animation: "cassBoardCaretBlink 0.9s step-end infinite" }}>▌</span>
                    )}
                  </>
                ) : menuQuestionText}
              </p>
            </div>

            {/* Options — shown only in menu mode, before selection */}
            {mode === "menu" && optionsReady && !menuSelected && (
              <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "8px" }}>
                {onRefocus ? (
                  <button
                    type="button"
                    onClick={enterRefocusMode}
                    style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.22)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(251,146,60,0.5)"; e.currentTarget.style.background = "rgba(251,146,60,0.09)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(251,146,60,0.22)"; e.currentTarget.style.background = "rgba(251,146,60,0.04)"; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(251,146,60,0.6)", background: "transparent" }} />
                    <div>
                      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "rgba(251,180,80,0.9)", margin: 0, lineHeight: "1.4" }}>We need to refocus this chapter.</p>
                    </div>
                  </button>
                ) : (
                  <>
                    {visibleMenuOptions.map((opt, i) => {
                      const isBlocked = chapterDaysLeft !== null && chapterDaysLeft <= 0 && opt.key === "tasks";
                      return (
                        <div key={opt.key} style={{ animation: `cassBoardOptionIn 0.28s ease ${i * 100}ms forwards`, opacity: 0 }}>
                          <button
                            type="button"
                            onClick={isBlocked ? undefined : () => selectMode(opt.key)}
                            disabled={isBlocked}
                            style={{
                              background: isBlocked ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(26,14,0,0.02)") : surface,
                              border: `1px solid ${isBlocked ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(26,14,0,0.08)") : "rgba(200,168,107,0.18)"}`,
                              borderRadius: "12px", padding: "14px 18px", textAlign: "left", width: "100%",
                              cursor: isBlocked ? "default" : "pointer",
                            }}
                            onMouseEnter={(e) => { if (!isBlocked) { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; } }}
                            onMouseLeave={(e) => { if (!isBlocked) { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; } }}
                          >
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.45", color: isBlocked ? textMuted : textPrimary, margin: 0 }}>
                              {opt.label}
                            </p>
                            {isBlocked && (
                              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", lineHeight: "1.5", color: isDark ? "rgba(200,168,107,0.4)" : "rgba(26,14,0,0.38)", margin: "5px 0 0" }}>
                                We&apos;ve run out of time for this chapter. Finish things up and we&apos;ll add new tasks to the next chapter.
                              </p>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Selected option — user gray bubble (shown in both menu transition + chat history) */}
            {menuSelected && (
              <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", maxWidth: "85%" }}>
                <div style={USER_B}>
                  {isChronicleMode && chronicleMethod === "voice"
                    ? "Add tasks I've already completed to the done column"
                    : menuSelected}
                </div>
              </div>
            )}

            {/* ── Chronicle sub-choice ── */}
            {mode === "chat" && isChronicleMode && !chronicleMethod && (
              <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
                  How would you like to add them?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { key: "talk" as const, label: "Talk it out with Cass" },
                    { key: "voice" as const, label: "Voice memo" },
                  ].map((opt, i) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setChronicleMethod(opt.key);
                        if (opt.key === "talk") {
                          const openingMsg: Msg = { role: "user", content: "I want to add tasks that I've already completed to my Done column." };
                          setMessages([]);
                          startTransition(async () => {
                            const result = await callApi([openingMsg], "tasks");
                            applyAiResult(result, []);
                          });
                        } else {
                          // voice: skip column select, go straight to Done
                          const doneCol = columns.find(c => c.name === "Done")?.name ?? "Done";
                          setVoiceColumn(doneCol);
                          setVoicePhase("voice");
                          setVoiceListening(false);
                          setVoiceError(null);
                        }
                      }}
                      style={{
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)",
                        border: "1px solid rgba(200,168,107,0.25)",
                        borderRadius: "12px", padding: "14px 18px", textAlign: "left",
                        fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600,
                        color: isDark ? "#d4cec4" : "rgba(26,14,0,0.88)", cursor: "pointer",
                        transition: "background 0.15s, border-color 0.15s",
                        animation: `cassBoardOptionIn 0.28s ease ${i * 80}ms both`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.08)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)"; }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Inline voice flow (chronicle-voice — logging already-completed work) ── */}
            {mode === "chat" && isChronicleMode && chronicleMethod === "voice" && !savedOk && (
              <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Recorder — Cass sorts each task into a column automatically */}
                {voicePhase !== "column_select" && (
                  <>
                    {/* User bubble showing selected column — hidden for all voice flows (already combined into menuSelected bubble above) */}

                    {/* Cass confirms + mic UI */}
                    {voicePhase === "voice" && (
                      <>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: textPrimary, margin: 0 }}>
                          Tell me about the work you&apos;ve already completed.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "12px 0" }}>
                          {/* Live transcript — appears above mic */}
                          {voiceLiveTranscript ? (
                            <p style={{
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "14px", lineHeight: "1.65",
                              color: textPrimary,
                              margin: 0, textAlign: "center",
                              width: "100%",
                            }}>
                              {voiceLiveTranscript}
                            </p>
                          ) : (
                            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: voiceListening ? "#f5c84a" : (isDark ? "#888" : "rgba(26,14,0,0.45)"), margin: 0, transition: "color 0.2s" }}>
                              {voiceListening ? "Listening…" : "Tap to record"}
                            </p>
                          )}
                          {/* Mic button */}
                          <button
                            type="button"
                            {...(isIOS ? {
                              onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (!voiceListening) startVoiceListening(); },
                              onPointerUp:   (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (voiceListening) stopVoiceListening(); },
                              onPointerCancel: () => { if (voiceListening) stopVoiceListening(); },
                            } : { onClick: toggleVoiceListening })}
                            aria-label={voiceListening ? "Stop recording" : "Start recording"}
                            style={{
                              width: "88px", height: "88px", borderRadius: "50%",
                              background: voiceListening ? "rgba(245,200,74,0.15)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.07)"),
                              border: `2px solid ${voiceListening ? "#f5c84a" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(26,14,0,0.18)")}`,
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                              boxShadow: voiceListening ? "0 0 0 12px rgba(245,200,74,0.08), 0 0 0 24px rgba(245,200,74,0.04)" : "none",
                              userSelect: "none", WebkitUserSelect: "none",
                            }}
                          >
                            <svg width="28" height="24" viewBox="0 0 16 14" fill="none" aria-hidden="true">
                              {[{ x: 0, h: 4, y: 5 }, { x: 3, h: 8, y: 3 }, { x: 6, h: 14, y: 0 }, { x: 9, h: 8, y: 3 }, { x: 12, h: 4, y: 5 }].map((bar, i) => (
                                <rect key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
                                  fill={voiceListening ? "#f5c84a" : (isDark ? "#666" : "rgba(26,14,0,0.45)")}
                                  style={voiceListening ? { animation: `chat-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
                                />
                              ))}
                            </svg>
                          </button>
                          {/* Switch to text input */}
                          <button
                            type="button"
                            onClick={() => { stopVoiceListening(); setVoiceTextInput(""); setVoiceFinalTranscript(null); setVoiceLiveTranscript(""); setVoicePhase("text_input"); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.2)" : "rgba(26,14,0,0.28)", transition: "color 0.15s", padding: 0 }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.5)" : "rgba(26,14,0,0.6)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.2)" : "rgba(26,14,0,0.28)"; }}
                          >
                            Type it out instead
                          </button>
                          {voiceError && <p style={{ color: "#ff6b6b", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", margin: 0, textAlign: "center" }}>{voiceError}</p>}
                        </div>
                      </>
                    )}

                    {/* Captured transcript — persists as user bubble after processing starts */}
                    {voiceFinalTranscript && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={USER_B}>{voiceFinalTranscript}</div>
                      </div>
                    )}

                    {/* Processing state — inline Cass message + typing dots */}
                    {voicePhase === "processing" && !hasProposals && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "cassBoardOptionIn 0.3s ease forwards" }}>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: textPrimary, margin: 0 }}>
                          Generating your sticky notes…
                        </p>
                        <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "16px" }}>
                          {[0, 1, 2].map((d) => (
                            <span key={d} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a86b", display: "block", animation: `cassBoardCaretBlink 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proposal cards — inline in voice flow */}
                    {hasProposals && !savedOk && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px", animation: "cassBoardOptionIn 0.3s ease forwards" }}>
                        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: textMuted, textTransform: "uppercase", margin: 0 }}>
                          {reviewTasks.length} card{reviewTasks.length !== 1 ? "s" : ""} captured — review &amp; adjust
                        </p>
                        {reviewTasks.map((task, i) => (
                          <ProposalCard
                            key={task.id}
                            task={task}
                            columns={columns}
                            onRemove={() => setReviewTasks((prev) => prev.filter((_, idx) => idx !== i))}
                            onColumnChange={(col) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, suggestedColumn: col } : t))}
                            onTitleChange={(title) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, title } : t))}
                            onDescriptionChange={(description) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, description } : t))}
                            onUrgentChange={(isUrgent) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, isUrgent } : t))}
                            onSizeChange={(size) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, size } : t))}
                            onDueDateChange={(dueDate) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, dueDate } : t))}
                            onAssigneeChange={(assigneeName) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, assigneeName } : t))}
                          />
                        ))}
                      </div>
                    )}

                    {/* Success state — inline in voice flow */}
                    {savedOk && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "cassBoardOptionIn 0.3s ease forwards" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: isDark ? "rgba(110,231,183,0.06)" : "rgba(110,231,183,0.10)", border: "1px solid rgba(110,231,183,0.22)", borderRadius: "14px" }}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(110,231,183,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Check size={13} style={{ color: isDark ? "#6ee7b7" : "#059669" }} />
                          </div>
                          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: isDark ? "#a7f3d0" : "#065f46", margin: 0 }}>
                            {reviewTasks.length} task{reviewTasks.length !== 1 ? "s" : ""} added to the board.
                          </p>
                        </div>
                        {/* Voice-memo action buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSavedOk(false);
                              setProposedTasks([]);
                              setReviewTasks([]);
                              setVoicePhase("voice");
                              setVoiceColumn("");
                              setVoiceLiveTranscript("");
                              setVoiceFinalTranscript(null);
                              setVoiceTextInput("");
                              setVoiceListening(false);
                              setVoiceError(null);
                              setMessages([]);
                            }}
                            style={{ background: "transparent", border: "1px solid rgba(200,168,107,0.45)", borderRadius: "12px", padding: "13px 20px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,168,107,0.85)", cursor: "pointer", transition: "background 0.15s, border-color 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.08)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.65)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; }}
                          >
                            Record another voice memo
                          </button>
                          <button
                            type="button"
                            onClick={onClose}
                            style={{ background: "linear-gradient(135deg, #c8a86b, #a8864e)", border: "none", borderRadius: "12px", padding: "13px 20px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a0e00", cursor: "pointer" }}
                          >
                            That's it for now
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Chat messages (chat mode only) ── */}
            {mode === "chat" && (
              <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Breakup context banner */}
                {isBreakupMode && breakupTask && (
                  <div style={{
                    background: "rgba(200,168,107,0.05)",
                    border: "1px solid rgba(200,168,107,0.18)",
                    borderRadius: "10px", padding: "10px 14px",
                    display: "flex", flexDirection: "column", gap: "3px",
                  }}>
                    <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: 0 }}>Breaking up</p>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: textPrimary, margin: 0, lineHeight: "1.4" }}>{breakupTask.title}</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  msg.role === "assistant" ? (
                    <div key={i} ref={i === messages.length - 1 ? proposalsStartRef : undefined} style={{ animation: "cassBoardOptionIn 0.3s ease forwards" }}>
                      {msg.content.split("\n\n").map((para, j) => (
                        <p key={j} style={{
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: "15px", lineHeight: "1.65",
                          color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)",
                          margin: j > 0 ? "10px 0 0" : 0,
                        }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={USER_B}>{msg.content}</div>
                    </div>
                  )
                ))}

                {isPending && voicePhase !== "processing" && !(isChronicleMode && chronicleMethod === "voice") && (
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "2px" }}>
                    {[0,1,2].map((d) => (
                      <span key={d} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a86b", display: "block", animation: `cassBoardCaretBlink 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                    ))}
                  </div>
                )}

                {/* Proposal cards — chronicle-voice renders its own inline */}
                {hasProposals && !savedOk && !(isChronicleMode && chronicleMethod === "voice") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(248,248,246,0.3)", textTransform: "uppercase", margin: 0 }}>
                      {reviewTasks.length} card{reviewTasks.length !== 1 ? "s" : ""} captured — review &amp; adjust
                    </p>
                    {reviewTasks.map((task, i) => (
                      <ProposalCard
                        key={task.id}
                        task={task}
                        columns={columns}
                        onRemove={() => setReviewTasks((prev) => prev.filter((_, idx) => idx !== i))}
                        onColumnChange={(col) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, suggestedColumn: col } : t))}
                        onTitleChange={(title) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, title } : t))}
                        onDescriptionChange={(description) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, description } : t))}
                        onUrgentChange={(isUrgent) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, isUrgent } : t))}
                        onSizeChange={(size) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, size } : t))}
                        onDueDateChange={(dueDate) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, dueDate } : t))}
                        onAssigneeChange={(assigneeName) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, assigneeName } : t))}
                      />
                    ))}
                  </div>
                )}

                {/* Success + template offer — chronicle-voice renders its own inline */}
                {savedOk && !(isChronicleMode && chronicleMethod === "voice") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Success confirmation */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: isDark ? "rgba(110,231,183,0.06)" : "rgba(110,231,183,0.10)", border: "1px solid rgba(110,231,183,0.22)", borderRadius: "14px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(110,231,183,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={13} style={{ color: isDark ? "#6ee7b7" : "#059669" }} />
                      </div>
                      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: isDark ? "#a7f3d0" : "#065f46", margin: 0 }}>
                        {isBreakupMode
                          ? `Broken into ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""}. Original card removed.`
                          : `${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""} added to the board.`}
                      </p>
                    </div>

                    {/* Template offer */}
                    {suggestSaveAsTemplate && templateDraft?.name && !templateSaved && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginTop: "6px" }} />
                          <div>
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: textPrimary, margin: "0 0 4px", lineHeight: "1.6" }}>
                              This looks like something you&apos;d run again. Want me to save it as a workflow?
                            </p>
                            <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "rgba(200,168,107,0.5)", margin: 0 }}>
                              &ldquo;{templateDraft.name}&rdquo;
                            </p>
                          </div>
                        </div>
                        {templateError && <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "#f87171", margin: 0 }}>{templateError}</p>}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <TapeButton type="button" onClick={() => setSuggestSaveAsTemplate(false)} disabled={templateSaving} variant="secondary" size="sm">Not now</TapeButton>
                          <TapeButton type="button" onClick={handleSaveTemplate} disabled={templateSaving} variant="primary" size="sm">
                            {templateSaving ? <LoaderCircle size={11} style={{ animation: "cassBoardSpin 1s linear infinite" }} /> : <Check size={11} />}
                            {templateSaving ? "Saving…" : "Save workflow"}
                          </TapeButton>
                        </div>
                      </div>
                    )}
                    {templateSaved && <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "#6ee7b7", margin: 0, letterSpacing: "0.5px" }}>✓ Workflow saved — Cass will suggest it next time.</p>}

                    <TapeButton type="button" onClick={onClose} variant="secondary" size="sm">Done</TapeButton>
                  </div>
                )}


                {chatError && <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "#f87171", margin: 0 }}>{chatError}</p>}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {/* ── Onboarding welcome mode — styled to match the onboarding chat exactly ── */}
        {mode === "onboarding_welcome" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: isDark ? "#0a0a0a" : "#faf9f4",  // body stays warm white; header is #f0ebe0
            backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
          }}>
            {/* Authored By header */}
            <div style={{
              background: isDark ? "#0a0a0a" : "#f0ebe0", borderBottom: `1px solid ${isDark ? "#1e1e1e" : "rgba(0,0,0,0.08)"}`,
              padding: "8px 16px", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <img
                src="/icons/authored-by-tape-icon.png"
                alt="Authored By"
                style={{ width: "auto", height: "52px", objectFit: "contain" }}
              />
            </div>
            <div style={{
              background: isDark ? "#242424" : "#e8e0d0", padding: "6px 16px",
              display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.25)" : "rgba(26,14,0,0.35)",
              }}>
                Onboarding
              </span>
            </div>

            {/* Scroll content */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "32px 16px 40px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "24px",
              maxWidth: "600px", width: "100%", margin: "0 auto",
              boxSizing: "border-box",
              scrollbarWidth: "none",
            }}>
              {/* Cass hero */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <CassRecorder animState="talking" size="md" />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)",
                }}>Cass · Story Guide</span>
              </div>

              {/* Message — plain text, no bubble */}
              <div style={{ maxWidth: "85%", width: "100%", animation: "cassBoardOptionIn 0.35s ease 0.1s both" }}>
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "15px", lineHeight: "1.65",
                  color: "#f8f8f6", margin: 0,
                }}>
                  One last thing. If you need to add new items to this board, whether they are tasks you still need to complete, or things you already finished up and want to chronicle, just tap the plus button in the corner (or the column headers) and I&apos;ll make sure we capture everything. I can&apos;t wait to see what comes next for you!
                </p>
              </div>

              {/* Got it chip */}
              <div style={{ animation: "cassBoardOptionIn 0.35s ease 0.5s both" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    background: "#f5c84a",
                    border: "1px solid #f5c84a",
                    borderRadius: "28px", padding: "12px 28px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "15px", fontWeight: 600, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "#1a0e00", cursor: "pointer",
                    transition: "background 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0c040"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f5c84a"; }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Retro mode (initiated from end-chapter or all-done) ── */}
        {mode === "retro" && (() => {
          const doneColId = columns.find((c) => c.name.toLowerCase() === "done")?.id;
          const completedTasksForRetro = doneColId ? tasks.filter((t) => t.columnId === doneColId) : [];
          const remainingTasksForRetro = doneColId ? tasks.filter((t) => t.columnId !== doneColId) : tasks;
          return (
            <CassRetroChat
              project={project}
              board={board}
              completedTasks={completedTasksForRetro}
              remainingTasks={remainingTasksForRetro}
              chapterNumber={chapterNumber}
              onComplete={(data) => { onRetroComplete?.(data); onTasksAdded(); setTimeout(onClose, 800); }}
              onDismiss={onClose}
            />
          );
        })()}

        {/* ── Refocus mode ── */}
        {mode === "refocus" && rfPhase === "retro" && (() => {
          const doneColId = columns.find((c) => c.name.toLowerCase() === "done")?.id;
          const completedTasksForRetro = tasks.filter((t) => t.columnId === doneColId);
          const keepIds = new Set(Object.entries(rfTriageMap).filter(([, v]) => v === "keep").map(([k]) => k));
          const remainingTasksForRetro = tasks.filter((t) => keepIds.has(t.id));
          return (
            <CassRetroChat
              project={project}
              board={board}
              completedTasks={completedTasksForRetro}
              remainingTasks={remainingTasksForRetro}
              chapterNumber={chapterNumber}
              onComplete={() => { onTasksAdded(); setTimeout(onClose, 800); }}
              onDismiss={onClose}
            />
          );
        })()}

        {mode === "refocus" && rfPhase === "triage" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Cass summary bubble */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
              <div style={CASS_B}>
                For each task below, choose: keep it in this chapter, move it to the next one, or cut it entirely.
              </div>
            </div>

            {/* Task triage cards */}
            {rfIncompleteTasks.map((t) => {
              const decision = rfTriageMap[t.id] ?? "keep";
              const colName = columns.find((c) => c.id === t.columnId)?.name ?? "";
              return (
                <div key={t.id} style={{ background: surface, border: `1px solid ${borderGoldDim}`, borderRadius: "12px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "14px", color: textPrimary, margin: 0, lineHeight: "1.5" }}>{t.title}</p>
                  {colName && <p style={{ fontFamily: "var(--font-cass)", fontSize: "10px", color: "rgba(200,168,107,0.5)", margin: 0, letterSpacing: "1px", textTransform: "uppercase" }}>{colName}</p>}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {(["keep", "move", "delete"] as TriageDecision[]).map((opt) => {
                      const labels = { keep: "✓ Keep", move: "→ Next chapter", delete: "✕ Cut it" };
                      const activeColors = { keep: "rgba(110,231,183,0.2)", move: "rgba(200,168,107,0.2)", delete: "rgba(248,113,113,0.2)" };
                      const activeBorders = { keep: "rgba(110,231,183,0.5)", move: "rgba(200,168,107,0.5)", delete: "rgba(248,113,113,0.5)" };
                      const activeText = { keep: "#6ee7b7", move: "#c8a86b", delete: "#f87171" };
                      const isActive = decision === opt;
                      return (
                        <button
                          key={opt} type="button"
                          onClick={() => setRfTriageMap((prev) => ({ ...prev, [t.id]: opt }))}
                          style={{ padding: "4px 12px", borderRadius: "999px", border: `1px solid ${isActive ? activeBorders[opt] : "rgba(255,255,255,0.1)"}`, background: isActive ? activeColors[opt] : "transparent", fontFamily: "var(--font-cass)", fontSize: "11px", color: isActive ? activeText[opt] : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.5px" }}
                        >{labels[opt]}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {rfError && (
              <p style={{ fontFamily: "var(--font-cass)", fontSize: "12px", color: "#f87171", margin: 0 }}>{rfError}</p>
            )}

            {/* Confirm */}
            <TapeButton
              type="button"
              onClick={handleRfConfirm}
              disabled={rfIsSaving}
              variant="primary"
              className="mt-2 w-full"
            >
              {rfIsSaving
                ? <><LoaderCircle size={14} style={{ animation: "cassBoardSpin 1s linear infinite" }} /> Saving…</>
                : "Lock it in → Write the recap"}
            </TapeButton>
          </div>
        )}

        {mode === "refocus" && rfPhase === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: "12px" }} ref={messagesEndRef as React.RefObject<HTMLDivElement>}>
              {rfMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "10px" }}>
                  {msg.role === "assistant" && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />}
                  <div style={msg.role === "assistant" ? CASS_B : USER_B}>{msg.content}</div>
                </div>
              ))}
              {rfIsPending && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                  <div style={{ ...CASS_B, color: "rgba(200,168,107,0.5)", fontSize: "13px" }}>
                    <LoaderCircle size={14} style={{ display: "inline", verticalAlign: "middle", animation: "cassBoardSpin 1s linear infinite", marginRight: "6px" }} />rolling…
                  </div>
                </div>
              )}
              {rfError && <p style={{ fontFamily: "var(--font-cass)", fontSize: "12px", color: "#f87171", margin: 0 }}>{rfError}</p>}
            </div>
            <div style={{ flexShrink: 0, borderTop: `1px solid ${dividerColor}`, padding: "10px 16px 14px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={rfDraft}
                onChange={(e) => setRfDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRfMessage(); } }}
                placeholder="What's been getting in the way…"
                rows={2}
                disabled={rfIsPending}
                style={{ flex: 1, background: inputBg, border: "1px solid rgba(200,168,107,0.2)", borderRadius: "12px", padding: "10px 14px", resize: "none", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: 1.6, color: textPrimary, outline: "none", boxSizing: "border-box" }}
              />
              <button
                type="button" onClick={sendRfMessage} disabled={!rfDraft.trim() || rfIsPending}
                style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", border: "none", cursor: rfDraft.trim() && !rfIsPending ? "pointer" : "not-allowed", background: rfDraft.trim() && !rfIsPending ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", fontFamily: "'Literata', Georgia, serif" }}
              >
                {rfIsPending
                  ? <LoaderCircle size={16} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite" }} />
                  : <ArrowUp size={16} style={{ color: rfDraft.trim() ? "#0a0a0a" : "#555" }} />}
              </button>
            </div>
          </>
        )}

        {/* ── Completed chapter mode ── */}
        {mode === "completed" && (() => {
          // Is there a newer/active chapter to navigate to?
          const hasNewerChapter = !!onNavigateToLatest;
          const hasRetro        = !!board.retroCompletedAt;

          // ── Case A: newer chapter exists → show navigation options ──────────
          if (hasNewerChapter) {
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                  <div style={CASS_B}>You have completed this chapter. What should we do next?</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => { onNavigateToLatest(); onClose(); }}
                    style={{ background: surface, border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                    <div>
                      <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0, lineHeight: "1.3" }}>Take me to the latest chapter</p>
                      <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>Jump to where the work is happening</p>
                    </div>
                  </button>
                  {onPlanChapters && (
                    <button
                      type="button"
                      onClick={() => { onPlanChapters(); onClose(); }}
                      style={{ background: surface, border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "100ms", opacity: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; }}
                    >
                      <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                      <div>
                        <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0, lineHeight: "1.3" }}>Plan new chapters</p>
                        <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "12px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>Write the next act of the story</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // ── Case B: this IS the latest chapter, no retro yet ─────────────────
          if (!hasRetro) {
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                  <div style={CASS_B}>Now that you&apos;ve completed this chapter, I&apos;d love to record how things went. Got a second?</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => selectMode("end_chapter")}
                    style={{ background: surface, border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                    <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0, lineHeight: "1.3" }}>Yes</p></div>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ background: surface, border: `1px solid ${borderSubtle}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "100ms", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(26,14,0,0.18)"; e.currentTarget.style.background = btnBgHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderSubtle; e.currentTarget.style.background = surface; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(26,14,0,0.2)"}`, background: "transparent" }} />
                    <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textSecondary, margin: 0, lineHeight: "1.3" }}>Not right now</p></div>
                  </button>
                </div>
              </div>
            );
          }

          // ── Case C: latest chapter, retro done, prompt to plan next ──────────
          return (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                <div style={CASS_B}>It&apos;s time we planned for what comes next. Got a second to talk this out with me?</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {onPlanChapters && (
                  <button
                    type="button"
                    onClick={() => { onPlanChapters(); onClose(); }}
                    style={{ background: surface, border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                    <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0, lineHeight: "1.3" }}>Yes</p></div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: surface, border: `1px solid ${borderSubtle}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: onPlanChapters ? "100ms" : "0ms", opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(26,14,0,0.18)"; e.currentTarget.style.background = btnBgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderSubtle; e.currentTarget.style.background = surface; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(26,14,0,0.2)"}`, background: "transparent" }} />
                  <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textSecondary, margin: 0, lineHeight: "1.3" }}>Not right now</p></div>
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── New chapter prompt — starting a new chapter means ending this one first ── */}
        {mode === "new_chapter_prompt" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
              <div style={CASS_B}>
                {newChapterDeclined
                  ? "Sounds good."
                  : "To start a new chapter, we'll need to end the one you're working on now. Want to do that?"}
              </div>
            </div>
            {!newChapterDeclined && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => selectMode("end_chapter")}
                  style={{ background: surface, border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = surfaceGold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = surface; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                  <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0, lineHeight: "1.3" }}>End this chapter early</p></div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewChapterDeclined(true)}
                  style={{ background: surface, border: `1px solid ${borderSubtle}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "100ms", opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(26,14,0,0.18)"; e.currentTarget.style.background = btnBgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderSubtle; e.currentTarget.style.background = surface; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(26,14,0,0.2)"}`, background: "transparent" }} />
                  <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textSecondary, margin: 0, lineHeight: "1.3" }}>No thanks</p></div>
                </button>
              </div>
            )}
            {newChapterDeclined && (
              <button
                type="button"
                onClick={onClose}
                style={{ background: surface, border: `1px solid ${borderSubtle}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(26,14,0,0.18)"; e.currentTarget.style.background = btnBgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderSubtle; e.currentTarget.style.background = surface; }}
              >
                <X size={14} style={{ color: textSecondary, flexShrink: 0 }} />
                <div><p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", fontWeight: 600, color: textSecondary, margin: 0, lineHeight: "1.3" }}>Close</p></div>
              </button>
            )}
          </div>
        )}

        {/* ── Retro nudge mode ── */}
        {mode === "retro_nudge" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            {/* Cass avatar — same treatment as menu/chat modes */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <CassRecorder animState="talking" size="sm" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)" }}>
                Cass · Story Guide
              </span>
            </div>

            {/* Cass question — plain Lora, left-aligned, no bubble */}
            <div style={{ maxWidth: "85%", width: "100%" }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.65", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>
                Everything&apos;s in the done column. Time to wrap up and get ready for our next chapter.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => { onStartRetro?.(); onClose(); }}
                style={{
                  display: "inline-flex", alignItems: "center",
                  background: "#f5c84a", border: "1px solid #f5c84a",
                  borderRadius: "28px", padding: "12px 28px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "15px", fontWeight: 600, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "#1a0e00", cursor: "pointer",
                  transition: "background 0.15s", whiteSpace: "nowrap",
                  animation: "cassBoardOptionIn 0.28s ease forwards", opacity: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0c040"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f5c84a"; }}
              >
                Start the recap →
              </button>
            </div>
          </div>
        )}

        {/* ── Chat mode — end chapter owns the full content area ── */}
        {mode === "chat" && isEndChapterMode && (
          <EndChapterView
            projectId={project.id}
            boardId={board.id}
            tasks={tasks}
            columns={columns}
            onConfirm={(nextChapterId) => { onEndChapterConfirmed?.(nextChapterId); setMode("retro"); }}
            onClose={onClose}
          />
        )}

        {/* Input bar — text tasks / breakup mode / voice text input, not when saved */}
        {mode === "chat" && !isEndChapterMode && !savedOk && (!(isChronicleMode && chronicleMethod !== "talk") || voicePhase === "text_input") && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${dividerColor}`, padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Voice text mode: back-to-mic link */}
            {voicePhase === "text_input" && (
              <button
                type="button"
                onClick={() => { setVoiceTextInput(""); setVoiceFinalTranscript(null); setVoiceLiveTranscript(""); setVoicePhase("voice"); }}
                style={{ background: "none", border: "none", padding: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,168,107,0.6)", cursor: "pointer", textAlign: "left", width: "fit-content" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.9)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.6)"; }}
              >
                ← Switch to voice
              </button>
            )}
            {hasProposals && reviewTasks.length > 0 && voicePhase !== "text_input" && (
              <button
                type="button" onClick={handleAddTasks} disabled={isSaving}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", background: isSaving ? "rgba(245,200,74,0.6)" : "#f5c84a", border: "none", borderRadius: "28px", padding: "13px 28px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a0e00", cursor: isSaving ? "not-allowed" : "pointer", transition: "background 0.15s", width: "100%" }}
                onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.background = "#f0c040"; }}
                onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.background = "#f5c84a"; }}
              >
                {isSaving
                  ? <><LoaderCircle size={14} style={{ animation: "cassBoardSpin 1s linear infinite" }} />{isBreakupMode ? "Breaking up…" : "Adding…"}</>
                  : isBreakupMode
                    ? `Break into ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""}`
                    : `✓ Add ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""} to board`}
              </button>
            )}
            {(aiStatus === "chatting" || voicePhase === "text_input") && (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                {chatSubMode === "tasks" && voicePhase !== "text_input" && (
                  <button
                    type="button"
                    onClick={toggleChatMic}
                    aria-label={chatMicListening ? "Stop dictating" : "Dictate your message"}
                    style={{
                      width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%",
                      border: `1px solid ${chatMicListening ? "#f5c84a" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(26,14,0,0.18)")}`,
                      background: chatMicListening ? "rgba(245,200,74,0.15)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.07)"),
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
                      {[{ x: 0, h: 4, y: 5 }, { x: 3, h: 8, y: 3 }, { x: 6, h: 14, y: 0 }, { x: 9, h: 8, y: 3 }, { x: 12, h: 4, y: 5 }].map((bar, i) => (
                        <rect key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
                          fill={chatMicListening ? "#f5c84a" : (isDark ? "#888" : "rgba(26,14,0,0.45)")}
                          style={chatMicListening ? { animation: `chat-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
                        />
                      ))}
                    </svg>
                  </button>
                )}
                <textarea
                  autoFocus={voicePhase === "text_input"}
                  value={voicePhase === "text_input" ? voiceTextInput : draft}
                  onChange={(e) => voicePhase === "text_input" ? setVoiceTextInput(e.target.value) : setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (voicePhase === "text_input") {
                        if (voiceTextInput.trim()) processVoiceTranscript(voiceTextInput.trim(), voiceColumn);
                      } else {
                        sendMessage();
                      }
                    }
                  }}
                  placeholder={voicePhase === "text_input" ? "Describe the tasks or ideas you want to add…" : chatMicListening ? "Listening…" : "What's on your mind…"}
                  rows={2}
                  disabled={isPending || isSaving}
                  style={{ flex: 1, background: inputBg, border: "1px solid rgba(200,168,107,0.2)", borderRadius: "12px", padding: "10px 14px", resize: "none", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: 1.6, color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", outline: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (voicePhase === "text_input") {
                      if (voiceTextInput.trim()) processVoiceTranscript(voiceTextInput.trim(), voiceColumn);
                    } else {
                      sendMessage();
                    }
                  }}
                  disabled={voicePhase === "text_input" ? !voiceTextInput.trim() : (!draft.trim() || isPending || isSaving)}
                  style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", border: "none", cursor: (voicePhase === "text_input" ? voiceTextInput.trim() : (draft.trim() && !isPending)) ? "pointer" : "not-allowed", background: (voicePhase === "text_input" ? voiceTextInput.trim() : (draft.trim() && !isPending && !isSaving)) ? "linear-gradient(135deg, #c8a86b, #a8864e)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(26,14,0,0.07)"), display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                >
                  {isPending && voicePhase !== "text_input"
                    ? <LoaderCircle size={16} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite" }} />
                    : <ArrowUp size={16} style={{ color: (voicePhase === "text_input" ? voiceTextInput.trim() : (draft.trim() && !isSaving)) ? "#0a0a0a" : (isDark ? "#555" : "rgba(26,14,0,0.25)") }} />}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}

// ── FAB ───────────────────────────────────────────────────────────────────────

export { CassFab as CassBoardFab } from "@/components/cass/CassFab";
