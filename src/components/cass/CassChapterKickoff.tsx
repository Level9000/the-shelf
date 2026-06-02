"use client";

import { useState, useTransition, useEffect } from "react";
import type { CassAnimState } from "./cassVoice";
import type { CassEnhancedKickoffDialogue } from "@/lib/ai/schema";
import type { Board, BoardColumn, Project } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { AvatarRecorder } from "@/components/ui/AvatarRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import { completeChapterKickoffAction } from "@/lib/actions/project-actions";
import { CASS_ERROR_LINES } from "./cassVoice";
import { useAvatar } from "@/lib/avatar-context";
import { ConversationTracker, KICKOFF_STEPS } from "./ConversationTracker";

type DialogueMessage = { role: "user" | "assistant"; content: string };

// Synthetic first-user turn that satisfies Anthropic's message-alternation rule.
// Never shown in the UI — just primes the AI to deliver its opener.
const OPENER_TRIGGER: DialogueMessage = { role: "user", content: "__kickoff_open__" };

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

  // Start in loading state — opener is fetched from the API on mount
  const [messages, setMessages] = useState<DialogueMessage[]>([OPENER_TRIGGER]);
  const [currentReply, setCurrentReply] = useState("");
  const [animState, setAnimState] = useState<CassAnimState>("recording");
  const [inputValue, setInputValue] = useState("");
  const [kickoffData, setKickoffData] = useState<CassEnhancedKickoffDialogue | null>(null);
  const [currentBeat, setCurrentBeat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  // Fetch the AI-generated opener on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/chat/cass-chapter-kickoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],          // empty = opener request
            projectId: project.id,
            chapterId: board.id,
            avatar: activeAvatar,
          }),
        });

        const data = (await response.json()) as CassEnhancedKickoffDialogue & { error?: string };
        if (!response.ok) throw new Error(data.error ?? CASS_ERROR_LINES[0]);

        const reply = data.reply?.trim();
        if (!reply) throw new Error(CASS_ERROR_LINES[1]);

        setMessages([OPENER_TRIGGER, { role: "assistant", content: reply }]);
        setCurrentReply(reply);
        setAnimState("talking");
        if (data.currentBeat) setCurrentBeat(data.currentBeat);
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
        setAnimState("listening");
      }
    });
  }, []);

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
            avatar: activeAvatar,
          }),
        });

        const data = (await response.json()) as CassEnhancedKickoffDialogue & {
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
        if (data.currentBeat) setCurrentBeat(data.currentBeat);

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
          // Strip the synthetic opener trigger before storing
          conversation: messages.filter((m) => m.content !== OPENER_TRIGGER.content),
          tasks: (data.proposedTasks ?? []).map((t) => ({ title: t.title })),
          columns: columns.map((c) => ({ id: c.id, name: c.name })),
          // Enhanced beats data (only present when done=true with new 3-beat flow)
          kickoffBeats:    data.kickoffBeats,
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
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)",
          fontFamily: "var(--font-cass)",
          color: "#c8c8c8",
        }}
      >
        {/* Progress bar — flush at the very top */}
        <CassProgressBar percent={kickoffData || isSaving ? 85 : 45} />

        {/* Header row — label left, optional dismiss right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-cass)",
              fontSize: "11px",
              letterSpacing: "2px",
              color: "rgba(200,168,107,0.8)",
              textTransform: "uppercase",
            }}
          >
            ◉ Chapter {chapterNumber} Kickoff
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                color: "#444",
                cursor: "pointer",
                fontSize: "18px",
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
        </div>

        {/* Cass content — centred in remaining space */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px 24px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              maxWidth: "480px",
            }}
          >
            <AvatarRecorder animState={animState} size="md" />

            {/* Step tracker — only shown once the conversation is underway */}
            {currentBeat && !kickoffData && (
              <ConversationTracker
                steps={KICKOFF_STEPS}
                currentStepId={currentBeat}
              />
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
                    {isSaving ? "◉ saving..." : "◉ rolling..."}
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
      </div>
    </>
  );
}
