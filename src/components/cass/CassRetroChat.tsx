"use client";

import { useState, useTransition } from "react";
import type { CassAnimState } from "./cassVoice";
import type { Board, Task } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import { completeChapterRetroAction } from "@/lib/actions/project-actions";
import { CASS_ERROR_LINES } from "./cassVoice";

type DialogueMessage = { role: "user" | "assistant"; content: string };

type RetroPayload = {
  reply: string;
  done: boolean;
  chapter_story: string;
  chapter_title: string;
  accumulative_paragraph: string;
  error?: string;
};

function buildOpeningMessage(
  chapterNumber: number,
  chapterGoal: string | null,
  completedCount: number,
  incompleteCount: number,
  standoutTitle: string | null,
): DialogueMessage {
  const total = completedCount + incompleteCount;
  let text = `Alright. Chapter ${chapterNumber} is done.\n\n`;

  if (total === 0) {
    text += `You said you wanted to ${chapterGoal?.toLowerCase() ?? "get something done"}. Let's see what actually happened.`;
  } else if (standoutTitle) {
    text += `You said you wanted to ${chapterGoal?.toLowerCase() ?? "get something done"}. You got ${completedCount} of ${total} things done — "${standoutTitle}" stood out. What happened there?`;
  } else {
    text += `You said you wanted to ${chapterGoal?.toLowerCase() ?? "get something done"}. Let's see what actually happened.`;
  }

  return { role: "assistant", content: text };
}

export function CassRetroChat({
  project,
  board,
  completedTasks,
  remainingTasks,
  onComplete,
  onDismiss,
}: {
  project: {
    id: string;
    name: string;
    accumulativeStory?: string | null;
  };
  board: Board;
  completedTasks: Task[];
  remainingTasks: Task[];
  onComplete: (data: { chapterStory: string; pullQuote: string }) => void;
  onDismiss?: () => void;
}) {
  // Determine chapter number from board position (approximate)
  const chapterNumber = 1; // API route calculates the real number; this is display-only

  // Select standout card: highest-priority completed, else first incomplete
  const standoutTitle =
    completedTasks.find((t) => t.priority === "high")?.title ??
    completedTasks.find((t) => t.priority === "medium")?.title ??
    completedTasks[0]?.title ??
    remainingTasks[0]?.title ??
    null;

  const openingMsg = buildOpeningMessage(
    chapterNumber,
    board.goal,
    completedTasks.length,
    remainingTasks.length,
    standoutTitle,
  );

  const [messages, setMessages] = useState<DialogueMessage[]>([openingMsg]);
  const [currentReply, setCurrentReply] = useState(openingMsg.content);
  const [animState, setAnimState] = useState<CassAnimState>("talking");
  const [inputValue, setInputValue] = useState("");
  const [approvedStory, setApprovedStory] = useState<RetroPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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
        const response = await fetch("/api/chat/cass-retro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next,
            projectId: project.id,
            chapterId: board.id,
          }),
        });

        const data = (await response.json()) as RetroPayload;

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

        if (data.done && data.chapter_story) {
          setApprovedStory(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleReplyComplete() {
    if (approvedStory) {
      saveRetro(approvedStory);
    } else {
      setAnimState("listening");
    }
  }

  function saveRetro(data: RetroPayload) {
    setAnimState("recording");

    startSaveTransition(async () => {
      try {
        await completeChapterRetroAction({
          projectId: project.id,
          boardId: board.id,
          conversation: messages,
          chapterStory: data.chapter_story,
          storyLength: data.chapter_story.length > 400 ? "long" : "short",
          pullQuote: data.chapter_title || data.chapter_story.slice(0, 120),
          accumulativeParagraph:
            data.accumulative_paragraph || data.chapter_story,
        });

        setSaved(true);
        setAnimState("idle");

        // Brief celebration pause before calling onComplete
        setTimeout(() => {
          onComplete({
            chapterStory: data.chapter_story,
            pullQuote: data.chapter_title || data.chapter_story.slice(0, 120),
          });
        }, 1800);
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
        @keyframes cass-celebration {
          0%   { box-shadow: 0 0 0 0 rgba(200,168,107,0); }
          50%  { box-shadow: 0 0 24px 8px rgba(200,168,107,0.3); }
          100% { box-shadow: 0 0 0 0 rgba(200,168,107,0); }
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
        {/* Progress bar — absolute at top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <CassProgressBar percent={saved ? 100 : approvedStory ? 82 : 45} />
        </div>

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
          {/* Cass recorder with optional celebration glow */}
          <div
            style={{
              borderRadius: "50%",
              animation: saved ? "cass-celebration 1.8s ease-in-out" : "none",
            }}
          >
            <CassRecorder animState={animState} size="md" />
          </div>

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
                  {isSaving ? "◉ writing this down..." : "◉ rolling..."}
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

            {isListening && !saved && (
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
