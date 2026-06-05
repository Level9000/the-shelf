"use client";

import { useState, useEffect, useTransition } from "react";
import { CassRecorder } from "./CassRecorder";
import { CassInput } from "./CassInput";
import { updateChapterStoryAction } from "@/lib/actions/project-actions";
import { TapeButton } from "@/components/ui/tape-button";
import { CASS_ERROR_LINES } from "./cassVoice";

// ── Share card ────────────────────────────────────────────────────────────────

function CassShareCard({ pullQuote }: { pullQuote: string }) {
  return (
    <div
      style={{
        background: "rgba(200,168,107,0.06)",
        border: "1px solid rgba(200,168,107,0.3)",
        borderRadius: "16px",
        padding: "24px 28px",
        width: "100%",
        animation: "cass-fade-in 0.7s ease forwards",
      }}
    >
      <p
        style={{
          fontFamily: "'Special Elite', cursive",
          fontSize: "17px",
          color: "#d4cec4",
          lineHeight: "1.6",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        &ldquo;{pullQuote}&rdquo;
      </p>
      <p
        style={{
          fontFamily: "var(--font-cass)",
          fontSize: "11px",
          color: "#c8a86b",
          letterSpacing: "3px",
          marginTop: "14px",
          marginBottom: 0,
          opacity: 0.6,
          textTransform: "uppercase" as const,
        }}
      >
        never lose the story
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CassStoryPlayer({
  chapterName,
  chapterStory,
  pullQuote,
  headline,
  subheadline,
  projectId,
  boardId,
  onShareThis,
  onClose,
}: {
  chapterName: string;
  chapterStory: string;
  pullQuote: string;
  headline?: string;
  subheadline?: string;
  projectId: string;
  boardId: string;
  onShareThis: () => void;
  onClose: () => void;
}) {
  const raw = chapterStory.trim() || "Your track story is being written.";
  const paragraphs = raw
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const [revealedCount, setRevealedCount] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [currentStory, setCurrentStory] = useState(chapterStory.trim());
  const [currentParagraphs, setCurrentParagraphs] = useState(paragraphs);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, startRefining] = useTransition();
  const [refineSaved, setRefineSaved] = useState(false);

  // Auto-reveal paragraphs
  useEffect(() => {
    if (allRevealed) return;
    if (revealedCount >= currentParagraphs.length) {
      setAllRevealed(true);
      return;
    }

    // First paragraph appears quickly; subsequent ones pace with reading time
    const prev = currentParagraphs[revealedCount - 1] ?? "";
    const wordCount = prev.split(/\s+/).length;
    const readingMs = (wordCount / 3) * 1000; // ~3 words/sec
    const delay =
      revealedCount === 0 ? 600 : Math.max(1800, Math.min(readingMs, 4000));

    const t = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [revealedCount, allRevealed, currentParagraphs]);

  function handleRefineSubmit() {
    const trimmed = refineInput.trim();
    if (!trimmed || isRefining) return;
    setError(null);

    startRefining(async () => {
      try {
        const response = await fetch("/api/chat/cass-story-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            boardId,
            currentStory,
            instruction: trimmed,
          }),
        });
        const data = (await response.json()) as {
          refinedStory?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? CASS_ERROR_LINES[0]);

        const refined = data.refinedStory?.trim();
        if (!refined) throw new Error(CASS_ERROR_LINES[1]);

        // Save refined story to DB
        await updateChapterStoryAction({ projectId, boardId, chapterStory: refined });

        const newParas = refined
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean);

        setCurrentStory(refined);
        setCurrentParagraphs(newParas);
        setRevealedCount(newParas.length);
        setAllRevealed(true);
        setRefineInput("");
        setRefineSaved(true);
        setRefineOpen(false);
        setTimeout(() => setRefineSaved(false), 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : CASS_ERROR_LINES[0]);
      }
    });
  }

  const progress = currentParagraphs.length > 0
    ? revealedCount / currentParagraphs.length
    : 1;

  const animState = allRevealed
    ? refineOpen
      ? "listening"
      : "idle"
    : "playing";

  return (
    <>
      <style>{`
        @keyframes cass-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cass-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%)",
          padding: "32px 16px 40px",
          fontFamily: "var(--font-cass)",
          color: "#c8c8c8",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "560px",
            gap: "28px",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <CassRecorder animState={animState} size="sm" />
            {headline ? (
              <div style={{ marginTop: "16px" }}>
                <div
                  style={{
                    fontFamily: "'Special Elite', cursive",
                    fontSize: "24px",
                    color: "#d4cec4",
                    letterSpacing: "0.3px",
                    lineHeight: "1.3",
                  }}
                >
                  {headline}
                </div>
                {subheadline && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontFamily: "var(--font-cass)",
                      fontSize: "13px",
                      color: "rgba(200,168,107,0.7)",
                      letterSpacing: "1px",
                      lineHeight: "1.5",
                    }}
                  >
                    {subheadline}
                  </div>
                )}
                <div
                  style={{
                    marginTop: "10px",
                    fontFamily: "var(--font-cass)",
                    fontSize: "11px",
                    color: "#444",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  }}
                >
                  {chapterName}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: "10px",
                  fontFamily: "'Special Elite', cursive",
                  fontSize: "22px",
                  color: "#d4cec4",
                  letterSpacing: "0.5px",
                }}
              >
                {chapterName}
              </div>
            )}
          </div>

          {/* Tape progress bar */}
          <div
            style={{
              width: "100%",
              height: "2px",
              background: "rgba(200,168,107,0.1)",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: "#c8a86b",
                borderRadius: "1px",
                transition: "width 0.7s ease",
              }}
            />
          </div>

          {/* Story paragraphs */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {currentParagraphs.slice(0, revealedCount).map((para, i) => (
              <p
                key={`${i}-${para.slice(0, 16)}`}
                style={{
                  fontFamily: "'Special Elite', cursive",
                  fontSize: "17px",
                  lineHeight: "1.85",
                  color: "#d4cfc7",
                  margin: 0,
                  animation: "cass-fade-in 0.6s ease forwards",
                }}
              >
                {para}
              </p>
            ))}

            {!allRevealed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#444",
                  fontSize: "11px",
                  letterSpacing: "1px",
                }}
              >
                <span style={{ animation: "cass-blink 1.2s step-end infinite" }}>
                  ●
                </span>
                playing
              </div>
            )}
          </div>

          {/* Post-reveal content */}
          {allRevealed && (
            <>
              {/* Share card */}
              {pullQuote && <CassShareCard pullQuote={pullQuote} />}

              {/* Refinement area */}
              {refineOpen ? (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    animation: "cass-fade-in 0.4s ease forwards",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      letterSpacing: "1px",
                    }}
                  >
                    What would you like to change?
                  </div>
                  {error && (
                    <p
                      style={{
                        color: "#ff3b30",
                        fontSize: "12px",
                        margin: 0,
                      }}
                    >
                      {error}
                    </p>
                  )}
                  {isRefining ? (
                    <div
                      style={{
                        color: "#555",
                        fontSize: "13px",
                        letterSpacing: "1px",
                      }}
                    >
                      ◉ rewriting...
                    </div>
                  ) : (
                    <CassInput
                      value={refineInput}
                      onChange={setRefineInput}
                      onSubmit={handleRefineSubmit}
                      placeholder="Make the opening stronger, trim it down, add the part about the late night..."
                      autoFocus
                    />
                  )}
                  {!isRefining && (
                    <TapeButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRefineOpen(false);
                        setError(null);
                      }}
                    >
                      ← cancel
                    </TapeButton>
                  )}
                </div>
              ) : (
                /* Action buttons */
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    animation: "cass-fade-in 0.5s ease forwards",
                  }}
                >
                  {refineSaved && (
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "2px",
                        color: "#c8a86b",
                        textAlign: "center",
                        marginBottom: "4px",
                      }}
                    >
                      ● STORY UPDATED
                    </div>
                  )}
                  <TapeButton variant="primary" size="md" onClick={onShareThis} className="w-full justify-center">
                    SHARE THIS
                  </TapeButton>
                  <TapeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRefineOpen(true);
                      setError(null);
                    }}
                    className="w-full justify-center"
                  >
                    let&apos;s refine
                  </TapeButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
