"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CassAnimState } from "./cassVoice";
import type { CassOnboardingDialogue } from "@/lib/ai/schema";
import type { WorkplanChapter } from "@/components/projects/workplan-proposal";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import { WorkplanProposal } from "@/components/projects/workplan-proposal";
import { completeProjectKickoffAction } from "@/lib/actions/project-actions";

// ── Scripted intro lines ──────────────────────────────────────────────────────

const INTRO_SCRIPT = [
  {
    id: "intro",
    state: "idle" as CassAnimState,
    text: "Oh — hey. You're here.",
    pause: 900,
    isQuestion: false,
  },
  {
    id: "intro2",
    state: "talking" as CassAnimState,
    text: "I'm Cass. I live here now. My whole job is to make sure nothing you build goes undocumented.",
    pause: 1200,
    isQuestion: false,
  },
  {
    id: "intro3",
    state: "talking" as CassAnimState,
    text: "Founders forget things. Great things. The real reason they built something. The 2am pivot. The moment it clicked.",
    pause: 1100,
    isQuestion: false,
  },
  {
    id: "intro4",
    state: "recording" as CassAnimState,
    text: "I don't let that happen. Every project you start, I'm rolling tape.",
    pause: 900,
    isQuestion: false,
  },
  {
    id: "question",
    state: "listening" as CassAnimState,
    text: "One question before we start — what are you building?",
    pause: null,
    isQuestion: true,
    placeholder: "Tell me anything. A sentence is fine.",
  },
] as const;

type IntroStep = (typeof INTRO_SCRIPT)[number];

type DialogueMessage = { role: "user" | "assistant"; content: string };

type Phase = "start" | "scripted" | "chatting" | "workplan" | "saving";

// ── Cass stage layout ─────────────────────────────────────────────────────────

function CassStage({
  animState,
  children,
}: {
  animState: CassAnimState;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "480px",
        gap: 0,
      }}
    >
      <CassRecorder animState={animState} size="md" />

      {/* Speech + interaction area */}
      <div
        style={{
          minHeight: "100px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          width: "100%",
          padding: "24px 0 16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Start screen ──────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
        textAlign: "center",
        maxWidth: "480px",
        width: "100%",
      }}
    >
      <div
        style={{
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: "11px",
          letterSpacing: "4px",
          color: "#444",
          textTransform: "uppercase",
        }}
      >
        Authored By
      </div>

      <CassRecorder animState="idle" size="md" />

      <div>
        <div
          style={{
            fontFamily: "'Special Elite', cursive",
            fontSize: "28px",
            color: "#e8e0d0",
            lineHeight: "1.3",
          }}
        >
          Meet Cass.
        </div>
      </div>

      {/* Tape decoration */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          opacity: 0.3,
        }}
      >
        <div style={{ width: "60px", height: "1px", background: "#c8a86b" }} />
        <span style={{ fontSize: "16px", color: "#c8a86b" }}>◉</span>
        <div style={{ width: "60px", height: "1px", background: "#c8a86b" }} />
      </div>

      <div
        style={{
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: "13px",
          color: "#555",
          lineHeight: "1.6",
          maxWidth: "340px",
        }}
      >
        Your onboarding guide. A good listener.
        <br />
        Never loses what you say.
      </div>

      <button
        type="button"
        onClick={onStart}
        style={{
          background: "transparent",
          border: "1px solid rgba(200,168,107,0.4)",
          color: "#c8a86b",
          borderRadius: "6px",
          padding: "12px 32px",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: "13px",
          letterSpacing: "2px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(200,168,107,0.08)";
          e.currentTarget.style.borderColor = "#c8a86b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(200,168,107,0.4)";
        }}
      >
        PRESS PLAY
      </button>
    </div>
  );
}

// ── Done card (shown briefly after user's first answer) ───────────────────────

function UserEcho({ answer }: { answer: string }) {
  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        fontSize: "13px",
        color: "#555",
        textAlign: "right",
        width: "100%",
        padding: "4px 0",
      }}
    >
      you said:{" "}
      <span style={{ color: "#c8a86b" }}>&ldquo;{answer}&rdquo;</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CassOnboardingChat({
  hasExistingProjects = false,
}: {
  hasExistingProjects?: boolean;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("start");
  const [step, setStep] = useState(0);
  const [animState, setAnimState] = useState<CassAnimState>("idle");
  const [inputValue, setInputValue] = useState("");
  const [firstAnswer, setFirstAnswer] = useState("");
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [currentReply, setCurrentReply] = useState("");
  const [projectData, setProjectData] = useState<CassOnboardingDialogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const currentScriptLine = INTRO_SCRIPT[step] as IntroStep | undefined;

  // ── Scripted line auto-advance ──────────────────────────────────────────────
  function handleScriptLineComplete() {
    if (!currentScriptLine || currentScriptLine.isQuestion) return;
    if (currentScriptLine.pause) {
      setTimeout(() => {
        const next = step + 1;
        if (next < INTRO_SCRIPT.length) {
          setStep(next);
          setAnimState(INTRO_SCRIPT[next].state);
        }
      }, currentScriptLine.pause);
    }
  }

  // ── User submits answer to "what are you building?" ──────────────────────────
  function handleFirstSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setFirstAnswer(trimmed);
    setAnimState("recording");

    // The first message to the AI is the user's answer
    const firstMessage: DialogueMessage = { role: "user", content: trimmed };
    const nextMessages = [firstMessage];
    setMessages(nextMessages);
    setInputValue("");
    setPhase("chatting");
    setError(null);

    startTransition(async () => {
      await sendToAI(nextMessages);
    });
  }

  // ── Subsequent user messages during AI conversation ───────────────────────────
  function handleChatSubmit() {
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
      await sendToAI(next);
    });
  }

  async function sendToAI(msgs: DialogueMessage[]) {
    try {
      const response = await fetch("/api/chat/cass-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });

      const data = (await response.json()) as CassOnboardingDialogue & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Tape got stuck. Try again.");
      }

      const reply = data.reply?.trim();
      if (!reply) throw new Error("Lost the signal for a second. Still here.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setCurrentReply(reply);
      setAnimState("talking");

      if (data.done) {
        setProjectData(data);
        setPhase("workplan");
        setAnimState("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tape got stuck. Try again.");
      setAnimState("idle");
    }
  }

  // Called when typewriter finishes the current AI reply
  function handleReplyComplete() {
    if (phase === "chatting" && !projectData) {
      setAnimState("listening");
    }
  }

  // ── User accepts workplan ──────────────────────────────────────────────────
  function handleAcceptWorkplan(chapters: WorkplanChapter[]) {
    if (!projectData) return;
    setError(null);
    setPhase("saving");

    startSaveTransition(async () => {
      try {
        const { projectId, chapter1Id } = await completeProjectKickoffAction({
          name: projectData.project_name || firstAnswer.slice(0, 80),
          northStar: projectData.north_star,
          projectGoal: projectData.project_goal,
          projectAudience: projectData.project_audience,
          projectSuccess: projectData.project_success,
          projectBiggestRisk: projectData.project_biggest_risk,
          conversation: messages,
          proposedChapters: chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            goal: ch.goal,
            prefill: ch.prefill ?? null,
          })),
        });

        router.push(`/projects/${projectId}/chapters/${chapter1Id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up project.");
        setPhase("workplan");
      }
    });
  }

  // ── Start button ────────────────────────────────────────────────────────────
  function handleStart() {
    setPhase("scripted");
    setStep(0);
    setAnimState(INTRO_SCRIPT[0].state);
  }

  // ── Workplan phase (reuse existing component, override background) ──────────
  if (phase === "workplan" && projectData) {
    const initialChapters: WorkplanChapter[] = projectData.proposed_chapters.map((ch) => ({
      chapterNumber: ch.chapter_number,
      title: ch.title,
      goal: ch.goal,
      prefill: ch.prefill
        ? {
            goal: ch.prefill.goal,
            value: ch.prefill.value,
            measure: ch.prefill.measure,
            done: ch.prefill.done,
          }
        : null,
    }));

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          color: "#c8c8c8",
        }}
      >
        <CassProgressBar percent={isSaving ? 100 : 80} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            justifyContent: "center",
          }}
        >
          <CassRecorder animState="idle" size="sm" />
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "10px",
                letterSpacing: "3px",
                color: "#c8a86b",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              ● Tape loaded
            </div>
            <div
              style={{
                fontFamily: "'Special Elite', cursive",
                fontSize: "18px",
                color: "#e8e0d0",
              }}
            >
              {projectData.project_name || "Your project"}
            </div>
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "#ff3b30",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "13px",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            {error}
          </p>
        )}

        <WorkplanProposal
          projectName={projectData.project_name || firstAnswer.slice(0, 80)}
          northStar={projectData.north_star}
          initialChapters={initialChapters}
          isSaving={isSaving}
          onAccept={handleAcceptWorkplan}
          error={null}
        />
        </div>
      </div>
    );
  }

  // ── Main Cass stage ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Global Cass keyframe styles */}
      <style>{`
        @keyframes cass-pulse-expand {
          0% { transform: scale(0.7); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes cass-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes cass-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          minHeight: "100dvh",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          color: "#c8c8c8",
          position: "relative",
        }}
      >
        {/* Progress bar — absolute at top of screen */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <CassProgressBar percent={
            phase === "start" ? 5 :
            phase === "scripted" ? 25 :
            phase === "chatting" ? 55 :
            phase === "workplan" ? 80 :
            100
          } />
        </div>

        {hasExistingProjects && (
          <button
            type="button"
            onClick={() => router.back()}
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

        {/* ── Start screen ──────────────────────────────────────────────────── */}
        {phase === "start" && <StartScreen onStart={handleStart} />}

        {/* ── Scripted intro + question ─────────────────────────────────────── */}
        {(phase === "scripted") && currentScriptLine && (
          <CassStage animState={animState}>
            <CassSpeechBubble
              key={step}
              text={currentScriptLine.text}
              onComplete={handleScriptLineComplete}
              speed={currentScriptLine.isQuestion ? 22 : 26}
            />
            {currentScriptLine.isQuestion && (
              <CassInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleFirstSubmit}
                placeholder={currentScriptLine.placeholder ?? "Tell me anything."}
                autoFocus
              />
            )}
          </CassStage>
        )}

        {/* ── AI chat ──────────────────────────────────────────────────────── */}
        {phase === "chatting" && (
          <CassStage animState={animState}>
            {firstAnswer && <UserEcho answer={firstAnswer} />}

            {/* Show the current AI reply with typewriter */}
            {currentReply && (
              <CassSpeechBubble
                key={currentReply}
                text={currentReply}
                onComplete={handleReplyComplete}
                speed={24}
              />
            )}

            {/* Loading state */}
            {isPending && !currentReply && (
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
                  ◉ rolling...
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

            {/* Input — show when Cass is listening (not pending) */}
            {animState === "listening" && !isPending && (
              <CassInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleChatSubmit}
                placeholder="Keep going..."
                autoFocus
              />
            )}
          </CassStage>
        )}

        {/* ── Saving state ─────────────────────────────────────────────────── */}
        {phase === "saving" && (
          <CassStage animState="recording">
            <CassSpeechBubble
              text="Setting up your project. One second."
              animate={false}
            />
          </CassStage>
        )}
      </div>
    </>
  );
}
