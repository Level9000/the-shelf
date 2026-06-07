"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CassRecorder } from "./CassRecorder";
import { CassInput } from "./CassInput";
import { CassProgressBar } from "./CassProgressBar";
import { TapeButton } from "@/components/ui/tape-button";
import { updateProjectBriefAction } from "@/lib/actions/project-actions";
import { Check } from "lucide-react";

// ── Question definitions ──────────────────────────────────────────────────────

const ALL_QUESTIONS = [
  {
    field: "project_goal" as const,
    label: "The Project",
    cassLine: "Let's pick up where we left off. What are you building?",
    placeholder: "Tell me anything. A sentence is fine.",
  },
  {
    field: "north_star" as const,
    label: "North Star",
    cassLine: "What's the conviction behind this? The one thing you believe that most people don't yet?",
    placeholder: "The belief driving the work...",
  },
  {
    field: "project_audience" as const,
    label: "Who It's For",
    cassLine: "Who is this for, and what does it change for them?",
    placeholder: "The people you're building for...",
  },
  {
    field: "project_success" as const,
    label: "What Success Looks Like",
    cassLine: "What does winning look like — something specific you could point to?",
    placeholder: "A clear, observable outcome...",
  },
  {
    field: "project_biggest_risk" as const,
    label: "Biggest Risk",
    cassLine: "What's the biggest unknown you're carrying into this?",
    placeholder: "The thing keeping you up at night...",
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

type FieldKey = typeof ALL_QUESTIONS[number]["field"];

// ── Quick tap input ───────────────────────────────────────────────────────────

function QuickTapInput({
  options,
  onSelect,
  placeholder,
}: {
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
}) {
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState("");
  const tappable = options.slice(0, -1);

  if (showFreeText) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        <textarea
          autoFocus
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (freeText.trim()) onSelect(freeText.trim()); } }}
          placeholder={placeholder}
          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,107,0.25)", borderRadius: "8px", padding: "14px 16px", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", color: "#d4cec4", outline: "none", resize: "none", minHeight: "70px", lineHeight: "1.5", caretColor: "#c8a86b", boxSizing: "border-box" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)"; }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={() => setShowFreeText(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(200,168,107,0.45)", padding: 0 }}>
            ← back
          </button>
          <TapeButton variant="primary" size="sm" onClick={() => { if (freeText.trim()) onSelect(freeText.trim()); }} disabled={!freeText.trim()}>
            Submit
          </TapeButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
      {tappable.map((opt) => (
        <button key={opt} type="button" onClick={() => onSelect(opt)}
          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.18)", borderRadius: "10px", padding: "13px 18px", textAlign: "left", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", color: "#d4cec4", cursor: "pointer", transition: "background 0.15s, border-color 0.15s", lineHeight: 1.4 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,168,107,0.08)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)"; }}
        >
          {opt}
        </button>
      ))}
      <button type="button" onClick={() => setShowFreeText(true)}
        style={{ width: "100%", background: "transparent", border: "1px dashed rgba(200,168,107,0.15)", borderRadius: "10px", padding: "11px 18px", textAlign: "left", fontFamily: "'Literata', Georgia, serif", fontSize: "13px", color: "rgba(200,168,107,0.45)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.35)"; e.currentTarget.style.color = "rgba(200,168,107,0.7)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.15)"; e.currentTarget.style.color = "rgba(200,168,107,0.45)"; }}
      >
        Something else...
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BriefCompletionChat({
  projectId,
  projectName,
  missing,
}: {
  projectId: string;
  projectName: string;
  missing: Record<FieldKey, boolean>;
}) {
  const router = useRouter();

  // Only the questions that are actually missing
  const questions = ALL_QUESTIONS.filter((q) => missing[q.field]);
  const total = questions.length;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<FieldKey, string>>>({});
  const [inputValue, setInputValue] = useState("");
  const [animState, setAnimState] = useState<"idle" | "talking" | "listening" | "recording">("talking");
  const [phase, setPhase] = useState<"interview" | "saving" | "done">("interview");
  const [error, setError] = useState<string | null>(null);

  const currentQ = questions[step];
  const isLast = step === total - 1;
  const progressPercent = 10 + (step / total) * 80;

  useEffect(() => {
    setAnimState("talking");
    const t = setTimeout(() => setAnimState("listening"), 1600);
    return () => clearTimeout(t);
  }, [step]);

  async function handleSubmit(value?: string) {
    const trimmed = (value ?? inputValue).trim();
    if (!trimmed) return;

    const updated = { ...answers, [currentQ.field]: trimmed };
    setAnswers(updated);
    setInputValue("");

    if (isLast) {
      await save(updated);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function save(finalAnswers: Partial<Record<FieldKey, string>>) {
    setPhase("saving");
    setAnimState("recording");
    setError(null);
    try {
      // Build conversation entry summarising what was filled in
      const summary = Object.entries(finalAnswers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      await updateProjectBriefAction(
        projectId,
        finalAnswers,
        { role: "user", content: `Brief completed (follow-up):\n${summary}` },
      );
      setPhase("done");
      setAnimState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("interview");
      setAnimState("listening");
    }
  }

  return (
    <>
      <style>{`
        @keyframes brief-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 16px 32px",
        fontFamily: "var(--font-cass)",
        color: "#c8c8c8",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
          <CassProgressBar percent={phase === "saving" ? 95 : phase === "done" ? 100 : progressPercent} />
        </div>

        {/* Back button */}
        {phase === "interview" && (
          <button type="button" onClick={() => router.back()}
            style={{ position: "absolute", top: "16px", left: "16px", zIndex: 10, background: "transparent", border: "none", color: "rgba(200,168,107,0.3)", cursor: "pointer", fontSize: "13px", fontFamily: "'Literata', Georgia, serif", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.3)"; }}
          >
            ← Back
          </button>
        )}

        <div style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>

          {/* ── Interview ── */}
          {phase === "interview" && currentQ && (
            <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "calc(100dvh - 80px)", overflow: "hidden" }}>

              {/* Cass + progress dots */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "16px", flexShrink: 0 }}>
                {/* Project label */}
                <div style={{ fontFamily: "var(--font-cass)", fontSize: "10px", letterSpacing: "3px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginBottom: "12px" }}>
                  {projectName} · Filling in your brief
                </div>

                {/* Step dots */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  {questions.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? "20px" : "6px",
                      height: "6px",
                      borderRadius: "3px",
                      background: i < step ? "#c8a86b" : i === step ? "#c8a86b" : "rgba(200,168,107,0.2)",
                      opacity: i < step ? 0.5 : 1,
                      transition: "all 0.3s ease",
                    }} />
                  ))}
                </div>

                <CassRecorder animState={animState} size="md" />
              </div>

              {/* Scrollable thread */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", scrollbarWidth: "none", paddingBottom: "8px" }}>

                {/* Past answers */}
                {questions.slice(0, step).map((q) => (
                  <div key={q.field} style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.1)" }} />
                      <div style={{ fontFamily: "var(--font-cass)", fontSize: "12px", letterSpacing: "2.5px", color: "rgba(200,168,107,0.5)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{q.label}</div>
                      <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.1)" }} />
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,168,107,0.08)", borderRadius: "12px 12px 12px 3px", padding: "12px 16px", marginBottom: "8px" }}>
                      <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: "1.55", color: "rgba(212,206,196,0.5)", margin: 0 }}>{q.cassLine}</p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ background: "rgba(200,168,107,0.08)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "12px 12px 3px 12px", padding: "12px 16px", maxWidth: "85%" }}>
                        <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "14px", lineHeight: "1.55", color: "rgba(212,206,196,0.65)", margin: 0 }}>{answers[q.field]}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Current question */}
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.15)" }} />
                    <div style={{ fontFamily: "var(--font-cass)", fontSize: "12px", letterSpacing: "2.5px", color: "#c8a86b", textTransform: "uppercase", whiteSpace: "nowrap" }}>{currentQ.label}</div>
                    <div style={{ flex: 1, height: "1px", background: "rgba(200,168,107,0.15)" }} />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px 14px 14px 4px", padding: "18px 22px", marginBottom: "12px" }}>
                    <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.6", color: "#d4cec4", margin: 0 }}>{currentQ.cassLine}</p>
                  </div>
                </div>
              </div>

              {/* Input pinned to bottom */}
              <div style={{ flexShrink: 0, paddingTop: "8px" }}>
                {error && <p style={{ color: "#ff6b6b", fontFamily: "'Literata', Georgia, serif", fontSize: "14px", textAlign: "center", marginBottom: "8px" }}>{error}</p>}
                {"quickTaps" in currentQ && currentQ.quickTaps ? (
                  <QuickTapInput options={currentQ.quickTaps} placeholder={currentQ.placeholder} onSelect={(v) => handleSubmit(v)} />
                ) : (
                  <CassInput value={inputValue} onChange={setInputValue} onSubmit={() => handleSubmit()} placeholder={currentQ.placeholder} autoFocus />
                )}
              </div>
            </div>
          )}

          {/* ── Saving ── */}
          {phase === "saving" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
              <CassRecorder animState="recording" size="md" />
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%", textAlign: "center" }}>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", color: "#d4cec4", margin: 0 }}>
                  Adding that to your story. One second.
                </p>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {phase === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%", animation: "brief-fade-up 0.4s ease" }}>
              <CassRecorder animState="idle" size="md" />
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,107,0.15)", borderRadius: "14px", padding: "22px 26px", width: "100%", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#c8a86b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={15} color="#1a0e00" strokeWidth={3} />
                  </div>
                  <span style={{ fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "2px", color: "rgba(200,168,107,0.7)", textTransform: "uppercase" }}>Brief updated</span>
                </div>
                <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "16px", lineHeight: "1.65", color: "#d4cec4", margin: 0 }}>
                  Got it — your story is more complete now. Cass will use this context going forward.
                </p>
              </div>
              <TapeButton variant="primary" size="md" onClick={() => router.push(`/projects/${projectId}`)} className="w-full justify-center">
                Back to my project →
              </TapeButton>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
