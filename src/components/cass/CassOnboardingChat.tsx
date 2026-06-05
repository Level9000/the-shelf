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
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";
import { WorkplanProposal } from "@/components/projects/workplan-proposal";
import { completeProjectKickoffAction } from "@/lib/actions/project-actions";
import { TapeButton } from "@/components/ui/tape-button";

// ── Scripted intro lines ──────────────────────────────────────────────────────

const INTRO_SCRIPT = [
  {
    id: "tape",
    state: "recording" as CassAnimState,
    text: "Alright. Tape's rolling.",
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

type Phase = "intro" | "start" | "scripted" | "chatting" | "workplan" | "saving";

// ── Cass-narrated intro slides ────────────────────────────────────────────────

const INTRO_SLIDES = [
  {
    id: "welcome",
    cassText: "Hey — I'm Cass. Welcome to Authored By, your founder's story engine.\n\nEvery project you build has a real story behind it: the decisions, the pivots, the 2am moments that changed everything. My job is to make sure none of it gets lost.",
    showTy: false,
    showPress: false,
    isLast: false,
  },
  {
    id: "meet-ty",
    cassText: "You won't be working alone. This is Ty — a narrative writer. When you're ready to share what you've built, Ty takes everything we've captured and helps craft the story that lands: launch posts, press releases, the narrative your audience actually connects with.",
    showTy: true,
    showPress: false,
    isLast: false,
  },
  {
    id: "meet-press",
    cassText: "And this is Press — your presentation designer. Press takes everything Ty and I have built and turns it into something you can put in front of a room: pitch decks, investor updates, board presentations. Professional, polished, ready to send.",
    showTy: true,
    showPress: true,
    isLast: false,
  },
  {
    id: "lets-go",
    cassText: "Together, we cover the whole journey — I capture the story as you build it, Ty shapes it into something worth reading, and Press turns it into presentations that get results. Let's start your first project.",
    showTy: false,
    showPress: false,
    isLast: true,
  },
] as const;

function AvatarLabel({ name, role }: { name: string; role: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "8px" }}>
      <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "#c8a86b", fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: "var(--font-cass)", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginTop: "2px" }}>{role}</div>
    </div>
  );
}

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);

  const slide = INTRO_SLIDES[slideIndex];

  function advance() {
    setTextVisible(false);
    setTimeout(() => {
      if (slide.isLast) {
        onComplete();
      } else {
        setSlideIndex((i) => i + 1);
        setTextVisible(true);
      }
    }, 260);
  }

  function goBack() {
    setTextVisible(false);
    setTimeout(() => {
      setSlideIndex((i) => i - 1);
      setTextVisible(true);
    }, 260);
  }

  const showTy = slide.showTy;
  const showPress = slide.showPress;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "520px", gap: "28px" }}>

      {/* Step dots */}
      <div style={{ display: "flex", gap: "8px" }}>
        {INTRO_SLIDES.map((s, i) => (
          <div key={s.id} style={{
            width: i === slideIndex ? "20px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i === slideIndex ? "#c8a86b" : "rgba(200,168,107,0.2)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Avatar row — always render all 3, animate in/out */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "24px", width: "100%", minHeight: "160px" }}>

        {/* Press — slides in from left */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: showPress ? 1 : 0,
          transform: showPress ? "translateX(0) scale(1)" : "translateX(-50px) scale(0.9)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
          pointerEvents: "none",
        }}>
          <PressMonitor animState={showPress ? "talking" : "idle"} size="sm" />
          <AvatarLabel name="Press" role="Presentation Designer" />
        </div>

        {/* Cass — always center, grows when alone */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: (showTy || showPress) ? "scale(0.88)" : "scale(1)",
          transition: "transform 0.45s ease",
          transformOrigin: "bottom center",
        }}>
          <CassRecorder animState="talking" size="md" />
          <AvatarLabel name="Cass" role="Story Guide" />
        </div>

        {/* Ty — slides in from right */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: showTy ? 1 : 0,
          transform: showTy ? "translateX(0) scale(1)" : "translateX(50px) scale(0.9)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
          pointerEvents: "none",
        }}>
          <TypewriterRecorder animState={showTy ? "typing" : "idle"} size="sm" />
          <AvatarLabel name="Ty" role="Narrative Writer" />
        </div>
      </div>

      {/* Cass speech box */}
      <div style={{
        width: "100%",
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.26s ease, transform 0.26s ease",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(200,168,107,0.15)",
          borderRadius: "14px",
          padding: "22px 26px",
        }}>
          {slide.cassText.split("\n\n").map((para, i) => (
            <p key={i} style={{
              fontFamily: "'Literata', Georgia, serif",
              fontSize: "16px",
              lineHeight: "1.65",
              color: "#d4cec4",
              margin: i > 0 ? "12px 0 0" : 0,
            }}>
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
        {slide.isLast ? (
          <TapeButton variant="primary" size="md" onClick={advance} className="w-full justify-center">
            Let&apos;s get started →
          </TapeButton>
        ) : (
          <TapeButton variant="secondary" size="sm" onClick={advance}>
            Next →
          </TapeButton>
        )}
        {slideIndex > 0 && (
          <TapeButton variant="ghost" size="sm" onClick={goBack}>
            ← Back
          </TapeButton>
        )}
      </div>
    </div>
  );
}

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
          fontFamily: "var(--font-cass)",
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
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "28px",
            color: "#d4cec4",
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
          fontFamily: "var(--font-cass)",
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

      <TapeButton variant="secondary" size="md" onClick={onStart}>
        PRESS PLAY
      </TapeButton>
    </div>
  );
}

// ── Message thread bubbles ────────────────────────────────────────────────────

function UserMessage({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
      <div style={{
        background: "rgba(200,168,107,0.12)",
        border: "1px solid rgba(200,168,107,0.2)",
        borderRadius: "14px 14px 4px 14px",
        padding: "12px 16px",
        maxWidth: "85%",
        fontFamily: "'Literata', Georgia, serif",
        fontSize: "15px",
        lineHeight: "1.55",
        color: "#d4cec4",
      }}>
        {text}
      </div>
    </div>
  );
}

function CassMessage({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(200,168,107,0.12)",
        borderRadius: "14px 14px 14px 4px",
        padding: "12px 16px",
        maxWidth: "85%",
        fontFamily: "'Literata', Georgia, serif",
        fontSize: "15px",
        lineHeight: "1.55",
        color: "#c8c8c8",
      }}>
        {text}
      </div>
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

  const [phase, setPhase] = useState<Phase>(hasExistingProjects ? "start" : "intro");
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or currentReply change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentReply, isPending]);

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
          fontFamily: "var(--font-cass)",
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
                fontFamily: "var(--font-cass)",
                fontSize: "11px",
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
                color: "#d4cec4",
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
              fontFamily: "var(--font-cass)",
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
          fontFamily: "var(--font-cass)",
          color: "#c8c8c8",
          position: "relative",
        }}
      >
        {/* Progress bar — absolute at top of screen */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <CassProgressBar percent={
            phase === "intro" ? 5 :
            phase === "start" ? 10 :
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
              fontFamily: "'Literata', Georgia, serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
          >
            ✕
          </button>
        )}

        {/* ── Character intro ───────────────────────────────────────────────── */}
        {phase === "intro" && <IntroScreen onComplete={handleStart} />}

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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "480px", gap: "16px" }}>
            <CassRecorder animState={animState} size="md" />

            {/* Scrollable message thread */}
            <div style={{
              width: "100%",
              maxHeight: "45vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "4px 2px",
              scrollbarWidth: "none",
            }}>
              {/* All past messages */}
              {messages.map((msg, i) => {
                const isLatestAssistant = msg.role === "assistant" && i === messages.length - 1;
                if (msg.role === "user") {
                  return <UserMessage key={i} text={msg.content} />;
                }
                // Latest assistant message uses typewriter; previous ones render plain
                if (isLatestAssistant && currentReply === msg.content) {
                  return (
                    <CassMessage key={i} text="" />
                  );
                }
                return <CassMessage key={i} text={msg.content} />;
              })}

              {/* Typewriter for the current Cass reply */}
              {currentReply && (
                <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                  <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(200,168,107,0.12)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "12px 16px",
                    maxWidth: "85%",
                  }}>
                    <CassSpeechBubble
                      key={currentReply}
                      text={currentReply}
                      onComplete={handleReplyComplete}
                      speed={24}
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isPending && !currentReply && (
                <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                  <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(200,168,107,0.12)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "14px 20px",
                  }}>
                    <span style={{ fontFamily: "var(--font-cass)", fontSize: "13px", color: "#555", letterSpacing: "1px" }}>
                      ◉ rolling...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                  <div style={{
                    background: "rgba(255,59,48,0.08)",
                    border: "1px solid rgba(255,59,48,0.2)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "12px 16px",
                    maxWidth: "85%",
                    fontFamily: "'Literata', Georgia, serif",
                    fontSize: "14px",
                    color: "#ff6b6b",
                    lineHeight: 1.5,
                  }}>
                    Tape got stuck for a second. Try sending your message again.
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

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
          </div>
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
