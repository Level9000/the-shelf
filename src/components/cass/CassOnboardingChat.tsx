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

// ── Interview questions ───────────────────────────────────────────────────────

type AnswerKey = keyof OnboardingDraft["answers"];

const QUESTIONS: Array<{
  field: AnswerKey;
  cassLine: string;
  placeholder: string;
  label: string;
  icon: string;
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

type Phase = "intro" | "interview" | "generating" | "review" | "workplan" | "saving";

// ── Avatar label ──────────────────────────────────────────────────────────────

function AvatarLabel({ name, role }: { name: string; role: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "8px" }}>
      <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "#c8a86b", fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: "var(--font-cass)", fontSize: "9px", letterSpacing: "2px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginTop: "2px" }}>{role}</div>
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

  // Determine starting phase
  const getInitialPhase = (): Phase => {
    if (existingDraft) {
      if (existingDraft.step >= 5 && existingDraft.proposed_chapters.length > 0) return "workplan";
      if (existingDraft.step >= 5) return "generating";
      return "interview";
    }
    return hasExistingProjects ? "interview" : "intro";
  };

  const getInitialStep = (): number => {
    if (existingDraft) return Math.min(existingDraft.step, QUESTIONS.length - 1);
    return 0;
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [interviewStep, setInterviewStep] = useState(getInitialStep);
  const [answers, setAnswers] = useState<OnboardingDraft["answers"]>(
    existingDraft?.answers ?? { ...EMPTY_ANSWERS }
  );
  const [inputValue, setInputValue] = useState("");
  const [animState, setAnimState] = useState<CassAnimState>("idle");
  const [isResuming] = useState(!!existingDraft);

  // Generated plan
  const [projectName, setProjectName] = useState(existingDraft?.project_name ?? "");
  const [proposedChapters, setProposedChapters] = useState<OnboardingDraft["proposed_chapters"]>(
    existingDraft?.proposed_chapters ?? []
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const currentQuestion = QUESTIONS[interviewStep];
  const answeredFields = QUESTIONS.filter((q) => answers[q.field].trim().length > 0);
  const isLastQuestion = interviewStep === QUESTIONS.length - 1;

  // Auto-save draft whenever answers or step changes
  useEffect(() => {
    if (phase === "interview" || phase === "generating" || phase === "review") {
      const draft: OnboardingDraft = {
        step: interviewStep,
        answers,
        project_name: projectName,
        proposed_chapters: proposedChapters,
        updated_at: new Date().toISOString(),
      };
      saveOnboardingDraftAction(draft).catch(console.error);
    }
  }, [answers, interviewStep, phase, projectName, proposedChapters]);

  // Animate Cass when question changes
  useEffect(() => {
    if (phase === "interview") {
      setAnimState("talking");
      const t = setTimeout(() => setAnimState("listening"), 1800);
      return () => clearTimeout(t);
    }
  }, [interviewStep, phase]);

  async function handleAnswerSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const updatedAnswers = { ...answers, [currentQuestion.field]: trimmed };
    setAnswers(updatedAnswers);
    setInputValue("");

    if (isLastQuestion) {
      // All questions answered — generate the project plan
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

  function handleProceedToWorkplan() {
    setPhase("workplan");
  }

  function handleAcceptWorkplan(chapters: WorkplanChapter[]) {
    setError(null);
    setPhase("saving");

    startSaveTransition(async () => {
      try {
        const { projectId, chapter1Id } = await completeProjectKickoffAction({
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
        });
        await clearOnboardingDraftAction();
        router.push(`/projects/${projectId}/chapters/${chapter1Id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up project.");
        setPhase("workplan");
      }
    });
  }

  const progressPercent =
    phase === "intro"       ? 5  :
    phase === "interview"   ? 15 + (interviewStep / QUESTIONS.length) * 40 :
    phase === "generating"  ? 60 :
    phase === "review"      ? 70 :
    phase === "workplan"    ? 85 :
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
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "72px 16px 32px",
        fontFamily: "var(--font-cass)",
        color: "#c8c8c8",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <CassProgressBar percent={progressPercent} />
        </div>

        {hasExistingProjects && (
          <button type="button" onClick={() => router.back()} aria-label="Close"
            style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "4px", transition: "color 0.2s", fontFamily: "'Literata', Georgia, serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
          >✕</button>
        )}

        {/* ── Intro ── */}
        {phase === "intro" && <IntroScreen onComplete={() => setPhase("interview")} />}

        {/* ── Interview ── */}
        {phase === "interview" && currentQuestion && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "480px", gap: "20px" }}>

            {/* Resume banner */}
            {isResuming && interviewStep === 0 && (
              <div style={{ background: "rgba(200,168,107,0.08)", border: "1px solid rgba(200,168,107,0.2)", borderRadius: "10px", padding: "10px 16px", width: "100%", textAlign: "center" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(200,168,107,0.8)", margin: 0 }}>
                  Welcome back — picking up where you left off.
                </p>
              </div>
            )}

            {/* Progress dots */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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

            {/* Cass + question */}
            <CassRecorder animState={animState} size="md" />
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px 14px 14px 4px", padding: "18px 22px", width: "100%" }}>
              <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>
                {currentQuestion.cassLine}
              </p>
            </div>

            {/* Accumulated brief cards */}
            {answeredFields.length > 0 && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                {answeredFields.map((q) => (
                  <BriefCard
                    key={q.field}
                    label={q.label}
                    icon={q.icon}
                    value={answers[q.field]}
                    onEdit={(v) => handleEditAnswer(q.field, v)}
                  />
                ))}
              </div>
            )}

            {/* Input */}
            <CassInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleAnswerSubmit}
              placeholder={currentQuestion.placeholder}
              autoFocus
            />

            {error && (
              <p style={{ color: "#ff6b6b", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", textAlign: "center" }}>
                {error}
              </p>
            )}
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

            {/* Project name */}
            {projectName && (
              <div style={{ width: "100%", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-cass)", fontSize: "10px", letterSpacing: "3px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", marginBottom: "6px" }}>Project</div>
                <div style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "24px", color: "#d4cec4", fontWeight: 700 }}>{projectName}</div>
              </div>
            )}

            {/* All brief cards — editable */}
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
              <TapeButton variant="primary" size="md" onClick={handleProceedToWorkplan} className="w-full justify-center">
                This looks right → map out my chapters
              </TapeButton>
              <TapeButton variant="ghost" size="sm" onClick={() => { setPhase("interview"); setInterviewStep(0); }}>
                ← Start over
              </TapeButton>
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
    </>
  );
}
