"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CassAnimState } from "./cassVoice";
import type { OnboardingDraft } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";
import { TapeButton } from "@/components/ui/tape-button";
import { completeProjectKickoffAction } from "@/lib/actions/project-actions";
import { saveOnboardingDraftAction, clearOnboardingDraftAction } from "@/lib/actions/profile-actions";
import { Pencil, Check } from "lucide-react";

// ── Journey stage options ─────────────────────────────────────────────────────

const JOURNEY_OPTIONS = [
  { id: "origin",       label: "Just getting started — this is day one" },
  { id: "midjourney",   label: "We've been building for a while — months or years in" },
  { id: "retrospective",label: "I want to look back and document what's already happened" },
  { id: "custom",       label: "It's complicated..." },
] as const;

type JourneyId = typeof JOURNEY_OPTIONS[number]["id"];

function journeyAck(stage: string): string {
  if (stage === "origin") {
    return "Perfect — a clean slate. We'll capture every chapter as you build it, right from the start.";
  }
  if (stage === "midjourney") {
    return "Got it. Your story didn't start today, and that's completely fine. Chapter 1 is wherever you decide the telling begins — we can always chronicle what came before.";
  }
  if (stage === "retrospective") {
    return "Love it. We'll set up your project, then give you space to go back and capture the beginning. Nothing gets lost.";
  }
  return "Understood. Let's set up your project and you can shape the story from there.";
}

// ── Answer fields for review display ─────────────────────────────────────────

type AnswerKey = keyof OnboardingDraft["answers"];

const BRIEF_CARDS: Array<{ field: AnswerKey; label: string; icon: string }> = [
  { field: "project_goal",         label: "The Project",            icon: "◉" },
  { field: "north_star",           label: "North Star",             icon: "★" },
  { field: "project_audience",     label: "Who It's For",           icon: "◎" },
  { field: "project_success",      label: "What Success Looks Like", icon: "✓" },
  { field: "project_biggest_risk", label: "Biggest Risk",           icon: "?" },
];

const EMPTY_ANSWERS: OnboardingDraft["answers"] = {
  project_goal: "",
  north_star: "",
  project_audience: "",
  project_success: "",
  project_biggest_risk: "",
};

// ── Intro slides ──────────────────────────────────────────────────────────────

const INTRO_SLIDES = [
  {
    id: "welcome",
    cassText: "Hey, I'm Cass. Welcome to Authored By, the founder's story engine. As you build, I'll be here capturing the moments that matter, so when your audience is ready for the story, you'll have something worth telling.",
    showTy: false,
    showPress: false,
    isLast: false,
  },
  {
    id: "how-it-works",
    cassText: "Here's how it works. Your Board is where you track what you're building, just like a project board but built for founders. Your Story tab is where all of it gets turned into narrative, the real account of what happened and why it mattered.",
    showTy: false,
    showPress: false,
    isLast: false,
  },
  {
    id: "meet-ty",
    cassText: "When you're ready to share with your audience, I'll hand things over to Ty. He takes everything we've captured and crafts a narrative your audience can't wait to read.",
    showTy: true,
    showPress: false,
    isLast: false,
  },
  {
    id: "meet-press",
    cassText: "And this is Press. She takes everything Ty and I have captured and turns it into polished, professional presentations. Whether it's a pitch deck, an investor update, or something else entirely, Press will get you exactly what you need.",
    showTy: true,
    showPress: true,
    isLast: false,
  },
  {
    id: "lets-go",
    cassText: "Together we'll capture your entire journey, one chapter at a time. Chapters typically last about two weeks. We'll have kickoff and recap sessions along the way to make sure none of the important details get missed. Ready to start your first project?",
    showTy: false,
    showPress: false,
    isLast: true,
  },
] as const;

type Phase = "intro" | "interview" | "generating" | "saving";

// ── Avatar label ──────────────────────────────────────────────────────────────

function AvatarLabel({ name, role }: { name: string; role: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "8px" }}>
      <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "#c8a86b", fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: "var(--font-cass)", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginTop: "2px" }}>{role}</div>
    </div>
  );
}

// ── Quick tap input ───────────────────────────────────────────────────────────

function QuickTapInput({
  options,
  onSelect,
  placeholder,
  freeTextLabel = "Something else...",
}: {
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  freeTextLabel?: string;
}) {
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState("");

  // Determine which options are tappable vs the free-text trigger
  const tappableOptions = options[options.length - 1] === freeTextLabel
    ? options.slice(0, -1)
    : options;
  const hasFreeTextEscape = options[options.length - 1] === freeTextLabel;

  if (showFreeText) {
    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        <textarea
          autoFocus
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (freeText.trim()) onSelect(freeText.trim());
            }
          }}
          placeholder={placeholder ?? "Type your answer..."}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(200,168,107,0.25)",
            borderRadius: "8px",
            padding: "14px 16px",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "14px",
            color: "#d4cec4",
            outline: "none",
            resize: "none",
            minHeight: "70px",
            lineHeight: "1.5",
            caretColor: "#c8a86b",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)"; }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setShowFreeText(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(200,168,107,0.45)", padding: 0 }}
          >
            ← back to options
          </button>
          <TapeButton
            variant="primary"
            size="sm"
            onClick={() => { if (freeText.trim()) onSelect(freeText.trim()); }}
            disabled={!freeText.trim()}
          >
            Submit
          </TapeButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
      {tappableOptions.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(200,168,107,0.18)",
            borderRadius: "10px",
            padding: "13px 18px",
            textAlign: "left",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "14px",
            color: "#d4cec4",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(200,168,107,0.08)";
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)";
          }}
        >
          {opt}
        </button>
      ))}
      {hasFreeTextEscape && (
        <button
          type="button"
          onClick={() => setShowFreeText(true)}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px dashed rgba(200,168,107,0.15)",
            borderRadius: "10px",
            padding: "11px 18px",
            textAlign: "left",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "13px",
            color: "rgba(200,168,107,0.45)",
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)";
            e.currentTarget.style.color = "rgba(200,168,107,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.15)";
            e.currentTarget.style.color = "rgba(200,168,107,0.45)";
          }}
        >
          {freeTextLabel}
        </button>
      )}
    </div>
  );
}


// ── Board / Story toggle demo ─────────────────────────────────────────────────

function BoardStoryDemo() {
  const [isBoard, setIsBoard] = useState(true);

  // Auto-toggle: Board → Story → Board → Story …
  useEffect(() => {
    const sequence = [1400, 1400, 1400, 1400, 1400];
    let idx = 0;
    function tick() {
      setIsBoard((v) => !v);
      idx++;
      if (idx < sequence.length) {
        setTimeout(tick, sequence[idx]);
      } else {
        // loop forever after the initial sequence
        const interval = setInterval(() => setIsBoard((v) => !v), 1600);
        return () => clearInterval(interval);
      }
    }
    const t = setTimeout(tick, sequence[0]);
    return () => clearTimeout(t);
  }, []);

  const clip = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      padding: "20px 0 8px", userSelect: "none",
    }}>
      {/* STORY label */}
      <span style={{
        fontFamily: "var(--font-cass)", fontSize: "18px", fontWeight: 700,
        padding: "5px 14px",
        background: !isBoard ? "#f5c84a" : "#e8dfc0",
        clipPath: clip,
        boxShadow: "2px 1px 5px rgba(0,0,0,0.35)",
        color: !isBoard ? "#1a0e00" : "#9a8450",
        transition: "color 0.28s, background 0.28s",
      }}>
        STORY
      </span>

      {/* Pill toggle */}
      <div style={{
        position: "relative", width: "48px", height: "26px",
        background: isBoard ? "#1e1608" : "#151209",
        borderRadius: "13px",
        border: `1.5px solid ${isBoard ? "#c8880a" : "#3a2e10"}`,
        boxShadow: isBoard
          ? "inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(200,136,10,0.25)"
          : "inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05)",
        flexShrink: 0,
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <div style={{
          position: "absolute", top: "3px", left: "3px",
          width: "18px", height: "18px", borderRadius: "50%",
          background: isBoard
            ? "radial-gradient(circle at 35% 30%, #ffd060, #c87010)"
            : "radial-gradient(circle at 35% 30%, #c8b880, #7a6030)",
          border: "1px solid #5a4820",
          boxShadow: isBoard
            ? "0 2px 5px rgba(0,0,0,0.6), 0 0 8px rgba(255,180,30,0.7), inset 0 1px 0 rgba(255,255,255,0.3)"
            : "0 2px 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
          transform: isBoard ? "translateX(22px)" : "translateX(0)",
          transition: "transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), background 0.28s, box-shadow 0.28s",
        }} />
      </div>

      {/* BOARD label */}
      <span style={{
        fontFamily: "var(--font-cass)", fontSize: "18px", fontWeight: 700,
        padding: "5px 14px",
        background: isBoard ? "#f5c84a" : "#e8dfc0",
        clipPath: clip,
        boxShadow: "-2px 1px 5px rgba(0,0,0,0.35)",
        color: isBoard ? "#1a0e00" : "#9a8450",
        transition: "color 0.28s, background 0.28s",
      }}>
        BOARD
      </span>
    </div>
  );
}

// ── Shared onboarding header ──────────────────────────────────────────────────

function OnboardingHeader() {
  return (
    <>
      <div style={{
        background: "#0a0a0a", borderBottom: "1px solid #1e1e1e",
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
        background: "#242424", padding: "6px 16px 0",
        display: "flex", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(248,248,246,0.25)",
        }}>
          Onboarding
        </span>
      </div>
    </>
  );
}

// ── Intro screen ──────────────────────────────────────────────────────────────

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [revealed, setRevealed] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cassHeroRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipRef = useRef<HTMLDivElement>(null);

  const current = INTRO_SLIDES[revealed - 1];
  const isDone = current.isLast;

  // Center the new chunk (slide + chip) vertically after each reveal
  useEffect(() => {
    if (revealed === 1) return;
    const scrollEl = scrollRef.current;
    const newSlideEl = slideRefs.current[revealed - 1];
    const chipEl = chipRef.current;
    if (!scrollEl || !newSlideEl) return;

    // Use rAF to let React finish painting the new elements
    requestAnimationFrame(() => {
      const containerRect = scrollEl.getBoundingClientRect();
      const slideTop = newSlideEl.getBoundingClientRect().top - containerRect.top + scrollEl.scrollTop;
      const chipBottom = chipEl
        ? chipEl.getBoundingClientRect().bottom - containerRect.top + scrollEl.scrollTop
        : slideTop + 200;

      const chunkHeight = chipBottom - slideTop;
      const viewportHeight = scrollEl.clientHeight;
      const targetScrollTop = slideTop - (viewportHeight - chunkHeight) / 2;

      scrollEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    });
  }, [revealed]);

  function advance() {
    if (isDone) { onComplete(); return; }
    setRevealed((n) => n + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100dvh", animation: "cass-fade-in 0.4s ease" }}>

      {/* Header */}
      <OnboardingHeader />

      {/* Scrollable message feed */}
      <div
        ref={scrollRef}
        className="chat-scrollbar"
        style={{
          flex: 1, overflowY: "auto",
          padding: "32px 16px 20px",
          display: "flex", flexDirection: "column", gap: "24px",
          maxWidth: "600px", width: "100%", margin: "0 auto", boxSizing: "border-box",
        }}
      >
        {/* Cass hero — full-size intro, anchored in the story */}
        <div ref={cassHeroRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <CassRecorder animState="talking" size="md" />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)",
          }}>Cass · Story Guide</span>
        </div>

        {/* Messages — each one stays in the scroll history */}
        {INTRO_SLIDES.slice(0, revealed).map((slide, i) => {
          const isLatest = i === revealed - 1;

          // Which new character(s) appear for the first time on this slide?
          const prevSlide = i > 0 ? INTRO_SLIDES[i - 1] : null;
          const tyJustIntroduced = slide.showTy && !prevSlide?.showTy;
          const pressJustIntroduced = slide.showPress && !prevSlide?.showPress;

          return (
            <div key={slide.id} ref={(el) => { slideRefs.current[i] = el; }} style={{ display: "flex", flexDirection: "column", gap: "16px", animation: isLatest ? "cass-fade-up 0.35s ease forwards" : "none" }}>

              {/* Inline character introductions — stay anchored here in the scroll */}
              {(tyJustIntroduced || pressJustIntroduced) && (
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "24px", marginBottom: "4px" }}>
                  {pressJustIntroduced && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", animation: isLatest ? "cass-fade-up 0.4s ease forwards" : "none" }}>
                      <PressMonitor animState="talking" size="sm" />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)" }}>Press · Presentation Designer</span>
                    </div>
                  )}
                  {tyJustIntroduced && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", animation: isLatest ? "cass-fade-up 0.4s ease 0.12s forwards" : "none", opacity: isLatest ? 0 : 1 }}>
                      <TypewriterRecorder animState="typing" size="sm" />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)" }}>Ty · Narrative Writer</span>
                    </div>
                  )}
                </div>
              )}

              {/* Board/Story demo — only on the "how it works" slide */}
              {slide.id === "how-it-works" && <BoardStoryDemo />}

              {/* Team trio — above the final lets-go message */}
              {slide.id === "lets-go" && (
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px 0 16px", position: "relative" }}>
                  {/* Press — back-left, scaled down */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                    transform: "scale(0.72) translateY(8px)",
                    transformOrigin: "bottom center",
                    marginRight: "-24px",
                    zIndex: 1,
                    opacity: isLatest ? 0 : 0.75,
                    filter: "brightness(0.75)",
                    animation: isLatest ? "cass-fade-up 0.4s ease 0.2s forwards" : "none",
                  }}>
                    <PressMonitor animState="talking" size="sm" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(248,248,246,0.4)" }}>Press</span>
                  </div>
                  {/* Cass — front and center */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                    zIndex: 3,
                    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
                    opacity: isLatest ? 0 : 1,
                    animation: isLatest ? "cass-fade-up 0.35s ease forwards" : "none",
                  }}>
                    <CassRecorder animState="talking" size="sm" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.65)" }}>Cass</span>
                  </div>
                  {/* Ty — back-right, scaled down */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                    transform: "scale(0.72) translateY(8px)",
                    transformOrigin: "bottom center",
                    marginLeft: "-24px",
                    zIndex: 1,
                    opacity: isLatest ? 0 : 0.75,
                    filter: "brightness(0.75)",
                    animation: isLatest ? "cass-fade-up 0.4s ease 0.2s forwards" : "none",
                  }}>
                    <TypewriterRecorder animState="typing" size="sm" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(248,248,246,0.4)" }}>Ty</span>
                  </div>
                </div>
              )}

              {/* Message text */}
              <div style={{ maxWidth: "85%", margin: "0 auto", width: "100%" }}>
                {slide.cassText.split("\n\n").map((para, j) => (
                  <p key={j} style={{
                    fontFamily: "'Lora', Georgia, serif", fontSize: "15px",
                    lineHeight: "1.65", color: "#f8f8f6", margin: j > 0 ? "10px 0 0" : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          );
        })}

        {/* Continue / start chip */}
        <div ref={chipRef} style={{ display: "flex", justifyContent: "center" }}>
          {isDone ? (
            <button type="button" className="chat-chip" onClick={advance}
              style={{ background: "#f5c84a", color: "#1a0e00", borderColor: "#f5c84a" }}>
              Let&apos;s get started →
            </button>
          ) : (
            <button type="button" className="chat-chip" onClick={advance}>
              Continue
              <span style={{ marginLeft: "6px", animation: "cass-blink 1.1s step-end infinite" }}>▶</span>
            </button>
          )}
        </div>

        {/* Spacer so the chip sits near vertical center when scrolled to bottom */}
        <div style={{ flexShrink: 0, height: "40vh" }} />
      </div>

    </div>
  );
}

// ── Voice input footer ────────────────────────────────────────────────────────

function VoiceInputFooter({
  value,
  onChange,
  onSubmit,
  voiceMode = false,
  onRegisterOpenMic,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text?: string) => void;
  voiceMode?: boolean;
  onRegisterOpenMic?: (fn: () => void) => void;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef(value);

  // Resize textarea whenever value changes (covers both typing and voice)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  // Keep finalTranscriptRef in sync with value when not listening
  useEffect(() => {
    if (!listening) finalTranscriptRef.current = value;
  }, [value, listening]);

  // Auto-start mic when entering voice mode
  useEffect(() => {
    if (voiceMode && !listening) {
      startListening();
    }
    if (!voiceMode && listening) {
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  // Register our openMic function with parent so TTS can re-open after speaking
  useEffect(() => {
    onRegisterOpenMic?.(() => {
      if (voiceMode) startListening();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, onRegisterOpenMic]);

  function scheduleAutoSubmit(text: string) {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        stopListening();
        onSubmit(text); // pass text directly — avoids stale state closure
      }
    }, 1800);
  }

  function stopListening() {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    finalTranscriptRef.current = "";
    onChange("");

    const rec: any = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + e.results[i][0].transcript.trim();
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const combined = finalTranscriptRef.current + (interim ? " " + interim : "");
      onChange(combined);
      scheduleAutoSubmit(finalTranscriptRef.current);
    };

    rec.onend = () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setListening(false);
    };
    rec.onerror = () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setListening(false);
    };

    rec.start();
    setListening(true);
  }

  function toggleVoice() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <div style={{
      padding: "12px 16px 20px",
      flexShrink: 0,
      animation: "cass-fade-up 0.25s ease forwards",
      maxWidth: "600px",
      width: "100%",
      margin: "0 auto",
      boxSizing: "border-box",
    }}>
    {voiceMode ? (
      /* ── Full voice mode UI ── */
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        {/* Transcript preview */}
        {value && (
          <p style={{
            fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: "1.6",
            color: "rgba(248,248,246,0.55)", textAlign: "center",
            margin: 0, maxWidth: "360px",
            animation: "cass-fade-in 0.2s ease",
          }}>
            {value}
          </p>
        )}
        {/* Mic pulse button */}
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={listening ? "Stop recording" : "Start recording"}
          style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: listening ? "rgba(245,200,74,0.15)" : "rgba(255,255,255,0.06)",
            border: `2px solid ${listening ? "#f5c84a" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: listening ? "0 0 0 8px rgba(245,200,74,0.08), 0 0 0 16px rgba(245,200,74,0.04)" : "none",
          }}
        >
          <svg width="20" height="18" viewBox="0 0 16 14" fill="none" aria-hidden="true">
            {[
              { x: 0,  h: 4,  y: 5 },
              { x: 3,  h: 8,  y: 3 },
              { x: 6,  h: 14, y: 0 },
              { x: 9,  h: 8,  y: 3 },
              { x: 12, h: 4,  y: 5 },
            ].map((bar, i) => (
              <rect
                key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
                fill={listening ? "#f5c84a" : "#666"}
                style={listening ? { animation: `chat-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
              />
            ))}
          </svg>
        </button>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px",
          fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          color: listening ? "#f5c84a" : "#444",
          transition: "color 0.2s",
        }}>
          {listening ? "Listening…" : "Tap to speak"}
        </span>
      </div>
    ) : (
      /* ── Text + optional mic UI ── */
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        marginLeft: "7.5%",
      }}>
        {/* Input bar with inline Voice button */}
        <div style={{
          flex: 1, display: "flex", alignItems: "flex-end",
          background: "#2e2e2e", border: `1px solid ${listening ? "#f5c84a" : "#3a3a3a"}`,
          borderRadius: "22px", overflow: "hidden",
          transition: "border-color 0.15s",
          boxShadow: listening ? "0 0 0 3px rgba(245,200,74,0.15)" : "none",
        }}>
          <textarea
            ref={textareaRef}
            autoFocus
            className="chat-textarea"
            value={value}
            rows={1}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim()) onSubmit();
              }
            }}
            placeholder="Type or tap voice…"
            style={{ flex: 1, background: "transparent", border: "none", borderRadius: 0, padding: "9px 4px 9px 16px" }}
          />
          {/* Inline Voice button — hidden once user starts typing */}
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Stop recording" : "Voice input"}
            style={{
              display: value.trim() && !listening ? "none" : "flex", alignItems: "center", gap: "5px",
              background: listening ? "rgba(245,200,74,0.15)" : "transparent",
              border: "none", borderLeft: `1px solid ${listening ? "rgba(245,200,74,0.3)" : "#3a3a3a"}`,
              padding: "0 14px", height: "100%", minHeight: "40px",
              cursor: "pointer", flexShrink: 0,
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { if (!listening) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { if (!listening) e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
              {[
                { x: 0,  h: 4,  y: 5 },
                { x: 3,  h: 8,  y: 3 },
                { x: 6,  h: 14, y: 0 },
                { x: 9,  h: 8,  y: 3 },
                { x: 12, h: 4,  y: 5 },
              ].map((bar, i) => (
                <rect
                  key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
                  fill={listening ? "#f5c84a" : "#888"}
                  style={listening ? { animation: `chat-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
                />
              ))}
            </svg>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: listening ? "#f5c84a" : "#888",
              transition: "color 0.15s",
            }}>
              {listening ? "Stop" : "Voice"}
            </span>
          </button>
        </div>

        {/* Send button */}
        <button
          type="button"
          className="chat-send-btn"
          onClick={() => onSubmit()}
          disabled={!value.trim()}
          aria-label="Send"
        >
          <span className="material-icons">arrow_upward</span>
        </button>
      </div>
    )}
    </div>
  );
}

// ── Brief card (filled answer) ────────────────────────────────────────────────

function BriefCard({
  label,
  icon,
  value,
  onEdit,
}: {
  label: string;
  icon: string;
  value: string;
  onEdit: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function save() {
    const trimmed = draft.trim();
    if (trimmed) onEdit(trimmed);
    setEditing(false);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(200,168,107,0.15)",
      borderRadius: "12px",
      padding: "14px 16px",
      width: "100%",
      animation: "cass-fade-up 0.35s ease forwards",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "var(--font-cass)", fontSize: "10px", color: "#c8a86b", opacity: 0.7 }}>{icon}</span>
          <span style={{ fontFamily: "var(--font-cass)", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase" }}>{label}</span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setDraft(value); setEditing(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(200,168,107,0.35)", padding: "2px", fontFamily: "'Literata', Georgia, serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#c8a86b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.35)"; }}
          >
            <Pencil size={11} />
          </button>
        )}
        {editing && (
          <button
            type="button"
            onClick={save}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#c8a86b", padding: "2px", fontFamily: "'Literata', Georgia, serif" }}
          >
            <Check size={11} />
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "14px",
            lineHeight: "1.55",
            color: "#d4cec4",
            resize: "none",
            minHeight: "60px",
          }}
          rows={3}
        />
      ) : (
        <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: "1.55", color: "#d4cec4", margin: 0 }}>
          {value}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CassOnboardingChat({
  hasExistingProjects = false,
  existingDraft = null,
}: {
  hasExistingProjects?: boolean;
  existingDraft?: OnboardingDraft | null;
}) {
  const router = useRouter();

  const getInitialPhase = (): Phase => {
    if (existingDraft) {
      if (existingDraft.step >= 1) return "generating";
      return "interview";
    }
    return "intro";
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [answers, setAnswers] = useState<OnboardingDraft["answers"]>(
    existingDraft?.answers ?? { ...EMPTY_ANSWERS }
  );
  const [rawDescription, setRawDescription] = useState(existingDraft?.raw_description ?? existingDraft?.answers?.project_goal ?? "");
  const [animState, setAnimState] = useState<CassAnimState>("idle");

  const [projectName, setProjectName] = useState(existingDraft?.project_name ?? "");
  const [proposedChapters, setProposedChapters] = useState<OnboardingDraft["proposed_chapters"]>(
    existingDraft?.proposed_chapters ?? []
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // ── Chat state for the multi-turn interview ──────────────────────────────
  type ChatMsg = { role: "user" | "assistant"; content: string };
  const OPENING_QUESTION = "Great, so tell me about the project or business you are building. How's it going so far?";
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: OPENING_QUESTION },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatPending, setIsChatPending] = useState(false);
  // Nintendo-style gating: user must press Continue after each Cass message
  const [showContinue, setShowContinue] = useState(false);
  const [inputRevealed, setInputRevealed] = useState(true);
  const [chatDone, setChatDone] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ── Voice conversation mode ──────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Callback ref so speakAsCass can re-open the mic after audio ends
  const openMicRef = useRef<(() => void) | null>(null);

  async function speakAsCass(text: string) {
    if (!voiceMode || !text.trim()) return;
    try {
      setIsSpeaking(true);
      setAnimState("talking");

      const res = await fetch("/api/tts/cass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        setAnimState("listening");
        // Re-open the mic for the next user turn
        openMicRef.current?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        setAnimState("listening");
        openMicRef.current?.();
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
      setAnimState("listening");
    }
  }

  function toggleVoiceMode() {
    // Stop any playing audio when switching modes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setVoiceMode((v) => !v);
  }

  // Auto-save draft
  useEffect(() => {
    if (phase === "interview" || phase === "generating") {
      const draft: OnboardingDraft = {
        step: phase === "interview" ? 0 : phase === "generating" ? 1 : 2,
        journeyStage: "",
        wantPrelude: false,
        raw_description: rawDescription,
        answers,
        project_name: projectName,
        proposed_chapters: proposedChapters,
        updated_at: new Date().toISOString(),
      };
      saveOnboardingDraftAction(draft).catch(console.error);
    }
  }, [answers, rawDescription, phase, projectName, proposedChapters]);

  // Animate Cass when entering interview phase
  useEffect(() => {
    if (phase === "interview") {
      setAnimState("talking");
      const t = setTimeout(() => setAnimState("listening"), 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Auto-scroll to bottom whenever Cass sends a new message or typing indicator appears
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isChatPending]);

  async function handleChatSubmit(overrideText?: string) {
    const trimmed = (overrideText ?? chatInput).trim();
    if (!trimmed || isChatPending) return;

    const newMessages: ChatMsg[] = [...chatMessages, { role: "user", content: trimmed }];
    setChatMessages(newMessages);
    setChatInput("");
    setInputRevealed(false);
    setIsChatPending(true);
    setAnimState("recording");
    setError(null);

    try {
      const res = await fetch("/api/chat/cass-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json() as {
        reply?: string;
        done?: boolean;
        project_name?: string;
        north_star?: string;
        project_goal?: string;
        project_audience?: string;
        project_success?: string;
        project_biggest_risk?: string;
        proposed_chapters?: OnboardingDraft["proposed_chapters"];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");

      const reply = data.reply?.trim() ?? "";

      if (data.done) {
        setProjectName(data.project_name ?? "");
        setAnswers({
          project_goal:         data.project_goal ?? "",
          north_star:           data.north_star ?? "",
          project_audience:     data.project_audience ?? "",
          project_success:      data.project_success ?? "",
          project_biggest_risk: data.project_biggest_risk ?? "",
        });
        setProposedChapters(data.proposed_chapters ?? []);
        // Always show a closing message — use AI reply if present, otherwise a fixed wrap-up
        const closingMessage = reply || "Thanks, I have everything I need. Let's take you to your project board.";
        setChatMessages([...newMessages, { role: "assistant", content: closingMessage }]);
        setChatDone(true);
        setAnimState("idle");
        if (voiceMode) {
          // Speak closing message; Continue chip appears after audio ends
          openMicRef.current = null; // no mic after final turn
          await speakAsCass(closingMessage);
          setShowContinue(true);
        } else {
          setShowContinue(true);
        }
        // Transition happens when user presses Continue on the final message
      } else {
        setChatMessages([...newMessages, { role: "assistant", content: reply }]);
        setInputRevealed(true);
        if (voiceMode) {
          // speakAsCass handles animState; mic re-opens via openMicRef after audio ends
          await speakAsCass(reply);
        } else {
          setAnimState("talking");
          setTimeout(() => setAnimState("listening"), 1600);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setInputRevealed(true);
      setAnimState("listening");
    } finally {
      setIsChatPending(false);
    }
  }

  function handleContinue() {
    if (chatDone) {
      setError(null);
      setPhase("saving");
      startSaveTransition(async () => {
        try {
          const { projectId, chapter1Id } = await completeProjectKickoffAction({
            name: projectName || answers.project_goal.slice(0, 80) || "My Project",
            northStar: answers.north_star,
            projectGoal: answers.project_goal,
            projectAudience: answers.project_audience,
            projectSuccess: answers.project_success,
            projectBiggestRisk: answers.project_biggest_risk,
            conversation: [{ role: "user", content: answers.project_goal }],
            proposedChapters: proposedChapters.map((ch) => ({
              chapterNumber: ch.chapter_number,
              title: ch.title,
              goal: ch.goal,
              prefill: ch.prefill ?? null,
            })),
            createPreludeChapter: false,
          });
          await clearOnboardingDraftAction();
          router.push(`/projects/${projectId}/chapters/${chapter1Id}/board`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to set up project.");
          setPhase("interview");
          setChatDone(true);
          setShowContinue(true);
        }
      });
      return;
    }
    setShowContinue(false);
    setInputRevealed(true);
  }

  function handleEditAnswer(field: AnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleReviewComplete() {
    setPhase("saving");
  }

  // Count assistant turns to gauge interview progress (1 = opening, 2 = follow-up/risk, 3 = last question)
  const assistantTurns = chatMessages.filter((m) => m.role === "assistant").length;
  const userTurns = chatMessages.filter((m) => m.role === "user").length;
  const interviewProgress =
    assistantTurns >= 3 ? 75 :
    assistantTurns === 2 ? 55 :
    userTurns > 0 ? 30 :
    0;

  const progressPercent =
    phase === "intro"      ? 0  :
    phase === "interview"  ? interviewProgress :
    phase === "generating" ? 85 :
    100;

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes cass-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cass-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cass-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes chat-dot-pulse {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
        .onboarding-outer {
          min-height: 100dvh;
          background: #0a0a0a;
          background-image: radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 72px 16px 32px;
          font-family: var(--font-cass);
          color: #c8c8c8;
          position: relative;
        }
        .onboarding-outer.phase-interview {
          background: #242424;
          background-image: none;
          padding: 0;
          justify-content: stretch;
        }
        .onboarding-content {
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .chat-send-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #f5c84a; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .chat-send-btn:disabled { background: #2e2e2e; cursor: default; }
        .chat-send-btn:not(:disabled):hover { background: #f0c040; }
        .chat-send-btn .material-icons { font-size: 18px; color: #0a0a0a; }
        .chat-send-btn:disabled .material-icons { color: #555; }
        .chat-chip {
          display: inline-flex; align-items: center;
          background: #1e1e1e; border: 1px solid #2e2e2e;
          border-radius: 28px; padding: 12px 28px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #999; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .chat-chip:hover { background: #f5c84a; color: #1a0e00; }
        .chat-textarea {
          flex: 1; background: #2e2e2e;
          border: 1px solid #3a3a3a; border-radius: 22px;
          padding: 9px 16px;
          font-family: 'Lora', Georgia, serif; font-size: 14px; color: #f8f8f6;
          caret-color: #f5c84a; outline: none; resize: none;
          min-height: 40px; max-height: 120px; line-height: 1.5;
          transition: border-color 0.15s;
          scrollbar-width: none;
        }
        .chat-textarea::placeholder { color: #666; }
        .chat-textarea:focus { border-color: #f5c84a; }
        .chat-scrollbar { scrollbar-width: none; }
        .chat-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className={`onboarding-outer${(phase === "interview" || phase === "intro") ? " phase-interview" : ""}`}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
          <CassProgressBar percent={progressPercent} />
        </div>

        {hasExistingProjects && (
          <button type="button" onClick={() => router.back()} aria-label="Close"
            style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10, background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "4px", transition: "color 0.2s", fontFamily: "'Literata', Georgia, serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
          >✕</button>
        )}

        {/* Non-chat phases — centered layout */}
        {phase !== "interview" && phase !== "intro" && (
        <div className="onboarding-content">

          {/* ── Generating ── */}
          {phase === "generating" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", maxWidth: "480px", width: "100%" }}>
              <CassRecorder animState="recording" size="md" />
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%", textAlign: "center" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>
                  Rolling on this. Building your project brief and chapter plan...
                </p>
              </div>
            </div>
          )}

          {/* ── Saving ── */}
          {phase === "saving" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", maxWidth: "480px", width: "100%" }}>
              <CassRecorder animState="recording" size="md" />
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%", textAlign: "center" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", color: "#d4cec4", margin: 0 }}>
                  Setting up your project. One second.
                </p>
              </div>
            </div>
          )}

        </div>
        )}

        {/* ── Interview — full-height, outside the centered content wrapper ── */}
        {phase === "interview" && (
            <div style={{
              display: "flex", flexDirection: "column",
              width: "100%", height: "100dvh",
              animation: "cass-fade-in 0.4s ease",
            }}>

              {/* Header */}
              <OnboardingHeader />

              {/* Message feed */}
              <div
                ref={chatScrollRef}
                className="chat-scrollbar"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  maxWidth: "600px",
                  width: "100%",
                  margin: "0 auto",
                  boxSizing: "border-box",
                }}
              >
                {chatMessages.map((msg, i) => (
                  msg.role === "assistant" ? (
                    <div key={i} style={{ maxWidth: "85%", width: "100%", margin: "0 auto", animation: "cass-fade-up 0.3s ease forwards" }}>
                      {/* Cass fab — only above the first message */}
                      {i === 0 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                          <CassRecorder animState={animState} size="sm" />
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)" }}>Cass · Story Guide</span>
                        </div>
                      )}
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
                    <div key={i} style={{ display: "flex", justifyContent: "flex-end", animation: "cass-fade-up 0.3s ease forwards" }}>
                      <div style={{
                        background: "#3a3a3a",
                        borderRadius: "18px 18px 4px 18px",
                        padding: "10px 14px", maxWidth: "80%",
                      }}>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: "1.55", color: "#f8f8f6", margin: 0 }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )
                ))}

                {/* Typing indicator */}
                {isChatPending && (
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingLeft: "2px", animation: "cass-fade-in 0.2s ease" }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: "7px", height: "7px", borderRadius: "50%",
                        background: "#f5c84a",
                        animation: `chat-dot-pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }} />
                    ))}
                  </div>
                )}

                {error && (
                  <p style={{ color: "#ff6b6b", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", margin: 0 }}>
                    {error}
                  </p>
                )}

                {/* Continue chip */}
                {showContinue && !isChatPending && (
                  <div style={{ display: "flex", justifyContent: "center", animation: "cass-fade-in 0.35s ease" }}>
                    <button type="button" className="chat-chip" onClick={handleContinue}>
                      Continue
                      <span style={{ marginLeft: "6px", animation: "cass-blink 1.1s step-end infinite" }}>▶</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Voice mode toggle */}
              {inputRevealed && !isChatPending && !showContinue && (
                <div style={{ display: "flex", justifyContent: "center", paddingBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={toggleVoiceMode}
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "11px", fontWeight: 600,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      background: voiceMode ? "rgba(245,200,74,0.12)" : "transparent",
                      color: voiceMode ? "#f5c84a" : "#555",
                      border: `1px solid ${voiceMode ? "rgba(245,200,74,0.3)" : "#333"}`,
                      borderRadius: "20px", padding: "5px 14px",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {voiceMode ? "🎙 Voice mode on" : "Switch to voice mode"}
                  </button>
                </div>
              )}

              {/* Input footer */}
              {inputRevealed && !isChatPending && !isSpeaking && (
                <VoiceInputFooter
                  value={chatInput}
                  onChange={setChatInput}
                  onSubmit={handleChatSubmit}
                  voiceMode={voiceMode}
                  onRegisterOpenMic={(fn) => { openMicRef.current = fn; }}
                />
              )}

            </div>
          )}

        {/* ── Intro — full-height chat layout ── */}
        {phase === "intro" && <IntroScreen onComplete={() => setPhase("interview")} />}

      </div>{/* end onboarding-outer */}
    </>
  );
}
