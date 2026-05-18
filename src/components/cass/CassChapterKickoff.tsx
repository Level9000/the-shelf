"use client";

import { useState, useTransition } from "react";
import type { CassAnimState } from "./cassVoice";
import type { AIKickoffDialogue } from "@/lib/ai/schema";
import type { Board, BoardColumn, Project } from "@/types";
import { CassRecorder } from "./CassRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import { completeChapterKickoffAction } from "@/lib/actions/project-actions";
import { CASS_ERROR_LINES } from "./cassVoice";

type DialogueMessage = { role: "user" | "assistant"; content: string };

// Opening message is sent from the API — we show an opening state
function buildOpeningMessage(
  chapterNumber: number,
  previousChapterGoal: string | null,
  isPrefilled: boolean,
): DialogueMessage {
  if (isPrefilled) {
    return {
      role: "assistant",
      content: `Chapter ${chapterNumber}. Tape's loaded from our planning session. Let me read back what we set up — tell me if it still fits.`,
    };
  }
  if (previousChapterGoal) {
    return {
      role: "assistant",
      content: `Chapter ${chapterNumber}. New tape, new side.\n\nLast time we ${previousChapterGoal.toLowerCase()}. This time — what are we going for?`,
    };
  }
  return {
    role: "assistant",
    content: `Chapter ${chapterNumber}. Tape's rolling. What are we building this sprint?`,
  };
}

export function CassChapterKickoff({
  project,
  board,
  columns,
  chapterNumber,
  previousChapterGoal,
  onComplete,
  onDismiss,
  isPrefilled,
}: {
  project: Project;
  board: Board;
  columns: BoardColumn[];
  chapterNumber: number;
  previousChapterGoal?: string | null;
  onComplete: () => void;
  onDismiss?: () => void;
  isPrefilled: boolean;
}) {
  const openingMsg = buildOpeningMessage(
    chapterNumber,
    previousChapterGoal ?? null,
    isPrefilled,
  );

  const [messages, setMessages] = useState<DialogueMessage[]>([openingMsg]);
  const [currentReply, setCurrentReply] = useState(openingMsg.content);
  const [animState, setAnimState] = useState<CassAnimState>("talking");
  const [inputValue, setInputValue] = useState("");
  const [kickoffData, setKickoffData] = useState<AIKickoffDialogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const isListening = animState === "listening" && !isPending;

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || isPending) return;

    const next: DialogueMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(next);
    setInputValue("");
    setAnimState("recording");
    setCurrentReply("");
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat/cass-chapter-kickoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next,
            projectId: project.id,
            chapterId: board.id,
          }),
        });

        const data = (await response.json()) as AIKickoffDialogue & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? CASS_ERROR_LINES[0]);
        }

        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);

        const withReply: DialogueMessage[] = [
          ...next,
          { role: "assistant", content: reply },
        ];
        setMessages(withReply);
        setCurrentReply(reply);
        setAnimState("talking");

        if (data.done) {
          setKickoffData(data);
          // Save it automatically after closing line is shown
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleReplyComplete() {
    if (kickoffData) {
      // Save after closing line finishes
      saveKickoff(kickoffData);
    } else {
      setAnimState("listening");
    }
  }

  function saveKickoff(data: AIKickoffDialogue) {
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
          conversation: messages,
          tasks: (data.proposedTasks ?? []).map((t) => ({ title: t.title })),
          columns: columns.map((c) => ({ id: c.id, name: c.name })),
        });

        setAnimState("idle");
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[2]);
        setAnimState("listening");
      }
    });
  }

  return (
    <>
      <style>{`
        @keyframes cass-pulse-expand {
          0% { transform: scale(0.7); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes cass-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)",
          padding: "24px 16px",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          color: "#c8c8c8",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "transparent",
              border: "none",
              color: "#444",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              padding: "4px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
          >
            ✕
          </button>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "480px",
          }}
        >
          <CassRecorder animState={animState} size="md" />

          {/* Speech area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
              padding: "24px 0 16px",
            }}
          >
            {currentReply && (
              <CassSpeechBubble
                key={currentReply}
                text={currentReply}
                onComplete={handleReplyComplete}
                speed={24}
              />
            )}

            {(isPending || isSaving) && !currentReply && (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(200,168,107,0.15)",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  width: "100%",
                  minHeight: "64px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "13px",
                    color: "#555",
                    letterSpacing: "1px",
                  }}
                >
                  {isSaving ? "◉ saving..." : "◉ rolling..."}
                </span>
              </div>
            )}

            {error && (
              <p
                style={{
                  color: "#ff3b30",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "13px",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                {error}
              </p>
            )}

            {isListening && (
              <CassInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSend}
                placeholder="Keep going..."
                autoFocus
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
