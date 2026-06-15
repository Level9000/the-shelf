"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import type { CassAnimState } from "./cassVoice";
import type { CassEnhancedKickoffDialogue } from "@/lib/ai/schema";
import type { Board, BoardColumn, Project } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { TypewriterText } from "./CassSpeechBubble";
import { completeChapterKickoffAction } from "@/lib/actions/project-actions";
import { CASS_ERROR_LINES } from "./cassVoice";
import { useAvatar } from "@/lib/avatar-context";
import { TapeButton } from "@/components/ui/tape-button";

type DialogueMessage = { role: "user" | "assistant"; content: string };

const OPENER_TRIGGER: DialogueMessage = { role: "user", content: "__kickoff_open__" };

// ── Voice input footer (same pattern as onboarding) ──────────────────────────

function KickoffInputFooter({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec: SpeechRecognition = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    let finalTranscript = value;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + e.results[i][0].transcript.trim();
        else interim += e.results[i][0].transcript;
      }
      onChange(finalTranscript + (interim ? " " + interim : ""));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }

  return (
    <div style={{ padding: "10px 16px 18px", flexShrink: 0, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", marginLeft: "7.5%" }}>
        {/* Input bar */}
        <div style={{
          flex: 1, display: "flex", alignItems: "flex-end",
          background: "#2e2e2e",
          border: `1px solid ${listening ? "#f5c84a" : "#3a3a3a"}`,
          borderRadius: "22px", overflow: "hidden",
          transition: "border-color 0.15s",
          boxShadow: listening ? "0 0 0 3px rgba(245,200,74,0.15)" : "none",
        }}>
          <textarea
            autoFocus
            value={value}
            rows={1}
            onChange={(e) => {
              onChange(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (value.trim() && !disabled) onSubmit(); }
            }}
            placeholder={disabled ? "Cass is thinking…" : "Keep going…"}
            disabled={disabled}
            style={{
              flex: 1, background: "transparent",
              border: "none", borderRadius: 0,
              padding: "9px 4px 9px 16px",
              fontFamily: "'Lora', Georgia, serif", fontSize: "14px",
              color: "#f8f8f6", caretColor: "#f5c84a",
              outline: "none", resize: "none",
              minHeight: "40px", maxHeight: "120px",
              lineHeight: "1.5", scrollbarWidth: "none",
            }}
          />
          {/* Voice button — hidden while typing */}
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Stop recording" : "Voice input"}
            style={{
              display: value.trim() && !listening ? "none" : "flex",
              alignItems: "center", gap: "5px",
              background: listening ? "rgba(245,200,74,0.15)" : "transparent",
              border: "none",
              borderLeft: `1px solid ${listening ? "rgba(245,200,74,0.3)" : "#3a3a3a"}`,
              padding: "0 14px", height: "100%", minHeight: "40px",
              cursor: "pointer", flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
              {[{ x: 0, h: 4, y: 5 }, { x: 3, h: 8, y: 3 }, { x: 6, h: 14, y: 0 }, { x: 9, h: 8, y: 3 }, { x: 12, h: 4, y: 5 }].map((bar, i) => (
                <rect key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1" fill={listening ? "#f5c84a" : "#888"} />
              ))}
            </svg>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: listening ? "#f5c84a" : "#888",
            }}>
              {listening ? "Stop" : "Voice"}
            </span>
          </button>
        </div>
        {/* Send button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Send"
          style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: value.trim() && !disabled ? "#f5c84a" : "#2e2e2e",
            border: "none", cursor: value.trim() && !disabled ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s",
          }}
        >
          <span className="material-icons" style={{ fontSize: "18px", color: value.trim() && !disabled ? "#0a0a0a" : "#555" }}>
            arrow_upward
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CassChapterKickoff({
  project,
  board,
  columns,
  chapterNumber,
  onComplete,
  onDismiss,
  isPrefilled,
}: {
  project: Project;
  board: Board;
  columns: BoardColumn[];
  chapterNumber: number;
  onComplete: () => void;
  onDismiss?: () => void;
  isPrefilled: boolean;
}) {
  const { activeAvatar } = useAvatar();

  const [messages, setMessages] = useState<DialogueMessage[]>([OPENER_TRIGGER]);
  const [currentReply, setCurrentReply] = useState("");
  const [animState, setAnimState] = useState<CassAnimState>("recording");
  const [inputValue, setInputValue] = useState("");
  const [kickoffData, setKickoffData] = useState<CassEnhancedKickoffDialogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryMessages, setRetryMessages] = useState<DialogueMessage[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isPending, currentReply]);

  // Fetch opener on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/chat/cass-chapter-kickoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [], projectId: project.id, chapterId: board.id, avatar: activeAvatar }),
        });
        const data = (await response.json()) as CassEnhancedKickoffDialogue & { error?: string };
        if (!response.ok) throw new Error(data.error ?? CASS_ERROR_LINES[0]);
        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);
        setMessages([OPENER_TRIGGER, { role: "assistant", content: reply }]);
        setCurrentReply(reply);
        setAnimState("talking");
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }, []);

  const isListening = animState === "listening" && !isPending;
  const showInput = !kickoffData && !isSaving;

  async function callKickoffApi(msgs: DialogueMessage[], attempt = 1): Promise<CassEnhancedKickoffDialogue & { error?: string }> {
    const response = await fetch("/api/chat/cass-chapter-kickoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, projectId: project.id, chapterId: board.id, avatar: activeAvatar }),
    });
    const data = (await response.json()) as CassEnhancedKickoffDialogue & { error?: string };
    if (!response.ok) {
      if (attempt === 1) return callKickoffApi(msgs, 2);
      throw new Error(data.error ?? CASS_ERROR_LINES[0]);
    }
    return data;
  }

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || isPending) return;
    const next: DialogueMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInputValue("");
    setAnimState("recording");
    setCurrentReply("");
    setError(null);
    setRetryMessages(null);
    startTransition(async () => {
      try {
        const data = await callKickoffApi(next);
        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);
        setMessages([...next, { role: "assistant", content: reply }]);
        setCurrentReply(reply);
        setAnimState("talking");
        if (data.done) setKickoffData(data);
      } catch (err) {
        setRetryMessages(next);
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleRetry() {
    if (!retryMessages || isPending) return;
    setError(null);
    setAnimState("recording");
    setCurrentReply("");
    startTransition(async () => {
      try {
        const data = await callKickoffApi(retryMessages, 1);
        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);
        setMessages([...retryMessages, { role: "assistant", content: reply }]);
        setCurrentReply(reply);
        setAnimState("talking");
        setRetryMessages(null);
        if (data.done) setKickoffData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleReplyComplete() {
    if (kickoffData) saveKickoff(kickoffData);
    else setAnimState("listening");
  }

  function saveKickoff(data: CassEnhancedKickoffDialogue) {
    setAnimState("recording");
    startSaveTransition(async () => {
      try {
        await completeChapterKickoffAction({
          projectId: project.id,
          boardId: board.id,
          goal: data.goal,
          whyItMatters: data.whyItMatters,
          successLooksLike: data.successLooksLike,
          doneDefinition: data.doneDefinition,
          openingLine: data.openingLine,
          conversation: messages.filter((m) => m.content !== OPENER_TRIGGER.content),
          tasks: (data.proposedTasks ?? []).map((t) => ({ title: t.title })),
          columns: columns.map((c) => ({ id: c.id, name: c.name })),
          kickoffBeats: data.kickoffBeats,
          confirmedThesis: data.confirmedThesis || undefined,
        });
        setAnimState("idle");
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[2]);
        setAnimState("listening");
      }
    });
  }

  // Messages to show in the feed (strip the synthetic opener trigger)
  const feedMessages = messages.filter((m) => m.content !== OPENER_TRIGGER.content);
  // The latest assistant message is shown via CassSpeechBubble when typing
  const historyMessages = currentReply && feedMessages.length > 0
    ? feedMessages.slice(0, -1)
    : feedMessages;

  const userHasSent = messages.some((m) => m.role === "user" && m.content !== OPENER_TRIGGER.content);
  const progressPercent = kickoffData || isSaving ? 85 : isPending && userHasSent ? 55 : userHasSent ? 30 : 0;

  return (
    <>
      <style>{`
        @keyframes cass-kickoff-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kickoff-dot-pulse {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
        .kickoff-scrollbar { scrollbar-width: none; }
        .kickoff-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        flex: 1, minHeight: 0,
        display: "flex", flexDirection: "column",
        background: "#242424",
      }}>

        {/* Progress bar */}
        <CassProgressBar percent={progressPercent} />

        {/* Header — black bar with tape logo centered, X at absolute right */}
        <div style={{
          background: "#0a0a0a", borderBottom: "1px solid #1e1e1e",
          padding: "8px 16px", display: "flex",
          alignItems: "center", justifyContent: "center",
          position: "relative", flexShrink: 0,
        }}>
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            style={{ width: "auto", height: "44px", objectFit: "contain" }}
          />
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              style={{
                position: "absolute", right: "16px", top: "50%",
                transform: "translateY(-50%)",
                background: "transparent", border: "none",
                color: "#555", cursor: "pointer",
                fontSize: "18px", lineHeight: 1, padding: "4px",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#999"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{
          background: "#242424", padding: "5px 16px 0",
          display: "flex", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(248,248,246,0.25)",
          }}>
            Chapter {chapterNumber} Kickoff
          </span>
        </div>

        {/* Scrollable message feed */}
        <div
          ref={scrollRef}
          className="kickoff-scrollbar"
          style={{
            flex: 1, overflowY: "auto",
            padding: "24px 16px 12px",
            display: "flex", flexDirection: "column", gap: "16px",
            boxSizing: "border-box",
          }}
        >
          {/* Cass FAB — anchored at top of feed */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", animation: "cass-kickoff-fade-up 0.4s ease" }}>
            <CassRecorder animState={animState} size="sm" />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "10px", fontWeight: 600,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(248,248,246,0.35)",
            }}>
              Cass · Story Guide
            </span>
          </div>

          {/* Conversation history */}
          {historyMessages.map((msg, i) => (
            msg.role === "assistant" ? (
              <div
                key={i}
                style={{
                  maxWidth: "85%", width: "100%", margin: "0 auto",
                  animation: "cass-kickoff-fade-up 0.3s ease forwards",
                }}
              >
                {msg.content.split("\n\n").map((para, j) => (
                  <p key={j} style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "15px", lineHeight: "1.65",
                    color: "#f8f8f6", margin: j > 0 ? "10px 0 0" : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end", animation: "cass-kickoff-fade-up 0.3s ease forwards" }}>
                <div style={{
                  background: "#3a3a3a",
                  borderRadius: "18px 18px 4px 18px",
                  padding: "10px 14px", maxWidth: "80%",
                }}>
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px", lineHeight: "1.55",
                    color: "#f8f8f6", margin: 0,
                  }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            )
          ))}

          {/* Current reply — typewriter (plain Lora text, no bubble border) */}
          {currentReply && (
            <div
              style={{
                maxWidth: "85%", width: "100%", margin: "0 auto",
                animation: "cass-kickoff-fade-up 0.3s ease forwards",
              }}
            >
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "15px", lineHeight: "1.65",
                color: "#f8f8f6", margin: 0, whiteSpace: "pre-wrap",
              }}>
                <TypewriterText key={currentReply} text={currentReply} onComplete={handleReplyComplete} speed={24} />
              </p>
            </div>
          )}

          {/* Typing indicator */}
          {isPending && !currentReply && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "2px", animation: "cass-kickoff-fade-up 0.2s ease" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: "#f5c84a",
                  animation: `kickoff-dot-pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          )}

          {/* Saving indicator */}
          {isSaving && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "2px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: "rgba(245,200,74,0.5)",
                  animation: `kickoff-dot-pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "85%", margin: "0 auto", width: "100%" }}>
              <p style={{
                color: "#ff6b5b",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px", textAlign: "center", margin: 0, lineHeight: 1.5,
              }}>
                Something went wrong — your conversation is still here.
              </p>
              {retryMessages && (
                <TapeButton variant="secondary" size="sm" onClick={handleRetry} disabled={isPending}>
                  {isPending ? "◉ retrying..." : "↺ Try again"}
                </TapeButton>
              )}
            </div>
          )}
        </div>

        {/* Input footer — always visible until kickoff is saved */}
        {showInput && (
          <KickoffInputFooter
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            disabled={isPending || isSaving}
          />
        )}
      </div>
    </>
  );
}
