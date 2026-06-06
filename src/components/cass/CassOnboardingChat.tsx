"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CassAnimState } from "./cassVoice";
import type { WorkplanChapter } from "@/components/projects/workplan-proposal";
import type { OnboardingDraft } from "@/types";
import { CassProgressBar } from "./CassProgressBar";
import { CassRecorder } from "./CassRecorder";
import { CassSpeechBubble } from "./CassSpeechBubble";
import { CassInput } from "./CassInput";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";
import { WorkplanProposal } from "@/components/projects/workplan-proposal";
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

// ── Interview questions ───────────────────────────────────────────────────────

type AnswerKey = keyof OnboardingDraft["answers"];

const QUESTIONS: Array<{
  field: AnswerKey;
  cassLine: string;
  placeholder: string;
  label: string;
  icon: string;
  quickTaps?: string[];
}> = [
  {
    field: "project_goal",
    cassLine: "Alright, tape's rolling. What are you building?",
    placeholder: "Tell me anything. A sentence is fine.",
    label: "The Project",
    icon: "◉",
  },
  {
    field: "north_star",
    cassLine: "Good. Now the real question — what's the conviction behind this? The one thing you believe that most people don't yet?",
    placeholder: "The belief driving the work...",
    label: "North Star",
    icon: "★",
  },
  {
    field: "project_audience",
    cassLine: "Who is this for, and what does it change for them?",
    placeholder: "The people you're building for...",
    label: "Who It's For",
    icon: "◎",
  },
  {
    field: "project_success",
    cassLine: "What does winning look like — something specific you could point to?",
    placeholder: "A clear, observable outcome...",
    label: "What Success Looks Like",
    icon: "✓",
  },
  {
    field: "project_biggest_risk",
    cassLine: "Last one. What's the biggest unknown you're carrying into this?",
    placeholder: "The thing keeping you up at night...",
    label: "Biggest Risk",
    icon: "?",
    quickTaps: [
      "Running out of runway",
      "Finding and keeping customers",
      "Technical complexity",
      "Competition moving faster",
      "Building the right team",
      "Something else...",
    ],
  },
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
    cassText: "Hey — I'm Cass. Welcome to Authored By, your founder's story engine.\n\nEvery project you build has a real story behind it: the decisions, the pivots, the 2am moments that changed everything. My job is to make sure none of it gets lost.",
    showTy: false,
    showPress: false,
    isLast: false,
  },
  {
    id: "meet-ty",
    cassText: "When you're ready to share what you've built, meet Ty. Ty takes everything we've captured and helps you craft the narrative — launch announcements, press releases, the story that actually lands.",
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

type Phase = "intro" | "journey" | "interview" | "generating" | "review" | "chronicle-offer" | "workplan" | "saving";

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

// ── Intro screen ──────────────────────────────────────────────────────────────

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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "520px", gap: "28px" }}>
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

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "24px", width: "100%", minHeight: "160px" }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: slide.showPress ? 1 : 0,
          transform: slide.showPress ? "translateX(0) scale(1)" : "translateX(-50px) scale(0.9)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
          pointerEvents: "none",
        }}>
          <PressMonitor animState={slide.showPress ? "talking" : "idle"} size="sm" />
          <AvatarLabel name="Press" role="Presentation Designer" />
        </div>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          transform: (slide.showTy || slide.showPress) ? "scale(0.88)" : "scale(1)",
          transition: "transform 0.45s ease",
          transformOrigin: "bottom center",
        }}>
          <CassRecorder animState="talking" size="md" />
          <AvatarLabel name="Cass" role="Story Guide" />
        </div>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: slide.showTy ? 1 : 0,
          transform: slide.showTy ? "translateX(0) scale(1)" : "translateX(50px) scale(0.9)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
          pointerEvents: "none",
        }}>
          <TypewriterRecorder animState={slide.showTy ? "typing" : "idle"} size="sm" />
          <AvatarLabel name="Ty" role="Narrative Writer" />
        </div>
      </div>

      <div style={{
        width: "100%",
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.26s ease, transform 0.26s ease",
      }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px" }}>
          {slide.cassText.split("\n\n").map((para, i) => (
            <p key={i} style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.65", color: "#d4cec4", margin: i > 0 ? "12px 0 0" : 0 }}>
              {para}
            </p>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
        {slide.isLast ? (
          <TapeButton variant="primary" size="md" onClick={advance} className="w-full justify-center">
            Let&apos;s get started →
          </TapeButton>
        ) : (
          <TapeButton variant="secondary" size="sm" onClick={advance}>Next →</TapeButton>
        )}
        {slideIndex > 0 && (
          <TapeButton variant="ghost" size="sm" onClick={goBack}>← Back</TapeButton>
        )}
      </div>
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
      if (existingDraft.step >= 5 && existingDraft.proposed_chapters.length > 0) return "workplan";
      if (existingDraft.step >= 5) return "generating";
      if (existingDraft.journeyStage) return "interview";
      return "journey";
    }
    return hasExistingProjects ? "journey" : "intro";
  };

  const getInitialStep = (): number => {
    if (existingDraft) return Math.min(existingDraft.step, QUESTIONS.length - 1);
    return 0;
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [interviewStep, setInterviewStep] = useState(getInitialStep);
  const [journeyStage, setJourneyStage] = useState<string>(existingDraft?.journeyStage ?? "");
  const [journeyAckVisible, setJourneyAckVisible] = useState(false);
  const [answers, setAnswers] = useState<OnboardingDraft["answers"]>(
    existingDraft?.answers ?? { ...EMPTY_ANSWERS }
  );
  const [inputValue, setInputValue] = useState("");
  const [animState, setAnimState] = useState<CassAnimState>("idle");
  const [isResuming] = useState(!!existingDraft);
  const [wantChronicle, setWantChronicle] = useState(existingDraft?.wantChronicle ?? false);

  const [projectName, setProjectName] = useState(existingDraft?.project_name ?? "");
  const [proposedChapters, setProposedChapters] = useState<OnboardingDraft["proposed_chapters"]>(
    existingDraft?.proposed_chapters ?? []
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const currentQuestion = QUESTIONS[interviewStep];
  const isLastQuestion = interviewStep === QUESTIONS.length - 1;

  // Show chronicle offer for non-origin users
  const shouldOfferChronicle = journeyStage !== "origin" && journeyStage !== "";

  // Auto-save draft
  useEffect(() => {
    if (phase === "journey" || phase === "interview" || phase === "generating" || phase === "review") {
      const draft: OnboardingDraft = {
        step: interviewStep,
        journeyStage,
        wantChronicle,
        answers,
        project_name: projectName,
        proposed_chapters: proposedChapters,
        updated_at: new Date().toISOString(),
      };
      saveOnboardingDraftAction(draft).catch(console.error);
    }
  }, [answers, interviewStep, phase, projectName, proposedChapters, journeyStage, wantChronicle]);

  // Animate Cass when question changes
  useEffect(() => {
    if (phase === "interview") {
      setAnimState("talking");
      const t = setTimeout(() => setAnimState("listening"), 1800);
      return () => clearTimeout(t);
    }
  }, [interviewStep, phase]);

  function handleJourneySelect(id: string, label: string) {
    const value = id === "custom" ? "" : label;
    setJourneyStage(id === "custom" ? "custom" : id);
    setJourneyAckVisible(true);
    setAnimState("talking");

    // After showing ack, move to interview
    setTimeout(() => {
      setJourneyStage(id === "custom" ? "custom" : id);
      setAnimState("listening");
    }, 400);

    setTimeout(() => {
      setJourneyAckVisible(false);
      setTimeout(() => {
        setPhase("interview");
        setAnimState("talking");
      }, 300);
    }, 2800);
  }

  function handleJourneyCustom(value: string) {
    setJourneyStage(value);
    setJourneyAckVisible(true);
    setAnimState("talking");
    setTimeout(() => {
      setJourneyAckVisible(false);
      setTimeout(() => {
        setPhase("interview");
        setAnimState("talking");
      }, 300);
    }, 2800);
  }

  async function handleAnswerSubmit(value?: string) {
    const trimmed = (value ?? inputValue).trim();
    if (!trimmed) return;

    const updatedAnswers = { ...answers, [currentQuestion.field]: trimmed };
    setAnswers(updatedAnswers);
    setInputValue("");

    if (isLastQuestion) {
      setPhase("generating");
      setAnimState("recording");
      await generatePlan(updatedAnswers);
    } else {
      setInterviewStep((s) => s + 1);
    }
  }

  async function generatePlan(finalAnswers: OnboardingDraft["answers"]) {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/project-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAnswers),
      });
      const data = await res.json() as { project_name?: string; proposed_chapters?: OnboardingDraft["proposed_chapters"]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setProjectName(data.project_name ?? "");
      setProposedChapters(data.proposed_chapters ?? []);
      setPhase("review");
      setAnimState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setPhase("interview");
      setInterviewStep(QUESTIONS.length - 1);
      setAnimState("listening");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleEditAnswer(field: AnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleReviewComplete() {
    if (shouldOfferChronicle) {
      setPhase("chronicle-offer");
    } else {
      setPhase("workplan");
    }
  }

  function handleProceedToWorkplan() {
    setPhase("workplan");
  }

  function handleAcceptWorkplan(chapters: WorkplanChapter[]) {
    setError(null);
    setPhase("saving");

    startSaveTransition(async () => {
      try {
        const { projectId, chapter1Id, chronicleChapterId } = await completeProjectKickoffAction({
          name: projectName || answers.project_goal.slice(0, 80),
          northStar: answers.north_star,
          projectGoal: answers.project_goal,
          projectAudience: answers.project_audience,
          projectSuccess: answers.project_success,
          projectBiggestRisk: answers.project_biggest_risk,
          conversation: [{ role: "user", content: answers.project_goal }],
          proposedChapters: chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            goal: ch.goal,
            prefill: ch.prefill ?? null,
          })),
          createChronicleChapter: wantChronicle,
        });
        await clearOnboardingDraftAction();

        // If they want to chronicle, send them there first; otherwise chapter 1
        if (wantChronicle && chronicleChapterId) {
          router.push(`/projects/${projectId}/chapters/${chronicleChapterId}`);
        } else {
          router.push(`/projects/${projectId}/chapters/${chapter1Id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up project.");
        setPhase("workplan");
      }
    });
  }

  const progressPercent =
    phase === "intro"             ? 5  :
    phase === "journey"           ? 10 :
    phase === "interview"         ? 15 + (interviewStep / QUESTIONS.length) * 40 :
    phase === "generating"        ? 60 :
    phase === "review"            ? 70 :
    phase === "chronicle-offer"   ? 75 :
    phase === "workplan"          ? 85 :
    100;

  // ── Workplan phase ──────────────────────────────────────────────────────────
  if (phase === "workplan") {
    const initialChapters: WorkplanChapter[] = proposedChapters.map((ch) => ({
      chapterNumber: ch.chapter_number,
      title: ch.title,
      goal: ch.goal,
      prefill: ch.prefill ? { goal: ch.prefill.goal, value: ch.prefill.value, measure: ch.prefill.measure, done: ch.prefill.done } : null,
    }));

    return (
      <div style={{ minHeight: "100dvh", background: "#0a0a0a", backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)", display: "flex", flexDirection: "column", padding: "0", fontFamily: "var(--font-cass)", color: "#c8c8c8" }}>
        <CassProgressBar percent={isSaving ? 100 : 85} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", justifyContent: "center" }}>
            <CassRecorder animState="idle" size="sm" />
            <div>
              <div style={{ fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "3px", color: "#c8a86b", textTransform: "uppercase", marginBottom: "4px" }}>● Tape loaded</div>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: "18px", color: "#d4cec4" }}>{projectName || "Your project"}</div>
            </div>
          </div>
          {error && <p style={{ color: "#ff3b30", fontFamily: "var(--font-cass)", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>{error}</p>}
          <WorkplanProposal
            projectName={projectName || answers.project_goal.slice(0, 80)}
            northStar={answers.north_star}
            initialChapters={initialChapters}
            isSaving={isSaving}
            onAccept={handleAcceptWorkplan}
            error={null}
          />
        </div>
      </div>
    );
  }

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
        .onboarding-steps-sidebar {
          display: none;
        }
        .onboarding-inline-dots {
          display: flex;
        }
        .onboarding-content {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @media (min-width: 900px) {
          .onboarding-inline-dots {
            display: none;
          }
          .onboarding-outer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: stretch;
            padding: 0;
            justify-content: unset;
            flex-direction: unset;
          }
          .onboarding-steps-sidebar {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 80px 64px;
            border-right: 1px solid rgba(200,168,107,0.08);
          }
          .onboarding-content {
            max-width: unset;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 64px;
          }
        }
      `}</style>

      <div className="onboarding-outer">
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

        {/* Desktop step sidebar */}
        {(phase === "interview" || phase === "review" || phase === "generating") && (
          <aside className="onboarding-steps-sidebar">
            <div style={{ marginBottom: "48px" }}>
              <div style={{ fontFamily: "var(--font-cass)", fontSize: "10px", letterSpacing: "4px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginBottom: "10px" }}>
                Authored By
              </div>
              <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "32px", color: "#d4cec4", fontWeight: 700, lineHeight: 1.2 }}>
                Project Brief
              </div>
              <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "15px", color: "rgba(212,206,196,0.4)", marginTop: "8px", lineHeight: 1.7 }}>
                Answer these five questions as honestly as you can — there are no wrong answers. The more you share, the better Cass can capture your story as you build. Get through this once, and everything else takes care of itself.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {QUESTIONS.map((q, i) => {
                const isComplete = answers[q.field].trim().length > 0;
                const isCurrent = phase === "interview" && i === interviewStep;

                return (
                  <div key={q.field} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: isCurrent ? "rgba(200,168,107,0.07)" : "transparent",
                    border: isCurrent ? "1px solid rgba(200,168,107,0.15)" : "1px solid transparent",
                    transition: "all 0.25s ease",
                  }}>
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isComplete ? "#c8a86b" : "transparent",
                      border: isComplete ? "none" : isCurrent ? "2px solid #c8a86b" : "2px solid rgba(200,168,107,0.2)",
                      transition: "all 0.3s ease",
                    }}>
                      {isComplete && <Check size={13} color="#1a0e00" strokeWidth={3} />}
                      {isCurrent && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8a86b" }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--font-cass)",
                        fontSize: "11px",
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color: isComplete ? "rgba(200,168,107,0.8)" : isCurrent ? "#c8a86b" : "rgba(200,168,107,0.25)",
                        transition: "color 0.2s ease",
                        marginBottom: isComplete ? "6px" : 0,
                      }}>
                        {q.label}
                      </div>
                      {isComplete && (
                        <div style={{
                          fontFamily: "'Literata', Georgia, serif",
                          fontSize: "14px",
                          color: "rgba(212,206,196,0.6)",
                          lineHeight: 1.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical" as const,
                        }}>
                          {answers[q.field]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(phase === "review" || phase === "generating") && (
              <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(200,168,107,0.1)" }}>
                <div style={{ fontFamily: "var(--font-cass)", fontSize: "10px", letterSpacing: "2px", color: "rgba(200,168,107,0.6)", textTransform: "uppercase" }}>
                  {phase === "generating" ? "◉ Generating plan..." : "◉ Brief complete"}
                </div>
              </div>
            )}
          </aside>
        )}

        <div className="onboarding-content">

          {/* ── Intro ── */}
          {phase === "intro" && <IntroScreen onComplete={() => setPhase("journey")} />}

          {/* ── Journey stage ── */}
          {phase === "journey" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "520px", gap: "24px", animation: "cass-fade-in 0.4s ease" }}>
              <CassRecorder animState={journeyAckVisible ? "talking" : "idle"} size="md" />

              {journeyAckVisible ? (
                <div style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(200,168,107,0.15)",
                  borderRadius: "14px",
                  padding: "22px 26px",
                  animation: "cass-fade-in 0.3s ease",
                }}>
                  <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.65", color: "#d4cec4", margin: 0 }}>
                    {journeyAck(journeyStage)}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px" }}>
                    <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.65", color: "#d4cec4", margin: 0 }}>
                      Before we start — where are you in your journey?
                    </p>
                  </div>

                  <QuickTapInput
                    options={JOURNEY_OPTIONS.map((o) => o.label)}
                    freeTextLabel="It's complicated..."
                    placeholder="Tell me where you're at..."
                    onSelect={(label) => {
                      const match = JOURNEY_OPTIONS.find((o) => o.label === label);
                      if (match && match.id !== "custom") {
                        handleJourneySelect(match.id, label);
                      } else {
                        // "It's complicated" free text path
                        handleJourneyCustom(label);
                      }
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Interview ── */}
          {phase === "interview" && currentQuestion && (
            <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "520px", height: "calc(100dvh - 80px)", overflow: "hidden" }}>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "16px", flexShrink: 0 }}>
                <div className="onboarding-inline-dots" style={{ gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                  {QUESTIONS.map((q, i) => (
                    <div key={q.field} style={{
                      width: i === interviewStep ? "20px" : "6px",
                      height: "6px",
                      borderRadius: "3px",
                      background: i < interviewStep ? "#c8a86b" : i === interviewStep ? "#c8a86b" : "rgba(200,168,107,0.2)",
                      opacity: i < interviewStep ? 0.5 : 1,
                      transition: "all 0.3s ease",
                    }} />
                  ))}
                </div>
                <CassRecorder animState={animState} size="md" />
              </div>

              {/* Scrollable thread */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0",
                scrollbarWidth: "none",
                paddingBottom: "8px",
              }}>
                {isResuming && interviewStep === 0 && (
                  <div style={{ background: "rgba(200,168,107,0.08)", border: "1px solid rgba(200,168,107,0.2)", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", textAlign: "center" }}>
                    <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(200,168,107,0.8)", margin: 0 }}>
                      Welcome back — picking up where you left off.
                    </p>
                  </div>
                )}

                {/* Past Q&A pairs */}
                {QUESTIONS.slice(0, interviewStep).map((q) => (
                  <div key={q.field} style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.1)" }} />
                      <div style={{ fontFamily: "var(--font-cass)", fontSize: "12px", letterSpacing: "2.5px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {q.label}
                      </div>
                      <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.1)" }} />
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,168,107,0.08)", borderRadius: "12px 12px 12px 3px", padding: "12px 16px", marginBottom: "8px" }}>
                      <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: "1.55", color: "rgba(212,206,196,0.5)", margin: 0 }}>
                        {q.cassLine}
                      </p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ background: "rgba(200,168,107,0.08)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "12px 12px 3px 12px", padding: "12px 16px", maxWidth: "85%" }}>
                        <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: "1.55", color: "rgba(212,206,196,0.65)", margin: 0 }}>
                          {answers[q.field]}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Current question */}
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.15)" }} />
                    <div style={{ fontFamily: "var(--font-cass)", fontSize: "12px", letterSpacing: "2.5px", color: "#c8a86b", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {currentQuestion.label}
                    </div>
                    <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.15)" }} />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px 14px 14px 4px", padding: "18px 22px", marginBottom: "12px" }}>
                    <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>
                      {currentQuestion.cassLine}
                    </p>
                  </div>
                </div>
              </div>

              {/* Input — pinned to bottom */}
              <div style={{ flexShrink: 0, paddingTop: "8px" }}>
                {error && (
                  <p style={{ color: "#ff6b6b", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", textAlign: "center", marginBottom: "8px" }}>
                    {error}
                  </p>
                )}
                {currentQuestion.quickTaps ? (
                  <QuickTapInput
                    options={currentQuestion.quickTaps}
                    freeTextLabel="Something else..."
                    placeholder={currentQuestion.placeholder}
                    onSelect={(val) => handleAnswerSubmit(val)}
                  />
                ) : (
                  <CassInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={handleAnswerSubmit}
                    placeholder={currentQuestion.placeholder}
                    autoFocus
                  />
                )}
              </div>
            </div>
          )}

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

          {/* ── Brief review ── */}
          {phase === "review" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "480px", gap: "20px" }}>
              <CassRecorder animState="idle" size="md" />

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px 14px 14px 4px", padding: "18px 22px", width: "100%" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>
                  Here&apos;s what I&apos;ve got. Take a look — tap the pencil to change anything before we map out your chapters.
                </p>
              </div>

              {projectName && (
                <div style={{ width: "100%", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-cass)", fontSize: "10px", letterSpacing: "3px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", marginBottom: "6px" }}>Project</div>
                  <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "24px", color: "#d4cec4", fontWeight: 700 }}>{projectName}</div>
                </div>
              )}

              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                {QUESTIONS.map((q) => (
                  <BriefCard
                    key={q.field}
                    label={q.label}
                    icon={q.icon}
                    value={answers[q.field]}
                    onEdit={(v) => handleEditAnswer(q.field, v)}
                  />
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
                <TapeButton variant="primary" size="md" onClick={handleReviewComplete} className="w-full justify-center">
                  This looks right → map out my chapters
                </TapeButton>
                <TapeButton variant="ghost" size="sm" onClick={() => { setPhase("interview"); setInterviewStep(0); }}>
                  ← Start over
                </TapeButton>
              </div>
            </div>
          )}

          {/* ── Chronicle offer ── */}
          {phase === "chronicle-offer" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "520px", gap: "24px", animation: "cass-fade-in 0.4s ease" }}>
              <CassRecorder animState="talking" size="md" />

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.65", color: "#d4cec4", margin: 0 }}>
                  {journeyStage === "retrospective"
                    ? "Before we map your chapters, want to start by capturing how the story began? We can create a Chronicle chapter where you document the origin — the early days, the decisions that shaped everything."
                    : "You've been building for a while — there's a story before this moment worth preserving. Want to create a Chronicle chapter to capture where it all started?"}
                </p>
              </div>

              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                <QuickTapInput
                  options={[
                    "Yes — let's chronicle the beginning",
                    "Skip for now, I can do this later",
                  ]}
                  freeTextLabel=""
                  onSelect={(val) => {
                    const wants = val.startsWith("Yes");
                    setWantChronicle(wants);
                    handleProceedToWorkplan();
                  }}
                />
              </div>

              {journeyStage === "midjourney" && (
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(212,206,196,0.35)", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                  Chronicle chapters don&apos;t have a task board — they&apos;re purely for capturing your story.
                </p>
              )}
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

        </div>{/* end onboarding-content */}
      </div>{/* end onboarding-outer */}
    </>
  );
}
