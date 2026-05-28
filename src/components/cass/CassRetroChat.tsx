"use client";

import { useState, useTransition } from "react";
import type { CassAnimState } from "./cassVoice";
import type { Board, Task } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import {
  completeChapterRetroAction,
  updateChapterStoryAfterGenerationAction,
} from "@/lib/actions/project-actions";
import { CASS_ERROR_LINES } from "./cassVoice";

type DialogueMessage = { role: "user" | "assistant"; content: string };

// The enhanced retro payload now collects beats instead of writing the story.
type EnhancedRetroPayload = {
  reply:        string;
  done:         boolean;
  currentBeat?: "accounting" | "surprise" | "learning" | "emotional_close" | "bridge";
  bridge_sentence?: string;
  retroBeats?: {
    accounting:       { overall_rating: string; most_proud_of: string };
    surprise:         { biggest_surprise: string; easier_than_expected: string; harder_than_expected: string; unplanned_events: string };
    learning:         { new_knowledge: string; thinking_shift: string; would_do_differently: string };
    emotional_close:  { gut_feeling_delta: string; road_ahead_feeling: string; weighing_or_energizing: string };
  };
  // Legacy fields (kept for backwards compat)
  chapter_story?:         string;
  chapter_title?:         string;
  accumulative_paragraph?: string;
  error?: string;
};

// Payload from /api/story/generate
type GeneratedStoryPayload = {
  headline:    string;
  subheadline: string;
  body:        string;
  chapterType: string;
  pullQuote:   string;
  error?:      string;
};

type RetroPhase =
  | "conversation"           // Active retro conversation
  | "saving"                 // Saving retro beats to DB
  | "generating"             // Narrative engine running (Pass 1 + Pass 2)
  | "done";                  // Story ready, call onComplete

function buildOpeningMessage(
  chapterNumber: number,
  chapterGoal: string | null,
  completedCount: number,
  incompleteCount: number,
): DialogueMessage {
  const total = completedCount + incompleteCount;
  const text = [
    `Alright. Chapter ${chapterNumber} is done.`,
    "",
    `You said you wanted to ${chapterGoal?.toLowerCase() ?? "get something done"}. Let's see what actually happened.`,
    "",
    `You completed ${completedCount} of ${total} cards. On a scale of 1–5, how would you rate this chapter overall?`,
  ].join("\n");

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
    id:                string;
    name:              string;
    accumulativeStory?: string | null;
  };
  board: Board;
  completedTasks: Task[];
  remainingTasks: Task[];
  onComplete: (data: { chapterStory: string; pullQuote: string; headline?: string; subheadline?: string; chapterType?: string }) => void;
  onDismiss?: () => void;
}) {
  const chapterNumber = 1; // API calculates the real number; this is display-only

  const openingMsg = buildOpeningMessage(
    chapterNumber,
    board.goal,
    completedTasks.length,
    remainingTasks.length,
  );

  const [messages,      setMessages]      = useState<DialogueMessage[]>([openingMsg]);
  const [currentReply,  setCurrentReply]  = useState(openingMsg.content);
  const [animState,     setAnimState]     = useState<CassAnimState>("talking");
  const [inputValue,    setInputValue]    = useState("");
  const [phase,         setPhase]         = useState<RetroPhase>("conversation");
  const [retroData,     setRetroData]     = useState<EnhancedRetroPayload | null>(null);
  const [shareSlug,     setShareSlug]     = useState<string>("");
  const [generatedStory, setGeneratedStory] = useState<GeneratedStoryPayload | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [isPending,     startTransition]  = useTransition();
  const [isSaving,      startSaveTransition] = useTransition();

  const isListening = animState === "listening" && !isPending && phase === "conversation";

  // Progress bar: conversation = 0–50%, saving = 55%, generating = 65–90%, done = 100%
  function progressPercent(): number {
    if (phase === "done")       return 100;
    if (phase === "generating") return 75;
    if (phase === "saving")     return 55;
    if (retroData)              return 50;
    return 30;
  }

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || isPending || phase !== "conversation") return;

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

        const data = (await response.json()) as EnhancedRetroPayload;

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

        // If retro beats collected and bridge confirmed, store payload for saving
        if (data.done) {
          setRetroData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }

  function handleReplyComplete() {
    if (phase === "conversation" && retroData?.done) {
      // Kick off the save + generation pipeline
      saveRetroAndGenerate(retroData, messages);
    } else if (phase === "conversation") {
      setAnimState("listening");
    }
  }

  function saveRetroAndGenerate(data: EnhancedRetroPayload, conversation: DialogueMessage[]) {
    setPhase("saving");
    setAnimState("recording");

    startSaveTransition(async () => {
      try {
        // Step 1: Save retro beats to DB
        const { shareSlug: slug } = await completeChapterRetroAction({
          projectId:    project.id,
          boardId:      board.id,
          conversation,
          retroBeats:   data.retroBeats ?? null,
          bridgeSentence: data.bridge_sentence ?? "",
          // Legacy fallback if old schema comes back
          chapterStory:          data.chapter_story ?? undefined,
          accumulativeParagraph: data.accumulative_paragraph ?? undefined,
        });

        setShareSlug(slug);
        setPhase("generating");

        // Show "writing your chapter" message
        setCurrentReply("Give me a moment. Writing this chapter now.");
        setAnimState("talking");

        // Step 2: Trigger narrative engine (Pass 1 + Pass 2)
        const genResponse = await fetch("/api/story/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            chapterId: board.id,
          }),
        });

        const generated = (await genResponse.json()) as GeneratedStoryPayload;

        if (!genResponse.ok) {
          throw new Error(generated.error ?? "Chapter generation failed.");
        }

        setGeneratedStory(generated);
        setPhase("done");
        setAnimState("idle");

        // Step 3: Update accumulative story on project with generated chapter body
        await updateChapterStoryAfterGenerationAction({
          projectId:  project.id,
          boardId:    board.id,
          shareSlug:  slug,
          chapterBody: generated.body,
        });

        // Brief pause for celebration animation, then call onComplete
        setTimeout(() => {
          onComplete({
            chapterStory: generated.body,
            pullQuote:    generated.pullQuote,
            headline:     generated.headline,
            subheadline:  generated.subheadline,
            chapterType:  generated.chapterType,
          });
        }, 1200);

      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[2]);
        setPhase("conversation");
        setAnimState("listening");
      }
    });
  }

  const saved = phase === "done";

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
          fontFamily: "var(--font-cass)",
          color: "#c8c8c8",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Progress bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <CassProgressBar percent={progressPercent()} />
        </div>

        {/* Dismiss button */}
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
          {/* Cass recorder with celebration glow when done */}
          <div
            style={{
              borderRadius: "50%",
              animation: saved ? "cass-celebration 1.8s ease-in-out" : "none",
            }}
          >
            <CassRecorder animState={animState} size="md" />
          </div>

          {/* Phase label */}
          {phase === "generating" && (
            <div
              style={{
                marginTop: "8px",
                fontFamily: "var(--font-cass)",
                fontSize: "11px",
                letterSpacing: "2px",
                color: "rgba(200,168,107,0.6)",
                textTransform: "uppercase",
              }}
            >
              ◉ Writing your chapter...
            </div>
          )}

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
                    fontFamily: "var(--font-cass)",
                    fontSize: "13px",
                    color: "#555",
                    letterSpacing: "1px",
                  }}
                >
                  {phase === "generating"
                    ? "◉ writing your chapter..."
                    : phase === "saving"
                    ? "◉ saving..."
                    : "◉ rolling..."}
                </span>
              </div>
            )}

            {error && (
              <p
                style={{
                  color: "#ff3b30",
                  fontFamily: "var(--font-cass)",
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
