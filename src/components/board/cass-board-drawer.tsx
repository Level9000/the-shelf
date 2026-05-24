"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, ArrowUp, Check, LoaderCircle, Trash2, X } from "lucide-react";
import type { AICassBoardDialogue } from "@/lib/ai/schema";
import type { Board, BoardColumn, BoardConversationEntry, Chapter, Priority, Project, ProposedTask, Task, WorkflowTemplate } from "@/types";
import { createBrainDumpCardsAction, createNextChapterForDeferAction, deleteTaskAction, moveTasksToChapterAction, saveBoardConversationAction, saveWorkflowTemplateAction } from "@/lib/actions/task-actions";
import { endChapterEarlyAction } from "@/lib/actions/project-actions";
import { CassProgressBar } from "@/components/cass/CassProgressBar";
import { CassRecorder } from "@/components/cass/CassRecorder";
import type { CassAnimState } from "@/components/cass/cassVoice";

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

type BoardMode = "menu" | "chat" | "completed";
type ChatSubMode = "tasks" | "braindump" | "move" | "breakup" | "end_chapter";
type BrainDumpState = "idle" | "recording" | "processing" | "error";
type MovePhase = "select" | "destination" | "done";
type Msg = { role: "user" | "assistant"; content: string };

const MENU_QUESTION = "What would you like to do?";

const MENU_OPTIONS: Array<{ key: ChatSubMode; label: string; sub: string }> = [
  { key: "tasks",     label: "Add specific tasks",        sub: "I know what I need to do"              },
  { key: "braindump", label: "Brain dump",                sub: "Speak freely — I'll capture the cards"  },
  { key: "move",      label: "Move to a future chapter",  sub: "Defer tasks you won't get to this chapter" },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const CASS_B: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 12px 2px", padding: "12px 16px",
  fontFamily: "'Special Elite', cursive", fontSize: "16px",
  lineHeight: "1.7", color: "#e8e0d0", maxWidth: "92%",
};
const USER_B: React.CSSProperties = {
  background: "rgba(200,168,107,0.1)", border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "12px 12px 2px 12px", padding: "10px 16px",
  fontFamily: "'Share Tech Mono', monospace", fontSize: "14px",
  lineHeight: "1.5", color: "#c8a86b", maxWidth: "80%",
};
const PRIORITY_COLORS: Record<NonNullable<Priority>, string> = {
  high: "#f87171", medium: "#fbbf24", low: "#6ee7b7",
};
const COLUMN_LABELS: Record<string, string> = {
  "Do Today": "Today", "Do This Week": "This Week", "Backlog": "Backlog", "Done": "Done",
};

// ── Proposal card ─────────────────────────────────────────────────────────────

function ProposalCard({
  task, columns, onRemove, onColumnChange,
}: {
  task: ProposedTask;
  columns: BoardColumn[];
  onRemove: () => void;
  onColumnChange: (col: string) => void;
}) {
  const availableCols = columns.map((c) => c.name);
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)",
      borderRadius: "12px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "#e8e0d0", margin: 0, lineHeight: "1.5", flex: 1 }}>
          {task.title}
        </p>
        <button
          type="button" onClick={onRemove}
          style={{ width: "22px", height: "22px", flexShrink: 0, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#666"; }}
        ><Trash2 size={10} /></button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <select
          value={task.suggestedColumn}
          onChange={(e) => onColumnChange(e.target.value)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,168,107,0.2)", borderRadius: "999px", padding: "2px 10px", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#c8a86b", cursor: "pointer", outline: "none" }}
        >
          {availableCols.map((c) => (
            <option key={c} value={c} style={{ background: "#1a1a1a" }}>{COLUMN_LABELS[c] ?? c}</option>
          ))}
        </select>
        {task.priority && (
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "1.5px", color: PRIORITY_COLORS[task.priority], textTransform: "uppercase", opacity: 0.8 }}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.4)", letterSpacing: "0.5px" }}>
            due {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Brain dump recorder view ──────────────────────────────────────────────────

function BrainDumpRecorderView({
  projectId,
  onCardsReady,
}: {
  projectId: string;
  onCardsReady: (tasks: ProposedTask[], transcript: string) => void;
}) {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef<string>("");
  const [dumpState, setDumpState] = useState<BrainDumpState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Elapsed timer while recording
  useEffect(() => {
    if (dumpState !== "recording") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [dumpState]);

  const processTranscript = useCallback((transcript: string) => {
    setDumpState("processing");
    startTransition(async () => {
      try {
        const res = await fetch("/api/voice/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, transcript }),
        });
        const payload = await res.json() as { id?: string; transcript?: string; tasks?: ProposedTask[]; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Processing failed.");
        const tasks = (payload.tasks ?? []).map((t) => ({ ...t, id: t.id ?? crypto.randomUUID() }));
        onCardsReady(tasks, transcript);
      } catch (err) {
        setDumpState("error");
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }, [projectId, onCardsReady]);

  function startRecording() {
    const SpeechClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechClass) {
      setDumpState("error");
      setError("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    try {
      setError(null);
      setElapsed(0);
      transcriptRef.current = "";
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.addEventListener("result", (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            transcriptRef.current += (transcriptRef.current ? " " : "") + e.results[i][0].transcript;
          }
        }
      });
      recognition.addEventListener("error", (e) => {
        if (e.error === "not-allowed") {
          setDumpState("error");
          setError("Microphone access denied. Check browser permissions.");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
          setDumpState("error");
          setError(`Speech error: ${e.error}`);
        }
      });
      recognitionRef.current = recognition;
      recognition.start();
      setDumpState("recording");
    } catch {
      setDumpState("error");
      setError("Microphone access failed. Check browser permissions.");
    }
  }

  function stopRecording() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      setDumpState("error");
      setError("Nothing was captured. Please try again.");
      return;
    }
    processTranscript(transcript);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  const cassAnim: CassAnimState =
    dumpState === "recording" ? "recording" :
    dumpState === "processing" ? "playing" :
    "idle";

  const isActive = dumpState === "recording" || dumpState === "processing";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px 24px", gap: "0" }}>

      {/* Pulsing glow ring behind Cass when active */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
        {isActive && (
          <div style={{
            position: "absolute",
            width: "220px", height: "220px",
            borderRadius: "50%",
            background: dumpState === "recording"
              ? "radial-gradient(circle, rgba(200,168,107,0.18) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(200,168,107,0.1) 0%, transparent 70%)",
            animation: "cassBoardPulse 2s ease-in-out infinite",
          }} />
        )}
        <CassRecorder animState={cassAnim} size="md" />
      </div>

      {/* State label */}
      <p style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "11px",
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: dumpState === "recording" ? "#c8a86b" : dumpState === "processing" ? "rgba(200,168,107,0.6)" : "rgba(255,255,255,0.25)",
        margin: "0 0 6px",
        transition: "color 0.3s",
      }}>
        {dumpState === "recording" ? "Listening" :
         dumpState === "processing" ? "Transcribing" :
         dumpState === "error" ? "Error" :
         "Ready"}
      </p>

      {/* Elapsed timer */}
      {dumpState === "recording" && (
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "28px", color: "#c8a86b", margin: "0 0 28px", letterSpacing: "2px" }}>
          {formatTime(elapsed)}
        </p>
      )}

      {/* Processing message */}
      {dumpState === "processing" && (
        <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "14px", color: "rgba(232,224,208,0.6)", margin: "8px 0 28px", textAlign: "center" }}>
          Pulling the cards from your dump…
        </p>
      )}

      {/* Idle message */}
      {dumpState === "idle" && (
        <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "14px", color: "rgba(232,224,208,0.45)", margin: "8px 0 28px", textAlign: "center", lineHeight: "1.6", maxWidth: "260px" }}>
          Hit record and just talk. Everything on your mind — Cass will sort it into cards.
        </p>
      )}

      {/* Error message */}
      {dumpState === "error" && error && (
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: "8px 0 20px", textAlign: "center", lineHeight: "1.6" }}>
          {error}
        </p>
      )}

      {/* Action button */}
      {dumpState !== "processing" && (
        <button
          type="button"
          onClick={dumpState === "recording" ? stopRecording : startRecording}
          style={{
            width: "72px", height: "72px",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: dumpState === "recording"
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #c8a86b, #a8864e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: dumpState === "recording"
              ? "0 0 0 8px rgba(239,68,68,0.15), 0 8px 24px rgba(239,68,68,0.3)"
              : "0 0 0 8px rgba(200,168,107,0.12), 0 8px 24px rgba(200,168,107,0.25)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            animation: dumpState === "recording" ? "cassBoardRecordPulse 1.5s ease-in-out infinite" : "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {dumpState === "recording" ? (
            /* Stop square */
            <div style={{ width: "22px", height: "22px", borderRadius: "4px", background: "white" }} />
          ) : (
            /* Mic dot */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{ width: "8px", height: "14px", borderRadius: "999px", background: "white" }} />
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "1.5px", height: "6px", background: "rgba(255,255,255,0.6)", borderRadius: "2px" }} />
                <div style={{ width: "1.5px", height: "8px", background: "rgba(255,255,255,0.9)", borderRadius: "2px" }} />
                <div style={{ width: "1.5px", height: "6px", background: "rgba(255,255,255,0.6)", borderRadius: "2px" }} />
              </div>
            </div>
          )}
        </button>
      )}

      {/* Processing spinner */}
      {dumpState === "processing" && (
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(200,168,107,0.1)", border: "1px solid rgba(200,168,107,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoaderCircle size={28} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite" }} />
        </div>
      )}

      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.25)", textTransform: "uppercase", letterSpacing: "2px", margin: "20px 0 0" }}>
        {dumpState === "recording" ? "Tap to stop" : dumpState === "idle" || dumpState === "error" ? "Tap to record" : ""}
      </p>
    </div>
  );
}

// ── Move-to-future-chapter view ───────────────────────────────────────────────

function MoveToChapterView({
  movableTasks,
  futureChapters,
  allChaptersCount,
  projectId,
  onSuccess,
  onClose,
}: {
  movableTasks: Task[];
  futureChapters: Chapter[];
  allChaptersCount: number;
  projectId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<MovePhase>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [availableChapters, setAvailableChapters] = useState<Chapter[]>(futureChapters);

  function toggleTask(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(movableTasks.map((t) => t.id)));
  }

  function handleMoveToChapter(targetBoardId: string) {
    const taskIds = Array.from(selectedIds);
    setError(null);
    startTransition(async () => {
      try {
        await moveTasksToChapterAction({ projectId, taskIds, targetBoardId });
        setPhase("done");
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Move failed.");
      }
    });
  }

  function handleDelete() {
    const taskIds = Array.from(selectedIds);
    setError(null);
    startTransition(async () => {
      try {
        await moveTasksToChapterAction({ projectId, taskIds, targetBoardId: "", deleteInstead: true });
        setPhase("done");
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  function handleCreateNextChapter() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createNextChapterForDeferAction({ projectId, currentChapterCount: allChaptersCount });
        // Add created chapter to available list and immediately proceed to move
        setAvailableChapters([{ ...created, projectId, goal: null, whyItMatters: null, successLooksLike: null, doneDefinition: null, openingLine: null, kickoffCompletedAt: null, kickoffPrefilledAt: null, retroConversation: null, chapterStory: null, storyLength: null, retroCompletedAt: null, sharedAt: null, shareSlug: null, position: allChaptersCount * 1000, createdAt: new Date().toISOString() } as Chapter]);
        handleMoveToChapter(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create chapter.");
      }
    });
  }

  const selectedCount = selectedIds.size;

  // ── Phase: done ──
  if (phase === "done") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(110,231,183,0.12)", border: "1px solid rgba(110,231,183,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={20} style={{ color: "#6ee7b7" }} />
        </div>
        <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "15px", color: "#e8e0d0", margin: 0, textAlign: "center" }}>Done. Those tasks are out of your way.</p>
        <button type="button" onClick={onClose} style={{ marginTop: "8px", padding: "10px 24px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", cursor: "pointer" }}>Close</button>
      </div>
    );
  }

  // ── Phase: destination ──
  if (phase === "destination") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
          <div style={CASS_B}>
            {selectedCount === 1 ? "Where should this task go?" : `Where should these ${selectedCount} tasks go?`}
          </div>
        </div>

        {availableChapters.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {availableChapters.map((chapter, i) => (
              <button
                key={chapter.id}
                type="button"
                disabled={isPending}
                onClick={() => handleMoveToChapter(chapter.id)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)",
                  borderRadius: "12px", padding: "14px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: isPending ? "not-allowed" : "pointer", textAlign: "left", width: "100%",
                  animation: "cassBoardOptionIn 0.28s ease forwards",
                  animationDelay: `${i * 80}ms`, opacity: 0,
                }}
                onMouseEnter={(e) => { if (!isPending) { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0 }}>{chapter.name}</p>
                {isPending ? <LoaderCircle size={14} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite", flexShrink: 0 }} /> : <ArrowRight size={14} style={{ color: "rgba(200,168,107,0.4)", flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px", opacity: 0 }} />
              <div style={{ ...CASS_B, background: "transparent", border: "none", padding: "0", fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "rgba(232,224,208,0.5)" }}>
                No future chapters exist yet. I can create the next one for you.
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={handleCreateNextChapter}
              style={{
                background: "rgba(200,168,107,0.08)", border: "1px dashed rgba(200,168,107,0.35)",
                borderRadius: "12px", padding: "14px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: isPending ? "not-allowed" : "pointer", width: "100%",
                animation: "cassBoardOptionIn 0.28s ease forwards", opacity: 0,
              }}
              onMouseEnter={(e) => { if (!isPending) { e.currentTarget.style.borderColor = "rgba(200,168,107,0.6)"; e.currentTarget.style.background = "rgba(200,168,107,0.12)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)"; e.currentTarget.style.background = "rgba(200,168,107,0.08)"; }}
            >
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#c8a86b", margin: 0 }}>
                Create Chapter {allChaptersCount + 1} and move there
              </p>
              {isPending ? <LoaderCircle size={14} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite", flexShrink: 0 }} /> : <ArrowRight size={14} style={{ color: "rgba(200,168,107,0.5)", flexShrink: 0 }} />}
            </button>
          </div>
        )}

        <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "999px",
              background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)",
              cursor: isPending ? "not-allowed" : "pointer",
              fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.06)"; }}
          >
            <Trash2 size={12} />
            Delete {selectedCount === 1 ? "this task" : `these ${selectedCount} tasks`} instead
          </button>
        </div>

        {error && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  // ── Phase: select ──
  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
          <div style={CASS_B}>
            {movableTasks.length === 0
              ? "Everything on the board is either done or… there's nothing here to move."
              : "Which tasks aren't happening this chapter?"}
          </div>
        </div>

        {movableTasks.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: 0 }}>
                {selectedCount} selected
              </p>
              <button
                type="button"
                onClick={selectedCount === movableTasks.length ? () => setSelectedIds(new Set()) : selectAll}
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.5)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.5px", padding: "2px 4px" }}
              >
                {selectedCount === movableTasks.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {movableTasks.map((task) => {
                const checked = selectedIds.has(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      background: checked ? "rgba(200,168,107,0.07)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${checked ? "rgba(200,168,107,0.35)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "10px", padding: "12px 14px",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!checked) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; } }}
                    onMouseLeave={(e) => { if (!checked) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; } }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px",
                      border: `1.5px solid ${checked ? "#c8a86b" : "rgba(200,168,107,0.25)"}`,
                      background: checked ? "rgba(200,168,107,0.2)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {checked && <Check size={10} style={{ color: "#c8a86b" }} />}
                    </div>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: checked ? "#e8e0d0" : "rgba(232,224,208,0.65)", margin: 0, lineHeight: "1.5", flex: 1 }}>
                      {task.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{error}</p>}
      </div>

      {/* Footer */}
      {movableTasks.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "10px 16px 14px" }}>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => setPhase("destination")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "12px", width: "100%", borderRadius: "12px",
              background: selectedCount > 0 ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.06)",
              border: "none", cursor: selectedCount > 0 ? "pointer" : "not-allowed",
              fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 700,
              color: selectedCount > 0 ? "#0a0a0a" : "#555",
              transition: "background 0.2s", letterSpacing: "0.5px",
            }}
          >
            <ArrowRight size={14} />
            {selectedCount === 0 ? "Select tasks to move" : `Move ${selectedCount} task${selectedCount !== 1 ? "s" : ""} →`}
          </button>
        </div>
      )}
    </>
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
  const doneColumnId = columns.find((c) => c.name.toLowerCase() === "done")?.id;
  const incompleteTasks = tasks.filter((t) => !doneColumnId || t.columnId !== doneColumnId);
  const hasIncompleteTasks = incompleteTasks.length > 0;

  const [choice, setChoice] = useState<"carry_over" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (hasIncompleteTasks && !choice) return;
    setError(null);
    startTransition(async () => {
      try {
        const { nextChapterId } = await endChapterEarlyAction({
          projectId,
          boardId,
          handleIncompleteTasks: hasIncompleteTasks ? (choice as "carry_over" | "delete") : "delete",
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

        {/* Cass message */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
          <div style={CASS_B}>
            {hasIncompleteTasks
              ? `${incompleteTasks.length} task${incompleteTasks.length === 1 ? "" : "s"} still open. What should happen to ${incompleteTasks.length === 1 ? "it" : "them"}?`
              : "All tasks are done. Ready to write this chapter\u2019s story?"}
          </div>
        </div>

        {hasIncompleteTasks && (
          <>
            {/* Task list */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,168,107,0.1)", borderRadius: "12px", padding: "12px 14px" }}>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: "0 0 10px" }}>
                Open tasks
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {incompleteTasks.slice(0, 5).map((task) => (
                  <p key={task.id} style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "rgba(232,224,208,0.7)", margin: 0, lineHeight: "1.4" }}>
                    · {task.title}
                  </p>
                ))}
                {incompleteTasks.length > 5 && (
                  <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.35)", margin: 0 }}>
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
                display: "flex", alignItems: "flex-start", gap: "14px",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (choice !== "carry_over") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)"; e.currentTarget.style.background = "rgba(200,168,107,0.05)"; } }}
              onMouseLeave={(e) => { if (choice !== "carry_over") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
            >
              <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${choice === "carry_over" ? "#c8a86b" : "rgba(200,168,107,0.35)"}`, background: choice === "carry_over" ? "rgba(200,168,107,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "2px", transition: "all 0.15s" }}>
                {choice === "carry_over" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a86b" }} />}
              </div>
              <div>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: "1.3" }}>Carry over to the next chapter</p>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "4px 0 0", lineHeight: "1.5" }}>Open tasks move into the next chapter&apos;s backlog</p>
              </div>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => setChoice("delete")}
              style={{
                background: choice === "delete" ? "rgba(248,113,113,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${choice === "delete" ? "rgba(248,113,113,0.35)" : "rgba(200,168,107,0.18)"}`,
                borderRadius: "12px", padding: "14px 16px",
                display: "flex", alignItems: "flex-start", gap: "14px",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (choice !== "delete") { e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)"; e.currentTarget.style.background = "rgba(248,113,113,0.04)"; } }}
              onMouseLeave={(e) => { if (choice !== "delete") { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
            >
              <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${choice === "delete" ? "rgba(248,113,113,0.7)" : "rgba(200,168,107,0.35)"}`, background: choice === "delete" ? "rgba(248,113,113,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "2px", transition: "all 0.15s" }}>
                {choice === "delete" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f87171" }} />}
              </div>
              <div>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: choice === "delete" ? "#fca5a5" : "#e8e0d0", margin: 0, lineHeight: "1.3" }}>Remove them — this chapter is done</p>
                <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "4px 0 0", lineHeight: "1.5" }}>Incomplete tasks are deleted. The chapter closes clean.</p>
              </div>
            </button>
          </>
        )}

        {error && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{error}</p>}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "10px 16px 14px" }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || (hasIncompleteTasks && !choice)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "12px", width: "100%", borderRadius: "12px",
            background: (!isPending && (!hasIncompleteTasks || choice)) ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.06)",
            border: "none",
            cursor: (isPending || (hasIncompleteTasks && !choice)) ? "not-allowed" : "pointer",
            fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 700,
            color: (!isPending && (!hasIncompleteTasks || choice)) ? "#0a0a0a" : "#555",
            opacity: isPending ? 0.7 : 1,
            transition: "background 0.2s", letterSpacing: "0.5px",
          }}
        >
          {isPending
            ? <LoaderCircle size={14} style={{ animation: "cassBoardSpin 1s linear infinite" }} />
            : <ArrowRight size={14} />}
          {isPending ? "Working…" : "Start the retro"}
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
  futureChapters,
  allChaptersCount,
  breakupTask,
  completedChapterMode,
  onNavigateToLatest,
  onPlanChapters,
  onRefocus,
  onEndChapterConfirmed,
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
  futureChapters: Chapter[];
  allChaptersCount: number;
  breakupTask?: Task | null;
  completedChapterMode?: boolean;
  onNavigateToLatest?: () => void;
  onPlanChapters?: () => void;
  onRefocus?: () => void;
  onEndChapterConfirmed?: (nextChapterId: string | null) => void;
  onClose: () => void;
  onTasksAdded: () => void;
  onTaskDeleted?: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  // ── Braindump transcript (for Chronicle history) ──────────────────────────────
  const [braindumpTranscript, setBraindumpTranscript] = useState<string | null>(null);

  // ── Review / confirm state ────────────────────────────────────────────────────
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ProposedTask[]>([]);
  const [templateDraft, setTemplateDraft] = useState<AICassBoardDialogue["templateDraft"] | null>(null);
  const [suggestSaveAsTemplate, setSuggestSaveAsTemplate] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);

  // ── Template save state ───────────────────────────────────────────────────────
  const [templateSaving, startTemplateSaveTransition] = useTransition();
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

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
    setBraindumpTranscript(null);

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
    setChatSubMode("tasks");

    let i = 0;
    const id = setInterval(() => {
      i++;
      setMenuDisplayed(MENU_QUESTION.slice(0, i));
      if (i >= MENU_QUESTION.length) {
        clearInterval(id);
        setTimeout(() => setOptionsReady(true), 180);
      }
    }, 26);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [messages, reviewTasks]);

  // ── Mode selection from menu ──────────────────────────────────────────────────
  function selectMode(sub: ChatSubMode) {
    const label = MENU_OPTIONS.find((o) => o.key === sub)?.label ?? sub;
    setMenuSelected(label);
    setChatSubMode(sub);
    setTimeout(() => setMode("chat"), 320);

    if (sub === "tasks") {
      const openingMsg: Msg = { role: "user", content: "I want to add some specific tasks." };
      setTimeout(() => {
        setMessages([openingMsg]);
        startTransition(async () => {
          try {
            const result = await callApi([openingMsg], "tasks");
            applyAiResult(result, [openingMsg]);
          } catch (err) {
            setChatError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }, 340);
    }
    // braindump: no initial message — the recorder handles it
    // move: no AI call — pure UI flow in MoveToChapterView
  }

  // ── Text chat helpers ─────────────────────────────────────────────────────────
  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || isSaving) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setChatError(null);
    startTransition(async () => {
      try {
        const result = chatSubMode === "breakup"
          ? await callApiBreakup(next)
          : await callApi(next, "tasks");
        applyAiResult(result, next);
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function callApi(msgs: Msg[], sub: ChatSubMode): Promise<AICassBoardDialogue> {
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

  // ── Voice (braindump) cards ready callback ────────────────────────────────────
  const handleVoiceCardsReady = useCallback((tasks: ProposedTask[], transcript: string) => {
    const stamped = tasks.map((t, i) => ({ ...t, id: t.id ?? `voice-${i}` }));
    setProposedTasks(stamped);
    setReviewTasks(stamped);
    setBraindumpTranscript(transcript);
    // Voice dumps don't suggest template saves automatically (often too varied)
    setSuggestSaveAsTemplate(false);
  }, []);

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
            priority: (t.priority ?? "medium") as "low" | "medium" | "high",
            context: t.description ?? "",
            rawQuote: "",
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
        const conversationMessages: Array<{ role: string; content: string }> =
          chatSubMode === "braindump" && braindumpTranscript
            ? [
                { role: "user", content: braindumpTranscript },
                { role: "assistant", content: `Pulled ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""} from your brain dump.` },
              ]
            : messages;

        if (conversationMessages.length > 0) {
          const entry: BoardConversationEntry = {
            id: crypto.randomUUID(),
            mode: chatSubMode as BoardConversationEntry["mode"],
            label: chatSubMode === "braindump"
              ? "Voice Brain Dump"
              : chatSubMode === "breakup" && breakupTask
              ? `Broke up: "${breakupTask.title}"`
              : "Task Planning",
            completedAt: new Date().toISOString(),
            messages: conversationMessages,
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

  const hasProposals = proposedTasks.length > 0;
  const isBrainDump = chatSubMode === "braindump";
  const isMoveMode = chatSubMode === "move";
  const isBreakupMode = chatSubMode === "breakup";
  const isEndChapterMode = chatSubMode === "end_chapter";

  // Filter out Done tasks so only movable tasks are shown
  const doneColumnId = columns.find((c) => c.name.toLowerCase() === "done")?.id;
  const movableTasks = tasks.filter((t) => t.columnId !== doneColumnId);

  // Cass anim in the header: playing while text AI is thinking
  const headerCassAnim: CassAnimState = isPending ? "playing" : "idle";

  // Progress bar percentage
  const progressPercent =
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
          background: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%), #0a0a0a",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
        }}
        aria-hidden={!open}
      >
        <CassProgressBar percent={progressPercent} />

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 14px", position: "relative" }}>
          {mode === "chat" && !savedOk && (
            <button
              type="button"
              onClick={isBreakupMode ? onClose : () => { setMode("menu"); setMenuSelected(null); setMessages([]); setAiStatus("chatting"); setProposedTasks([]); setReviewTasks([]); setSavedOk(false); }}
              style={{ position: "absolute", top: "14px", left: "16px", height: "32px", padding: "0 12px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#888", border: "none", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "0.5px", transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e8e0d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
            >{isBreakupMode ? "✕ cancel" : "← back"}</button>
          )}
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: "14px", right: "16px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(255,255,255,0.06)", color: "#888", border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888"; }}
          ><X size={14} /></button>

          {/* Cass circle — smaller in header, hidden during brain dump recording to let the large recorder own the stage */}
          {!(mode === "chat" && isBrainDump && !hasProposals && !savedOk) && (
            <>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", position: "relative", background: "#1a1a1a", boxShadow: "0 0 0 1.5px rgba(200,168,107,0.35), 0 4px 20px rgba(0,0,0,0.5)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: "scale(0.5333) translateY(-6.5px)" }}>
                  <CassRecorder animState={headerCassAnim} size="sm" />
                </div>
              </div>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2.5px", color: "#c8a86b", textTransform: "uppercase", margin: "6px 0 0", opacity: 0.7 }}>Cass</p>
            </>
          )}
        </div>

        {!(mode === "chat" && isBrainDump && !hasProposals && !savedOk) && (
          <div style={{ height: "1px", background: "rgba(200,168,107,0.08)", flexShrink: 0 }} />
        )}

        {/* ── Menu mode ── */}
        {mode === "menu" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
              <div style={CASS_B}>
                {menuDisplayed}
                {menuDisplayed.length > 0 && menuDisplayed.length < MENU_QUESTION.length && (
                  <span style={{ opacity: 0.5, animation: "cassBoardCaretBlink 0.9s step-end infinite" }}>▌</span>
                )}
              </div>
            </div>
            {optionsReady && !menuSelected && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MENU_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.key} type="button" onClick={() => selectMode(opt.key)}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: `${i * 100}ms`, opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                    <div>
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: "1.3" }}>{opt.label}</p>
                      <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>{opt.sub}</p>
                    </div>
                  </button>
                ))}

                {/* End chapter early — lifecycle action, shown when wired up */}
                {onEndChapterConfirmed && (
                  <>
                    <div style={{ margin: "4px 0", height: "1px", background: "rgba(255,255,255,0.06)" }} />
                    <button
                      type="button"
                      onClick={() => selectMode("end_chapter")}
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: `${MENU_OPTIONS.length * 100 + 40}ms`, opacity: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    >
                      <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent" }} />
                      <div>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "rgba(232,224,208,0.7)", margin: 0, lineHeight: "1.3" }}>End this chapter early</p>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.35)", margin: "3px 0 0" }}>Close the chapter and write the story</p>
                      </div>
                    </button>
                  </>
                )}

                {/* Refocus option — amber-tinted, only when chapter is running long */}
                {onRefocus && (
                  <>
                    <div style={{ margin: "4px 0", height: "1px", background: "rgba(251,146,60,0.12)" }} />
                    <button
                      type="button"
                      onClick={() => { onRefocus(); onClose(); }}
                      style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.22)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: `${MENU_OPTIONS.length * 100 + 60}ms`, opacity: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(251,146,60,0.5)"; e.currentTarget.style.background = "rgba(251,146,60,0.09)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(251,146,60,0.22)"; e.currentTarget.style.background = "rgba(251,146,60,0.04)"; }}
                    >
                      <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(251,146,60,0.6)", background: "transparent" }} />
                      <div>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "rgba(251,180,80,0.9)", margin: 0, lineHeight: "1.3" }}>Refocus this chapter</p>
                        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(251,146,60,0.45)", margin: "3px 0 0" }}>Cut what&apos;s not happening — write what is</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
            {menuSelected && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={USER_B}>{menuSelected}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Completed chapter mode ── */}
        {mode === "completed" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "92%" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
              <div style={CASS_B}>
                This chapter&apos;s story has been written. Ready for what&apos;s next?
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {onNavigateToLatest && (
                <button
                  type="button"
                  onClick={() => { onNavigateToLatest(); onClose(); }}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "0ms", opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                  <div>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: "1.3" }}>Take me to the latest chapter</p>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>Jump to where the work is happening</p>
                  </div>
                </button>
              )}
              {onPlanChapters && (
                <button
                  type="button"
                  onClick={() => { onPlanChapters(); onClose(); }}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", animation: "cassBoardOptionIn 0.28s ease forwards", animationDelay: "100ms", opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)"; e.currentTarget.style.background = "rgba(200,168,107,0.07)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(200,168,107,0.5)", background: "transparent" }} />
                  <div>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: "1.3" }}>Plan new chapters</p>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>Write the next act of the story</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Chat mode ── */}
        {mode === "chat" && (
          <>
            {/* End chapter early */}
            {isEndChapterMode ? (
              <EndChapterView
                projectId={project.id}
                boardId={board.id}
                tasks={tasks}
                columns={columns}
                onConfirm={(nextChapterId) => { onEndChapterConfirmed?.(nextChapterId); onClose(); }}
                onClose={onClose}
              />
            ) : isMoveMode ? (
              <MoveToChapterView
                movableTasks={movableTasks}
                futureChapters={futureChapters}
                allChaptersCount={allChaptersCount}
                projectId={project.id}
                onSuccess={onTasksAdded}
                onClose={onClose}
              />
            ) : isBrainDump && !hasProposals && !savedOk ? (
              <BrainDumpRecorderView
                projectId={project.id}
                onCardsReady={handleVoiceCardsReady}
              />
            ) : (
              /* Text chat + proposal cards */
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Breakup context banner */}
                {isBreakupMode && breakupTask && (
                  <div style={{
                    background: "rgba(200,168,107,0.05)",
                    border: "1px solid rgba(200,168,107,0.18)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.45)", textTransform: "uppercase", margin: 0 }}>Breaking up</p>
                    <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "#e8e0d0", margin: 0, lineHeight: "1.4" }}>{breakupTask.title}</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "10px" }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                    )}
                    <div style={msg.role === "assistant" ? CASS_B : USER_B}>{msg.content}</div>
                  </div>
                ))}

                {isPending && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginBottom: "10px" }} />
                    <div style={{ ...CASS_B, display: "flex", gap: "5px", alignItems: "center" }}>
                      {[0,1,2].map((d) => (
                        <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c8a86b", opacity: 0.4, animation: `cassBoardCaretBlink 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposal cards */}
                {hasProposals && !savedOk && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                    <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", margin: "0 0 4px" }}>
                      {reviewTasks.length} card{reviewTasks.length !== 1 ? "s" : ""} captured — review &amp; adjust
                    </p>
                    {reviewTasks.map((task, i) => (
                      <ProposalCard
                        key={task.id}
                        task={task}
                        columns={columns}
                        onRemove={() => setReviewTasks((prev) => prev.filter((_, idx) => idx !== i))}
                        onColumnChange={(col) => setReviewTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, suggestedColumn: col } : t))}
                      />
                    ))}
                  </div>
                )}

                {/* Success + template offer */}
                {savedOk && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(110,231,183,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={14} style={{ color: "#6ee7b7" }} />
                      </div>
                      <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "14px", color: "#e8e0d0", margin: 0 }}>
                        {isBreakupMode
                          ? `Broken into ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""}. Original card removed.`
                          : `${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""} added to the board.`}
                      </p>
                    </div>
                    {suggestSaveAsTemplate && templateDraft?.name && !templateSaved && (
                      <div style={{ borderTop: "1px solid rgba(200,168,107,0.1)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", flexShrink: 0, marginTop: "6px" }} />
                          <div>
                            <p style={{ fontFamily: "'Special Elite', cursive", fontSize: "13px", color: "#e8e0d0", margin: "0 0 4px", lineHeight: "1.6" }}>
                              This looks like something you'd run again. Want me to save it as a workflow?
                            </p>
                            <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.5)", margin: 0 }}>
                              "{templateDraft.name}"
                            </p>
                          </div>
                        </div>
                        {templateError && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{templateError}</p>}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button type="button" onClick={() => setSuggestSaveAsTemplate(false)} disabled={templateSaving} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", cursor: "pointer" }}>Not now</button>
                          <button type="button" onClick={handleSaveTemplate} disabled={templateSaving} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px 14px", borderRadius: "999px", background: "linear-gradient(135deg, #c8a86b, #a8864e)", border: "none", cursor: templateSaving ? "not-allowed" : "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", fontWeight: 600, color: "#0a0a0a", opacity: templateSaving ? 0.7 : 1 }}>
                            {templateSaving ? <LoaderCircle size={11} style={{ animation: "cassBoardSpin 1s linear infinite" }} /> : <Check size={11} />}
                            {templateSaving ? "Saving…" : "Save workflow"}
                          </button>
                        </div>
                      </div>
                    )}
                    {templateSaved && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#6ee7b7", margin: 0, letterSpacing: "0.5px" }}>✓ Workflow saved — Cass will suggest it next time.</p>}
                    <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", cursor: "pointer", marginTop: "4px" }}>Done</button>
                  </div>
                )}

                {chatError && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "#f87171", margin: 0 }}>{chatError}</p>}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input bar — only for text tasks / breakup mode, and not when saved */}
            {!isBrainDump && !isMoveMode && !isEndChapterMode && !savedOk && (
              <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {hasProposals && reviewTasks.length > 0 && (
                  <button
                    type="button" onClick={handleAddTasks} disabled={isSaving}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #c8a86b, #a8864e)", border: "none", cursor: isSaving ? "not-allowed" : "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: isSaving ? 0.7 : 1, letterSpacing: "0.5px" }}
                  >
                    {isSaving ? <LoaderCircle size={14} style={{ animation: "cassBoardSpin 1s linear infinite" }} /> : <Check size={14} />}
                    {isSaving
                      ? (isBreakupMode ? "Breaking up…" : "Adding…")
                      : isBreakupMode
                        ? `Break into ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""}`
                        : `Add ${reviewTasks.length} task${reviewTasks.length !== 1 ? "s" : ""} to board`}
                  </button>
                )}
                {aiStatus === "chatting" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="What needs to get done…"
                      rows={2}
                      disabled={isPending || isSaving}
                      style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,168,107,0.2)", borderRadius: "12px", padding: "10px 14px", resize: "none", fontFamily: "'Special Elite', cursive", fontSize: "14px", lineHeight: 1.6, color: "#e8e0d0", outline: "none", boxSizing: "border-box" }}
                    />
                    <button
                      type="button" onClick={sendMessage} disabled={!draft.trim() || isPending || isSaving}
                      style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", border: "none", cursor: draft.trim() && !isPending ? "pointer" : "not-allowed", background: draft.trim() && !isPending && !isSaving ? "linear-gradient(135deg, #c8a86b, #a8864e)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                    >
                      {isPending
                        ? <LoaderCircle size={16} style={{ color: "#c8a86b", animation: "cassBoardSpin 1s linear infinite" }} />
                        : <ArrowUp size={16} style={{ color: draft.trim() && !isSaving ? "#0a0a0a" : "#555" }} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Brain dump: Add tasks bar appears after cards come back from voice */}
            {isBrainDump && hasProposals && !savedOk && (
              <div style={{ flexShrink: 0, borderTop: "1px solid rgba(200,168,107,0.1)", padding: "10px 16px 14px" }}>
                <button
                  type="button" onClick={handleAddTasks} disabled={isSaving || reviewTasks.length === 0}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", width: "100%", borderRadius: "12px", background: "linear-gradient(135deg, #c8a86b, #a8864e)", border: "none", cursor: (isSaving || reviewTasks.length === 0) ? "not-allowed" : "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#0a0a0a", opacity: (isSaving || reviewTasks.length === 0) ? 0.7 : 1, letterSpacing: "0.5px" }}
                >
                  {isSaving ? <LoaderCircle size={14} style={{ animation: "cassBoardSpin 1s linear infinite" }} /> : <Check size={14} />}
                  {isSaving ? "Adding…" : `Add ${reviewTasks.length} card${reviewTasks.length !== 1 ? "s" : ""} to board`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── FAB ───────────────────────────────────────────────────────────────────────

export { CassFab as CassBoardFab } from "@/components/cass/CassFab";
