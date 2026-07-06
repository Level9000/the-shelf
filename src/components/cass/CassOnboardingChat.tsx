"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CassAnimState } from "./cassVoice";
import type { OnboardingDraft } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { VoiceInputFooter } from "./VoiceInputFooter";
import { TapeButton } from "@/components/ui/tape-button";
import { completeProjectKickoffAction } from "@/lib/actions/project-actions";
import { saveOnboardingDraftAction, clearOnboardingDraftAction } from "@/lib/actions/profile-actions";
import { Pencil, Check } from "lucide-react";

// ── Journey stage options ─────────────────────────────────────────────────────

const JOURNEY_OPTIONS = [
  { id: "origin",       label: "Just getting started, this is day one" },
  { id: "midjourney",   label: "We've been building for a while, months or years in" },
  { id: "retrospective",label: "I want to look back and document what's already happened" },
  { id: "custom",       label: "It's complicated..." },
] as const;

type JourneyId = typeof JOURNEY_OPTIONS[number]["id"];

function journeyAck(stage: string): string {
  if (stage === "origin") {
    return "Perfect, a clean slate. We'll capture every chapter as you build it, right from the start.";
  }
  if (stage === "midjourney") {
    return "Got it. Your story didn't start today, and that's completely fine. Chapter 1 is wherever you decide the telling begins. We can always chronicle what came before.";
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
    id: "beat-1",
    cassText: "Hey, I'm Cass.\n\nBefore we do anything else, I want to tell you something I believe. Right now, today, you are living a story worth telling.",
    isLast: false,
  },
  {
    id: "beat-2",
    cassText: "Maybe you're building a company.\n\nMaybe you're training for something that scares you a little.\n\nMaybe you're trying to finish the book, finish the degree, or finish the thing you keep almost finishing.",
    isLast: false,
  },
  {
    id: "beat-3",
    cassText: "It doesn't matter which is true for you because they are all the same story underneath.\n\nYou decided something was important enough that you keep showing up for it.\n\nIt's an epic story in the making. But most likely, none of it is getting written down, and this epic story is going unread.",
    isLast: false,
  },
  {
    id: "beat-4",
    cassText: "That's where I can help.\n\nCheck in with me once a day and I'll make sure we turn the exciting journey you are on into something worth reading.\n\nYou talk, I listen.\n\nOver time, these records become something and before you know it, the small wins, the pivots, the stumbles, the breakthroughs start to read like a story worth telling.",
    isLast: false,
  },
  {
    id: "beat-5",
    cassText: "So let's get started and keep things simple.\n\nWhat are you in the middle of right now?",
    isLast: true,
  },
] as const;

type Phase = "intro" | "interview" | "generating";

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


// ── Chapter demo: tasks becoming story ──────────────────────────────────────────

const DEMO_TASKS = [
  { id: "t1", title: "Ship the onboarding rewrite" },
  { id: "t2", title: "Fix the login bug" },
];

const DEMO_TAPE_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

function DemoTape({ children, background, rotate = -1.5 }: { children: React.ReactNode; background: string; rotate?: number }) {
  return (
    <span style={{
      display: "inline-block", background, color: "#1a0e00",
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 14px 5px",
      clipPath: DEMO_TAPE_CLIP, transform: `rotate(${rotate}deg)`,
    }}>
      {children}
    </span>
  );
}

// Stage sequence: 0 = nothing checked, 1 = first task checked, 2 = both checked.
// Holds, then resets and loops forever.
function ChecklistDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    function runCycle(base: number) {
      timers.push(setTimeout(() => setStage(1), base + 900));
      timers.push(setTimeout(() => setStage(2), base + 1800));
      timers.push(setTimeout(() => setStage(0), base + 4200));
      timers.push(setTimeout(() => runCycle(base + 4200), base + 4200));
    }
    runCycle(500);
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ padding: "20px 0 8px" }}>
      <div style={{
        width: "65%", margin: "0 auto", borderRadius: "16px", overflow: "hidden",
        border: "1px solid rgba(200,168,107,0.28)", background: "#141210",
      }}>
        <div style={{ padding: "20px 20px 16px", background: "rgba(245,200,74,0.08)" }}>
          <div style={{ marginBottom: "14px" }}><DemoTape background="#f5c84a">This chapter</DemoTape></div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {DEMO_TASKS.map((task, i) => {
              const checked = stage > i;
              return (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{
                    width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                    border: `1.5px solid ${checked ? "#c8a86b" : "rgba(200,168,107,0.4)"}`,
                    background: checked ? "rgba(200,168,107,0.22)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#c8a86b", fontSize: "10px",
                    transition: "background 0.3s ease, border-color 0.3s ease",
                  }}>
                    <span style={{
                      opacity: checked ? 1 : 0,
                      transform: checked ? "scale(1)" : "scale(0.4)",
                      transition: "opacity 0.25s ease, transform 0.25s ease",
                    }}>
                      ✓
                    </span>
                  </span>
                  <span style={{
                    position: "relative", fontFamily: "'Literata', Georgia, serif", fontSize: "14px",
                    color: checked ? "rgba(212,206,196,0.45)" : "#d4cec4",
                    transition: "color 0.5s ease",
                  }}>
                    {task.title}
                    <span style={{
                      position: "absolute", left: 0, top: "50%", height: "1px",
                      background: "rgba(212,206,196,0.6)",
                      width: checked ? "100%" : "0%",
                      transition: "width 0.35s ease",
                    }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Static mockup of a finished chapter — the "becomes a story" payoff, shown
// on its own beat, separate from the checklist demo earlier in the intro.
function ChapterRevealDemo() {
  return (
    <div style={{ padding: "20px 0 8px" }}>
      <div style={{
        width: "65%", margin: "0 auto", borderRadius: "16px", overflow: "hidden",
        border: "1px solid rgba(200,168,107,0.28)", background: "#141210",
      }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(200,168,107,0.45)" }}>
              Chapter 1
            </span>
            <DemoTape background="#cbc5b6" rotate={1}>Fog — the uncertain stretch</DemoTape>
          </div>
          <h3 style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "19px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0, color: "#e8e0d0" }}>
            The map nobody could agree on
          </h3>
          <p style={{ fontFamily: "'Literata', Georgia, serif", fontStyle: "italic", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0", color: "rgba(232,224,208,0.55)" }}>
            Three teams, three versions of the truth
          </p>
          <p style={{ fontFamily: "var(--font-cass)", fontSize: "17px", lineHeight: 1.3, margin: "16px 0 0" }}>
            <span style={{
              display: "inline-block", background: "#f5c84a", color: "#1a0e00",
              padding: "3px 12px 4px", clipPath: DEMO_TAPE_CLIP,
            }}>
              &ldquo;Every team swore their spreadsheet was the real one.&rdquo;
            </span>
          </p>
          <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "12.5px", lineHeight: 1.6, margin: "10px 0 0", color: "rgba(212,206,196,0.72)" }}>
            It started as a two-day task: list the datasets, tag the owners, move on. Four weeks later, nobody fully trusted the list.
          </p>
        </div>
      </div>
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
        background: "#242424", padding: "6px 16px",
        display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0,
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

// ── Typewriter text component ─────────────────────────────────────────────────

function TypewriterText({ text, style, onComplete }: { text: string; style?: React.CSSProperties; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 18); // ~55 chars/sec
    return () => clearInterval(interval);
  }, [text]);

  return <span style={style}>{displayed}</span>;
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

// ── Audio volume constants ────────────────────────────────────────────────────
// Adjust these to balance pre-recorded files against ElevenLabs TTS output.
const PRERECORDED_VOLUME = 0.5;
const TTS_VOLUME = 1.0;

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
    // Returning user creating a new project: skip the step-by-step intro,
    // jump straight to the interview with all slides pre-rendered above
    if (hasExistingProjects) return "interview";
    return "intro";
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [fadingOut, setFadingOut] = useState(false);
  const [answers, setAnswers] = useState<OnboardingDraft["answers"]>(
    existingDraft?.answers ?? { ...EMPTY_ANSWERS }
  );
  const [rawDescription, setRawDescription] = useState(existingDraft?.raw_description ?? existingDraft?.answers?.project_goal ?? "");
  const [animState, setAnimState] = useState<CassAnimState>("idle");

  const [projectName, setProjectName] = useState(existingDraft?.project_name ?? "");
  const [proposedChapters, setProposedChapters] = useState<OnboardingDraft["proposed_chapters"]>(
    existingDraft?.proposed_chapters ?? []
  );
  const [proposedTasks, setProposedTasks] = useState<Array<{ title: string; column: string; notes?: string }>>([]);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // ── Intro state (merged from IntroScreen) ────────────────────────────────
  const [revealed, setRevealed] = useState(
    existingDraft || hasExistingProjects ? INTRO_SLIDES.length : 1
  );
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const cassHeroRef = useRef<HTMLDivElement>(null);
  const introSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introChipRef = useRef<HTMLDivElement>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introBlobUrlRef = useRef<string | null>(null);
  const introFetchingRef = useRef<number | null>(null); // synchronous guard against double-fetch (StrictMode)
  const [introPlayingIndex, setIntroPlayingIndex] = useState<number | null>(null);
  const [introLoadingIndex, setIntroLoadingIndex] = useState<number | null>(null);

  const introCurrentSlide = INTRO_SLIDES[revealed - 1];
  const isDone = introCurrentSlide?.isLast ?? false;

  async function toggleIntroAudio(index: number) {
    // If already playing this slide, pause it
    if (introPlayingIndex === index) {
      introAudioRef.current?.pause();
      introAudioRef.current = null;
      if (introBlobUrlRef.current) { URL.revokeObjectURL(introBlobUrlRef.current); introBlobUrlRef.current = null; }
      setIntroPlayingIndex(null);
      introFetchingRef.current = null;
      return;
    }
    // Synchronous guard: bail if a fetch for this index is already in-flight
    // (prevents StrictMode double-invocation from spawning two concurrent fetches)
    if (introFetchingRef.current === index) return;
    introFetchingRef.current = index;

    // Stop any current audio
    if (introAudioRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current = null;
    }
    if (introBlobUrlRef.current) { URL.revokeObjectURL(introBlobUrlRef.current); introBlobUrlRef.current = null; }
    setIntroPlayingIndex(null);

    setIntroLoadingIndex(index);
    try {
      const res = await fetch("/api/tts/cass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: INTRO_SLIDES[index].cassText }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      introBlobUrlRef.current = url;
      const audio = new Audio(url);
      audio.volume = TTS_VOLUME;
      introAudioRef.current = audio;
      setIntroLoadingIndex(null);
      setIntroPlayingIndex(index);
      introFetchingRef.current = null;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (introBlobUrlRef.current === url) introBlobUrlRef.current = null;
        if (introAudioRef.current === audio) { introAudioRef.current = null; setIntroPlayingIndex(null); }
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
    } catch {
      setIntroLoadingIndex(null);
      introFetchingRef.current = null;
    }
  }

  // Auto-play intro audio when a new slide is revealed (only in intro phase)
  useEffect(() => {
    if (phase !== "intro") return;
    toggleIntroAudio(revealed - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // Center the new chunk (slide + chip) vertically after each intro reveal
  useEffect(() => {
    if (phase !== "intro" || revealed === 1) return;
    const scrollEl = mainScrollRef.current;
    const newSlideEl = introSlideRefs.current[revealed - 1];
    const chipEl = introChipRef.current;
    if (!scrollEl || !newSlideEl) return;

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
  }, [revealed, phase]);

  // Cleanup intro audio on unmount
  useEffect(() => {
    return () => { introAudioRef.current?.pause(); };
  }, []);

  function handleIntroComplete() {
    setPhase("interview");
    // scrolling to chat is handled by the existing chatMessages useEffect
  }

  // ── Chat state for the multi-turn interview ──────────────────────────────
  type ChatMsg = { role: "user" | "assistant"; content: string };
  const WELCOME_MESSAGE = "Hi, I'm Cass. Authored By is an author's story engine where we capture your journey chapter by chapter, so the story of what you built is never lost.";
  // The last intro slide (beat-5) already asks "What are you in the middle of
  // right now?" — the interview used to re-ask a near-identical question here,
  // which read as duplicative. That message is gone; the user's answer to
  // beat-5 is the first turn, and the AI's system prompt already treats it
  // that way ("the first user message is their response to the opening").
  const CONVO_MODE_NOTE = "I've got conversation mode enabled so we can talk out loud like a normal conversation. If you'd rather type, exit conversation mode.";
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatPending, setIsChatPending] = useState(false);
  // Nintendo-style gating: user must press Continue after each Cass message
  const [showContinue, setShowContinue] = useState(false);
  const [inputRevealed, setInputRevealed] = useState(true);
  const [chatDone, setChatDone] = useState(false);
  // True once the typewriter finishes on the latest Cass message — gates the input footer.
  // Starts true: there's no seed Cass message to wait on anymore, the input
  // should be available as soon as the interview section appears.
  const [latestMsgTyped, setLatestMsgTyped] = useState(true);
  // Final transition state — show "Let's go" chip after final message typewriter completes
  const [showBoardContinue, setShowBoardContinue] = useState(false);
  const boardUrlRef = useRef<string | null>(null);

  // ── Voice conversation mode ──────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Callback ref so speakAsCass can re-open the mic after audio ends
  const openMicRef = useRef<(() => void) | null>(null);

  async function speakAsCass(text: string) {
    if (!voiceMode || !text.trim()) return;

    setIsSpeaking(true);
    setAnimState("talking");

    const onEnd = () => {
      setIsSpeaking(false);
      setAnimState("listening");
      openMicRef.current?.();
    };

    try {
      await ttsSpeak(text, onEnd);
    } catch {
      onEnd();
    }
  }

  async function ttsSpeak(text: string, onEnd: () => void) {
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

  // Entering interview phase: stop any intro slide audio still playing and
  // hand off straight to listening — there's no seed question to speak
  // anymore (beat-5 already asked it during the intro), so voice mode goes
  // straight to the mic via VoiceInputFooter's own auto-listen effect.
  useEffect(() => {
    if (phase !== "interview") return;

    if (introAudioRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current = null;
    }
    if (introBlobUrlRef.current) {
      URL.revokeObjectURL(introBlobUrlRef.current);
      introBlobUrlRef.current = null;
    }
    setIntroPlayingIndex(null);
    introFetchingRef.current = null;

    setAnimState(voiceMode ? "listening" : "idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-scroll to bottom whenever Cass sends a new message or typing indicator
  // appears — also fires the instant the intro finishes and the interview
  // section mounts, so the user lands on beat-5 / the input, not the top of
  // the intro. Instant (not smooth) jump: on the "start a new project" fast
  // path all 5 intro slides + the interview section render in one
  // synchronous batch, so scrollHeight isn't reliable until a full
  // layout/paint cycle has settled, and a "smooth" animated scroll across
  // that much content reads as slow/janky on first load anyway. rAF plus a
  // short timeout as backup, since rAF alone isn't dependable in every case
  // (browsers throttle/skip it for backgrounded or not-yet-focused tabs).
  useEffect(() => {
    if (phase !== "interview") return;
    const el = mainScrollRef.current;
    if (!el) return;
    const scrollToBottom = () => { el.scrollTop = el.scrollHeight; };
    const raf = requestAnimationFrame(scrollToBottom);
    const timer = setTimeout(scrollToBottom, 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [chatMessages, isChatPending, phase]);

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
        proposed_tasks?: Array<{ title: string; column: string; notes?: string }>;
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
        setProposedTasks(data.proposed_tasks ?? []);
        // Always show a closing message — use AI reply if present, otherwise a fixed wrap-up
        const closingMessage = reply || "Thanks, I have everything I need. Let's take you to your project board.";
        setChatMessages([...newMessages, { role: "assistant", content: closingMessage }]);
        setLatestMsgTyped(false);
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
        setLatestMsgTyped(false);
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

  // User opted out of the interview early — wrap up with whatever's been
  // shared so far, no extra AI call needed.
  function handleEarlySkip() {
    if (chatDone || isChatPending) return;
    setChatMessages((prev) => [...prev, { role: "assistant", content: EARLY_SKIP_MSG }]);
    setLatestMsgTyped(false);
    setInputRevealed(false);
    setChatDone(true);
    setAnimState("idle");
    setShowContinue(true);
  }

  const EARLY_SKIP_MSG = "Sounds good — let's get this into your project board.";
  const FINAL_MSG = "We're writing a really great story here. I've taken some of the action items from our conversation and placed them into your project board. You can use the board to track your work, add new tasks, or chronicle things as you accomplish them. Let's check it out.";

  function handleContinue() {
    if (chatDone) {
      setError(null);
      setIsChatPending(true);
      setShowContinue(false);
      setInputRevealed(false);
      startSaveTransition(async () => {
        try {
          const { projectId, chapter1Id } = await completeProjectKickoffAction({
            name: projectName || answers.project_goal.slice(0, 80) || "My Project",
            northStar: answers.north_star,
            projectGoal: answers.project_goal,
            projectAudience: answers.project_audience,
            projectSuccess: answers.project_success,
            projectBiggestRisk: answers.project_biggest_risk,
            conversation: chatMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            proposedChapters: proposedChapters.map((ch) => ({
              chapterNumber: ch.chapter_number,
              title: ch.title,
              goal: ch.goal,
              prefill: ch.prefill ?? null,
            })),
            createPreludeChapter: false,
            proposedTasks,
          });
          await clearOnboardingDraftAction();
          const url = `/projects/${projectId}/chapters/${chapter1Id}/board?skipIntro=true`;
          boardUrlRef.current = url;
          // Append final Cass message in the chat
          setChatMessages((prev) => [...prev, { role: "assistant", content: FINAL_MSG }]);
          setLatestMsgTyped(false);
          setIsChatPending(false);
          if (voiceMode) await speakAsCass(FINAL_MSG);
          // showBoardContinue is set by the typewriter's onComplete (see render)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to set up project.");
          setIsChatPending(false);
          setChatDone(true);
          setShowContinue(true);
          setInputRevealed(true);
        }
      });
      return;
    }
    setShowContinue(false);
    setInputRevealed(true);
  }

  function handleGoToBoard() {
    const url = boardUrlRef.current;
    if (!url) return;
    setFadingOut(true);
    setTimeout(() => router.push(url), 700);
  }

  function handleEditAnswer(field: AnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  // Count assistant turns to gauge interview progress (0 = opening answered,
  // 1 = follow-up/risk reply, 2 = last question reply). There's no seed
  // opening message in chatMessages anymore, so these no longer count a
  // phantom first turn — shifted down by one from before.
  const assistantTurns = chatMessages.filter((m) => m.role === "assistant").length;
  const userTurns = chatMessages.filter((m) => m.role === "user").length;
  const interviewProgress =
    assistantTurns >= 2 ? 75 :
    assistantTurns === 1 ? 55 :
    userTurns > 0 ? 30 :
    0;

  const progressPercent =
    phase === "intro"      ? 0  :
    phase === "interview"  ? interviewProgress :
    85; // generating

  // Index of the latest assistant message (for typewriter)
  const latestAssistantIndex = chatMessages.reduce((acc, m, i) => m.role === "assistant" ? i : acc, -1);

  // Cass's reply often combines an acknowledgment paragraph with the next
  // question as separate "\n\n"-delimited paragraphs. They must typewriter
  // in sequence, not all at once — revealedParaCount tracks how many
  // paragraphs of the latest message are visible/animating.
  const [revealedParaCount, setRevealedParaCount] = useState(1);
  const [prevLatestAssistantIndex, setPrevLatestAssistantIndex] = useState(latestAssistantIndex);
  if (latestAssistantIndex !== prevLatestAssistantIndex) {
    setPrevLatestAssistantIndex(latestAssistantIndex);
    setRevealedParaCount(1);
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div style={{ opacity: fadingOut ? 0 : 1, transition: "opacity 0.7s ease", minHeight: "100dvh" }}>
      <style>{`
        @keyframes cass-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cass-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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
        .onboarding-content {
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
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
        .chat-scrollbar { scrollbar-width: none; }
        .chat-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <CassProgressBar percent={progressPercent} />
      </div>

      {hasExistingProjects && (
        <button type="button" onClick={() => router.back()} aria-label="Close"
          style={{ position: "fixed", top: "16px", right: "16px", zIndex: 20, background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "4px", transition: "color 0.2s", fontFamily: "'Literata', Georgia, serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
        >✕</button>
      )}

      {/* ── Intro + Interview: unified continuous scroll layout ── */}
      {(phase === "intro" || phase === "interview") && (
        <div style={{
          display: "flex", flexDirection: "column",
          width: "100%", height: "100dvh",
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
        }}>
          {/* Header */}
          <OnboardingHeader />

          {/* Single shared scroll container */}
          <div
            ref={mainScrollRef}
            className="chat-scrollbar"
            style={{
              flex: 1, overflowY: "auto",
              padding: "32px 16px 20px",
              display: "flex", flexDirection: "column", gap: "24px",
              maxWidth: "600px", width: "100%", margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {/* Cass hero — always at top */}
            <div ref={cassHeroRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <CassRecorder animState={phase === "intro" ? "talking" : animState} size="md" />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)",
              }}>Cass · Story Guide</span>
            </div>

            {/* Intro slides — always rendered so they stay in scroll history */}
            {INTRO_SLIDES.slice(0, revealed).map((slide, i) => {
              const isLatest = i === revealed - 1 && phase === "intro";

              return (
                <div key={slide.id} ref={(el) => { introSlideRefs.current[i] = el; }} style={{ display: "flex", flexDirection: "column", gap: "16px", animation: isLatest ? "cass-fade-up 0.35s ease forwards" : "none" }}>

                  {/* Message text + audio play button */}
                  <div style={{ maxWidth: "85%", margin: "0 auto", width: "100%" }}>
                    {slide.cassText.split("\n\n").map((para, j) => (
                      <p key={j} style={{
                        fontFamily: "'Lora', Georgia, serif", fontSize: "15px",
                        lineHeight: "1.65", color: "#f8f8f6", margin: j > 0 ? "10px 0 0" : 0,
                      }}>
                        {para}
                      </p>
                    ))}
                    <button
                      type="button"
                      onClick={() => toggleIntroAudio(i)}
                      disabled={introLoadingIndex !== null && introLoadingIndex !== i}
                      title={introPlayingIndex === i ? "Pause" : introLoadingIndex === i ? "Loading…" : "Listen"}
                      style={{
                        marginTop: "12px",
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        background: "transparent",
                        border: "1px solid rgba(248,248,246,0.18)",
                        borderRadius: "20px",
                        padding: "5px 12px 5px 9px",
                        cursor: introLoadingIndex === i ? "default" : "pointer",
                        color: introPlayingIndex === i ? "#f5c84a" : introLoadingIndex === i ? "rgba(248,248,246,0.6)" : "rgba(248,248,246,0.45)",
                        fontSize: "11px",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        transition: "color 0.15s, border-color 0.15s",
                        ...(introPlayingIndex === i ? { borderColor: "rgba(245,200,74,0.4)" } : {}),
                      }}
                      onMouseEnter={(e) => {
                        if (introPlayingIndex !== i && introLoadingIndex !== i) e.currentTarget.style.color = "rgba(248,248,246,0.75)";
                      }}
                      onMouseLeave={(e) => {
                        if (introPlayingIndex !== i && introLoadingIndex !== i) e.currentTarget.style.color = "rgba(248,248,246,0.45)";
                      }}
                    >
                      {introPlayingIndex === i ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                          <rect x="1" y="1" width="3" height="8" rx="1" />
                          <rect x="6" y="1" width="3" height="8" rx="1" />
                        </svg>
                      ) : introLoadingIndex === i ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }}>
                          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="18" strokeDashoffset="6" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                          <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                        </svg>
                      )}
                      {introPlayingIndex === i ? "Playing" : introLoadingIndex === i ? "Loading" : "Listen"}
                    </button>
                  </div>

                  {/* Checklist demo — right under "finish the thing you keep almost finishing" */}
                  {slide.id === "beat-2" && <ChecklistDemo />}

                  {/* Chapter reveal demo — right under "You talk, I listen." */}
                  {slide.id === "beat-4" && <ChapterRevealDemo />}
                </div>
              );
            })}

            {/* Continue chip — only during intro phase */}
            {phase === "intro" && (
              <div ref={introChipRef} style={{ display: "flex", justifyContent: "center" }}>
                {isDone ? (
                  <button type="button" className="chat-chip" onClick={handleIntroComplete}
                    style={{ background: "#f5c84a", color: "#1a0e00", borderColor: "#f5c84a" }}>
                    Let&apos;s get started →
                  </button>
                ) : (
                  <button type="button" className="chat-chip" onClick={() => setRevealed(n => n + 1)}>
                    Continue
                    <span style={{ marginLeft: "6px", animation: "cass-blink 1.1s step-end infinite" }}>▶</span>
                  </button>
                )}
              </div>
            )}

            {/* Chat section — appears after intro completes */}
            {phase === "interview" && (
              <>
                {/* Subtle section divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", animation: "cass-fade-in 0.4s ease" }}>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(248,248,246,0.2)" }}>Let&apos;s talk</span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Conversation mode hint — beat-5 already asked the opening
                    question, so this just orients the author to voice mode
                    before they answer it. */}
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "12px", letterSpacing: "0.04em",
                  lineHeight: "1.6",
                  color: "rgba(248,248,246,0.38)",
                  margin: 0,
                  maxWidth: "85%", width: "100%", marginLeft: "auto", marginRight: "auto",
                  animation: "cass-fade-in 0.4s ease 0.2s both",
                }}>
                  {CONVO_MODE_NOTE}
                </p>

                {/* Chat messages */}
                {chatMessages.map((msg, i) => (
                  msg.role === "assistant" ? (
                    <div key={i} style={{ maxWidth: "85%", width: "100%", margin: "0 auto", animation: "cass-fade-up 0.3s ease forwards" }}>
                      {(() => {
                        const paras = msg.content.split("\n\n");
                        const isLatest = i === latestAssistantIndex;
                        // Historical messages: every paragraph is already fully typed.
                        // Latest message: reveal paragraphs one at a time, in sequence.
                        const visibleCount = isLatest ? Math.min(revealedParaCount, paras.length) : paras.length;
                        return paras.slice(0, visibleCount).map((para, j) => {
                          const isActivePara = isLatest && j === visibleCount - 1;
                          const isFinalPara = j === paras.length - 1;
                          return (
                            <p key={j} style={{
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "15px", lineHeight: "1.65",
                              color: "#f8f8f6", margin: j > 0 ? "10px 0 0" : 0,
                            }}>
                              {isActivePara ? (
                                <TypewriterText
                                  text={para}
                                  onComplete={() => {
                                    if (!isFinalPara) {
                                      // More paragraphs queued — reveal the next one.
                                      setRevealedParaCount((c) => c + 1);
                                      return;
                                    }
                                    setLatestMsgTyped(true);
                                    // Final message (after board save): reveal the "Let's check it out" chip
                                    if (boardUrlRef.current && i === latestAssistantIndex) {
                                      setShowBoardContinue(true);
                                    }
                                  }}
                                />
                              ) : para}
                            </p>
                          );
                        });
                      })()}
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

                {/* Board transition chip — appears after final message typewriter completes */}
                {showBoardContinue && (
                  <div style={{ display: "flex", justifyContent: "center", animation: "cass-fade-in 0.35s ease" }}>
                    <button
                      type="button"
                      className="chat-chip"
                      onClick={handleGoToBoard}
                      style={{ background: "#f5c84a", color: "#1a0e00", borderColor: "#f5c84a" }}
                    >
                      Let&apos;s check it out →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Spacer */}
            <div style={{ flexShrink: 0, height: "40vh" }} />
          </div>

          {/* Input footer — only in interview */}
          {phase === "interview" && inputRevealed && !isChatPending && latestMsgTyped && (
            <VoiceInputFooter
              value={chatInput}
              onChange={setChatInput}
              onSubmit={handleChatSubmit}
              voiceMode={voiceMode}
              onRegisterOpenMic={(fn) => { openMicRef.current = fn; }}
              onExitVoiceMode={toggleVoiceMode}
              textRowMarginLeft="7.5%"
            />
          )}

          {/* Early-exit link — quiet, always-available once they've answered at least once */}
          {phase === "interview" && inputRevealed && !isChatPending && latestMsgTyped && !chatDone && userTurns >= 1 && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <button
                type="button"
                onClick={handleEarlySkip}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13px",
                  color: "rgba(248,248,246,0.35)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(248,248,246,0.2)",
                }}
              >
                I&apos;ve shared enough, build my board
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Non-chat phases — centered layout ── */}
      {phase === "generating" && (
        <div className="onboarding-outer">
          <div className="onboarding-content">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", maxWidth: "480px", width: "100%" }}>
              <CassRecorder animState="recording" size="md" />
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%", textAlign: "center" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>
                  Rolling on this. Building your project brief and chapter plan...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
