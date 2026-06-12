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
  const OPENING_QUESTION = "Great, so tell me about your business journey so far.";
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: OPENING_QUESTION },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatPending, setIsChatPending] = useState(false);
  // Nintendo-style gating: user must press Continue after each Cass message
  const [showContinue, setShowContinue] = useState(true);
  const [inputRevealed, setInputRevealed] = useState(false);
  const [chatDone, setChatDone] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive, but only if user is near bottom
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages, isChatPending, showContinue]);

  async function handleChatSubmit() {
    const trimmed = chatInput.trim();
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
        if (reply) {
          setChatMessages([...newMessages, { role: "assistant", content: reply }]);
        }
        setChatDone(true);
        setShowContinue(true);
        setAnimState("idle");
        // Transition happens when user presses Continue on the final message
      } else {
        setChatMessages([...newMessages, { role: "assistant", content: reply }]);
        setShowContinue(true);
        setAnimState("talking");
        setTimeout(() => setAnimState("listening"), 1600);
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
          router.push(`/projects/${projectId}/chapters/${chapter1Id}`);
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

  const progressPercent =
    phase === "intro"      ? 5  :
    phase === "interview"  ? 40 :
    phase === "generating" ? 65 :
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
          background: #f5d000; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .chat-send-btn:disabled { background: #2e2e2e; cursor: default; }
        .chat-send-btn:not(:disabled):hover { background: #ffd900; }
        .chat-send-btn .material-icons { font-size: 18px; color: #0a0a0a; }
        .chat-send-btn:disabled .material-icons { color: #555; }
        .chat-chip {
          display: inline-flex; align-items: center;
          background: #1e1e1e; border: 1px solid #2e2e2e;
          border-radius: 20px; padding: 6px 14px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #999; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .chat-chip:hover { background: #f5d000; color: #0a0a0a; }
        .chat-textarea {
          flex: 1; background: #2e2e2e;
          border: 1px solid #3a3a3a; border-radius: 22px;
          padding: 9px 16px;
          font-family: 'Lora', Georgia, serif; font-size: 14px; color: #f8f8f6;
          caret-color: #f5d000; outline: none; resize: none;
          min-height: 40px; max-height: 120px; line-height: 1.5;
          transition: border-color 0.15s;
          scrollbar-width: none;
        }
        .chat-textarea::placeholder { color: #666; }
        .chat-textarea:focus { border-color: #f5d000; }
        .chat-scrollbar { scrollbar-width: none; }
        .chat-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className={`onboarding-outer${phase === "interview" ? " phase-interview" : ""}`}>
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

        {/* Non-interview phases — centered layout */}
        {phase !== "interview" && (
        <div className="onboarding-content">

          {/* ── Intro ── */}
          {phase === "intro" && <IntroScreen onComplete={() => setPhase("interview")} />}

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
              <div style={{
                background: "#0a0a0a",
                borderBottom: "1px solid #1e1e1e",
                padding: "12px 16px",
                display: "grid",
                gridTemplateColumns: "40px 1fr 40px",
                alignItems: "center",
                flexShrink: 0,
              }}>
                <div />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ position: "relative", width: "44px", height: "44px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid #2a2a2a", overflow: "hidden", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CassRecorder animState={animState} size="sm" />
                    </div>
                    <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "10px", height: "10px", borderRadius: "50%", background: "#f5d000", border: "2px solid #0a0a0a" }} />
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f8f8f6" }}>Cass</span>
                </div>
                <div />
              </div>

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
                    <div key={i} style={{ maxWidth: "85%", animation: "cass-fade-up 0.3s ease forwards" }}>
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
                        background: "#f5d000",
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
                  <div style={{ display: "flex", justifyContent: "flex-start", animation: "cass-fade-in 0.35s ease" }}>
                    <button type="button" className="chat-chip" onClick={handleContinue}>
                      Continue
                      <span style={{ marginLeft: "6px", animation: "cass-blink 1.1s step-end infinite" }}>▶</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Input footer */}
              {inputRevealed && !isChatPending && (
                <div style={{
                  background: "#0f0f0f",
                  borderTop: "1px solid #1e1e1e",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "10px",
                  flexShrink: 0,
                  animation: "cass-fade-up 0.25s ease forwards",
                  maxWidth: "600px",
                  width: "100%",
                  margin: "0 auto",
                  boxSizing: "border-box",
                }}>
                  <textarea
                    autoFocus
                    className="chat-textarea"
                    value={chatInput}
                    rows={1}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        if (chatInput.trim()) handleChatSubmit();
                      }
                    }}
                    placeholder="Type your reply…"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="chat-send-btn"
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim()}
                    aria-label="Send"
                  >
                    <span className="material-icons">arrow_upward</span>
                  </button>
                </div>
              )}

            </div>
          )}

      </div>{/* end onboarding-outer */}
    </>
  );
}
