"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CassAnimState } from "./cassVoice";
import type { BoardColumn } from "@/types";
import { CassRecorder } from "./CassRecorder";
import { VoiceInputFooter } from "./VoiceInputFooter";
import { CASS_ERROR_LINES } from "./cassVoice";
import { TapeButton } from "@/components/ui/tape-button";
import { useTheme } from "@/lib/theme-context";
import { createBrainDumpCardsAction } from "@/lib/actions/task-actions";
import { addStoryFragmentAction } from "@/lib/actions/story-fragment-actions";

type DialogueMessage = { role: "user" | "assistant"; content: string };
type ProposedTask = { title: string };
type Phase = "conversation" | "saving" | "done";

const TTS_VOLUME = 1.0;

function openingMessage(projectName: string): DialogueMessage {
  return { role: "assistant", content: `How'd things go today on ${projectName}?` };
}

// Matches the standard "chat" mode transcript convention used elsewhere in the
// drawer: Cass's messages render as plain text (no bubble), only the
// author's own messages get a bubble — see cass-board-drawer.tsx's chat mode.
const USER_BUBBLE: React.CSSProperties = {
  background: "rgba(200,168,107,0.1)",
  border: "1px solid rgba(200,168,107,0.22)",
  borderRadius: "18px 18px 4px 18px",
  padding: "10px 14px",
  fontFamily: "'Lora', Georgia, serif",
  fontSize: "15px",
  lineHeight: "1.55",
  maxWidth: "80%",
};

export function CassDailyTestimonialChat({
  project,
  board,
  columns,
  onComplete,
}: {
  project: { id: string; name: string };
  board: { id: string; name: string };
  columns: BoardColumn[];
  onComplete: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const opening = openingMessage(project.name);

  const [messages, setMessages] = useState<DialogueMessage[]>([opening]);
  const [animState, setAnimState] = useState<CassAnimState>("talking");
  const [inputValue, setInputValue] = useState("");
  const [voiceMode, setVoiceMode] = useState(true);
  const [phase, setPhase] = useState<Phase>("conversation");
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryMessages, setRetryMessages] = useState<DialogueMessage[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const openMicRef = useRef<(() => void) | null>(null);
  const doneRef = useRef(false);

  const isListening = animState === "listening" && !isPending && phase === "conversation";

  async function speakAsCass(text: string) {
    if (!voiceMode || !text.trim()) return;
    setAnimState("talking");
    const onEnd = () => {
      if (doneRef.current) return;
      setAnimState("listening");
      openMicRef.current?.();
    };
    try {
      const res = await fetch("/api/tts/cass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = TTS_VOLUME;
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
      audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
      await audio.play();
    } catch {
      onEnd();
    }
  }

  // Speak the opening line once on mount.
  useEffect(() => {
    speakAsCass(opening.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function callApi(msgs: DialogueMessage[], attempt = 1): Promise<{
    reply: string;
    done: boolean;
    proposedTasks: ProposedTask[];
    error?: string;
  }> {
    const response = await fetch("/api/chat/cass-daily-testimonial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: msgs,
        projectId: project.id,
        chapterId: board.id,
        alreadyProposedTasks: proposedTasks.map((t) => t.title),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (attempt === 1) {
        console.warn("[daily testimonial] first attempt failed, retrying…");
        return callApi(msgs, 2);
      }
      throw new Error(data.error ?? CASS_ERROR_LINES[0]);
    }
    return data;
  }

  function handleTurn(next: DialogueMessage[]) {
    setMessages(next);
    setAnimState("recording");
    setError(null);
    setRetryMessages(null);

    startTransition(async () => {
      try {
        const data = await callApi(next);
        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);

        const withReply = [...next, { role: "assistant" as const, content: reply }];
        setMessages(withReply);

        const allProposed = data.proposedTasks?.length
          ? [...proposedTasks, ...data.proposedTasks]
          : proposedTasks;
        if (data.proposedTasks?.length) setProposedTasks(allProposed);

        if (data.done) {
          doneRef.current = true;
          speakAsCass(reply);
          saveAndClose(withReply, allProposed);
        } else {
          speakAsCass(reply);
        }
      } catch (err) {
        setRetryMessages(next);
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleSend(text?: string) {
    const trimmed = (text ?? inputValue).trim();
    if (!trimmed || isPending || phase !== "conversation") return;
    setInputValue("");
    handleTurn([...messages, { role: "user", content: trimmed }]);
  }

  function handleRetry() {
    if (!retryMessages || isPending) return;
    handleTurn(retryMessages);
  }

  function saveAndClose(finalMessages: DialogueMessage[], tasks: ProposedTask[]) {
    setPhase("saving");
    startSaveTransition(async () => {
      try {
        if (tasks.length > 0) {
          await createBrainDumpCardsAction({
            projectId: project.id,
            boardId: board.id,
            conversationId: null,
            columnMap: columns.map((c) => ({ id: c.id, name: c.name })),
            cards: tasks.map((t) => ({
              title: t.title,
              column: "Do This Week",
              context: "Added during a daily check-in.",
              rawQuote: "",
            })),
          });
        }
        const closingReply = finalMessages[finalMessages.length - 1]?.content ?? "";
        await addStoryFragmentAction({
          projectId: project.id,
          chapterId: board.id,
          source: "daily_testimonial",
          content: closingReply,
          conversation: finalMessages,
        });
        setPhase("done");
        setTimeout(onComplete, 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save today's check-in.");
        setPhase("conversation");
        doneRef.current = false;
        setAnimState("listening");
      }
    });
  }

  const textPrimary = isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)";
  const textMuted = isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)";
  const dotColor = "#c8a86b";

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      background: isDark ? "#0a0a0a" : "var(--surface)",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)"
        : "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.06) 0%, transparent 60%)",
    }}>
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "28px 20px 16px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: "16px", scrollbarWidth: "none",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <CassRecorder animState={isPending ? "playing" : animState} size="sm" />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted,
          }}>
            Cass · Story Guide
          </span>
        </div>

        {proposedTasks.length > 0 && (
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.1em", margin: 0, color: "#c8a86b",
          }}>
            {proposedTasks.length} task{proposedTasks.length === 1 ? "" : "s"} added
          </p>
        )}

        <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "14px" }}>
          {messages.map((msg, i) => (
            msg.role === "assistant" ? (
              <div key={i}>
                {msg.content.split("\n\n").map((para, j) => (
                  <p key={j} style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "15px", lineHeight: "1.65",
                    color: textPrimary,
                    margin: j > 0 ? "10px 0 0" : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ ...USER_BUBBLE, color: isDark ? "#e8c789" : "#8a6d2f" }}>{msg.content}</div>
              </div>
            )
          ))}

          {(isPending || isSaving) && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "2px" }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{
                  width: "7px", height: "7px", borderRadius: "50%", background: dotColor,
                  display: "block", animation: `cassDailyCaretBlink 1.2s ease-in-out ${d * 0.15}s infinite`,
                }} />
              ))}
            </div>
          )}

          {error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px", width: "100%" }}>
              <p style={{ color: "#ff6b5b", fontFamily: "'Literata', Georgia, serif", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
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
      </div>

      <style>{`
        @keyframes cassDailyCaretBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0; } }
      `}</style>

      {isListening && phase === "conversation" && (
        <VoiceInputFooter
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          voiceMode={voiceMode}
          isCassSpeaking={false}
          onRegisterOpenMic={(fn) => { openMicRef.current = fn; }}
          onEnterVoiceMode={() => setVoiceMode(true)}
          onExitVoiceMode={() => setVoiceMode(false)}
        />
      )}
    </div>
  );
}
