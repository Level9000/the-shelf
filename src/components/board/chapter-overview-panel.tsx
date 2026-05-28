"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Board, Chapter, Task, BoardColumn } from "@/types";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassFab } from "@/components/cass/CassFab";
import { CassShareChat, type Phase as CassPhase } from "@/components/cass/CassShareChat";
import { renderParagraphs } from "@/lib/render-paragraphs";
import { resolveBannerState } from "@/components/board/chapter-progress-banner";

// ── Generating overlay ────────────────────────────────────────────────────────

function GeneratingOverlay() {
  const text = "hang tight — I'll get this printed out for you";
  const [displayed, setDisplayed] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const fadeTimer = setTimeout(() => setVisible(true), 50);
    const startTimer = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 32);
    }, 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "36px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      <CassRecorder animState="playing" size="md" />
      <p
        style={{
          fontFamily: "'Special Elite', cursive",
          fontSize: "18px",
          lineHeight: 1.7,
          color: "#d4cec4",
          textAlign: "center",
          maxWidth: "300px",
          opacity: 0.9,
          minHeight: "60px",
        }}
      >
        {displayed}
        {displayed.length < text.length && displayed.length > 0 && (
          <span style={{ opacity: 0.4, animation: "cassCaretBlink 0.9s step-end infinite" }}>▌</span>
        )}
      </p>
      <style>{`
        @keyframes cassCaretBlink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  chapters,
  onRefine,
  onStartRetro,
  activeChapterUrl = null,
  onSelectShareFormat,
  onPlanChapters,
}: {
  board: Board;
  projectId: string;
  chapterId: string;
  tasks?: Task[];
  columns?: BoardColumn[];
  projectName?: string | null;
  northStar?: string | null;
  accumulativeStory?: string | null;
  chapters?: Chapter[];
  onRefine: () => void;
  onStartRetro?: () => void;
  onEndChapter?: () => void;
  activeChapterUrl?: string | null;
  onSelectShareFormat?: (format: string) => void;
  onPlanChapters?: () => void;
}) {
  const doneColumnId = columns?.find((col) => col.name.toLowerCase() === "done")?.id;
  const allTasksDone =
    tasks !== undefined && tasks.length > 0 && tasks.every((t) => t.columnId === doneColumnId);
  const retroAvailable = Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;
  const retroDone = Boolean(board.retroCompletedAt);

  // Chapter number + running-long detection for teaser text
  const chapterIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : null;
  const bannerState = resolveBannerState(board, tasks ?? [], columns ?? []);
  const isRunningLong = bannerState.kind === "running_long";
  const storyFabTeaser = isRunningLong && chapterNumber
    ? `We should try to wrap up chapter ${chapterNumber}`
    : "I can help you sharpen this chapter's story.";

  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [cassPhase, setCassPhase] = useState<CassPhase | null>(null);

  const sectionStyle: React.CSSProperties = {
    paddingTop: "32px",
    paddingBottom: "8px",
  };

  const bodyTextStyle: React.CSSProperties = {
    fontFamily: "Verdana, Geneva, sans-serif",
    fontSize: "15px",
    lineHeight: 1.85,
    color: "rgba(232,224,208,0.78)",
    margin: "12px 0 0",
  };

  const placeholderStyle: React.CSSProperties = {
    fontFamily: "Verdana, Geneva, sans-serif",
    fontSize: "14px",
    lineHeight: 1.75,
    color: "rgba(200,168,107,0.25)",
    margin: "12px 0 0",
    fontStyle: "italic",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "var(--font-cass)",
    fontSize: "44px",
    margin: 0,
    lineHeight: 1.2,
  };

  const TAPE_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

  function hl(text: string) {
    return (
      <span style={{
        display: "inline-block",
        background: "#e8dfc0",
        color: "#1a0e00",
        padding: "4px 16px 6px",
        clipPath: TAPE_CLIP,
        boxShadow: "2px 2px 6px rgba(0,0,0,0.35)",
      }}>
        {text}
      </span>
    );
  }

  return (
    <>
      <style>{`
        @keyframes chapterPanelPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>

      {/* Reading column */}
      <div className="-mx-4 flex-1 lg:mx-0" style={{ paddingBottom: "140px" }}>
        <div style={{ maxWidth: "660px", margin: "0 auto", padding: "36px 24px 0" }}>

          {/* ── Completed banner ── */}
          {retroDone && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "28px",
                padding: "10px 14px",
                borderRadius: "999px",
                background: "rgba(200,168,107,0.07)",
                border: "1px solid rgba(200,168,107,0.18)",
              }}
            >
              <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "rgba(200,168,107,0.6)", margin: 0 }}>
                completed{" "}
                <span style={{ color: "#c8a86b" }}>
                  {new Date(board.retroCompletedAt!).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </p>
              {activeChapterUrl && (
                <Link
                  href={activeChapterUrl}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontFamily: "var(--font-cass)", fontSize: "11px",
                    color: "#c8a86b", textDecoration: "none", flexShrink: 0,
                    letterSpacing: "0.5px",
                  }}
                >
                  Current chapter <ArrowRight size={10} />
                </Link>
              )}
            </div>
          )}

          {/* ── Write the story CTA ── */}
          {!retroDone && retroAvailable && allTasksDone && onStartRetro && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
              <button
                type="button"
                onClick={onStartRetro}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "10px 20px", borderRadius: "999px",
                  background: "linear-gradient(135deg, #c8a86b, #a8864e)",
                  border: "none", cursor: "pointer",
                  fontFamily: "var(--font-cass)",
                  fontSize: "12px", fontWeight: 600, color: "#0a0a0a",
                  boxShadow: "0 4px 16px rgba(200,168,107,0.3)",
                }}
              >
                <BookOpen size={14} />
                All done — write the story
              </button>
            </div>
          )}

          {/* ── Completed: chapter story ── */}
          {retroDone && board.chapterStory && (
            <div style={{ marginBottom: "8px" }}>
              <h3 style={headingStyle}>{hl("How everything went")}</h3>
              {renderParagraphs(board.chapterStory, {
                fontFamily: "Verdana, Geneva, sans-serif",
                fontSize: "16px",
                lineHeight: 1.85,
                color: "rgba(232,224,208,0.9)",
                margin: "16px 0 0",
              })}
              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => { setChatKey((k) => k + 1); setShareDrawerOpen(true); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "8px 18px", borderRadius: "999px",
                    background: "transparent",
                    border: "1px solid rgba(200,168,107,0.3)",
                    cursor: "pointer",
                    fontFamily: "var(--font-cass)",
                    fontSize: "11px", color: "#c8a86b", letterSpacing: "0.5px",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(200,168,107,0.08)";
                    e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(200,168,107,0.3)";
                  }}
                >
                  <Share2 size={12} />
                  Share this story
                </button>
              </div>
            </div>
          )}

          {/* ── What ── */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>
              {hl(retroDone ? "What was the bet?" : "What's the bet we're making?")}
            </h3>
            {board.goal?.trim()
              ? renderParagraphs(board.goal, bodyTextStyle)
              : <p style={placeholderStyle}>Open Cass to define what you&apos;re betting on this chapter.</p>
            }
          </div>

          {/* ── Why ── */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>
              {hl(retroDone ? "Why did this matter?" : "Why does this matter?")}
            </h3>
            {board.whyItMatters?.trim()
              ? renderParagraphs(board.whyItMatters, bodyTextStyle)
              : <p style={placeholderStyle}>Open Cass to explain why this chapter matters right now.</p>
            }
          </div>

          {/* ── How ── */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>
              {hl(retroDone ? "What needed to be true?" : "What has to be true?")}
            </h3>
            {board.successLooksLike?.trim()
              ? renderParagraphs(board.successLooksLike, bodyTextStyle)
              : <p style={placeholderStyle}>Open Cass to describe what success looks like.</p>
            }
          </div>

          {/* ── When ── */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>
              {hl(retroDone ? "When were we done?" : "When are we done?")}
            </h3>
            {board.doneDefinition?.trim()
              ? renderParagraphs(board.doneDefinition, bodyTextStyle)
              : <p style={placeholderStyle}>Open Cass to set your definition of done.</p>
            }
          </div>

          {/* ── Mobile: all chapters ── */}
          {chapters && chapters.length > 0 && (
            <div className="lg:hidden" style={{ marginTop: "52px" }}>
              <div
                style={{
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(200,168,107,0.15) 30%, rgba(200,168,107,0.15) 70%, transparent)",
                  marginBottom: "28px",
                }}
              />
              <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "3px", color: "rgba(200,168,107,0.4)", textTransform: "uppercase", marginBottom: "16px" }}>
                All chapters
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {chapters.map((ch, i) => {
                  const status = ch.retroCompletedAt ? "completed" : ch.kickoffCompletedAt ? "active" : "planned";
                  const isCurrent = ch.id === chapterId;
                  return (
                    <Link
                      key={ch.id}
                      href={`/projects/${projectId}/chapters/${ch.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 14px", borderRadius: "12px",
                        background: isCurrent ? "rgba(200,168,107,0.08)" : "transparent",
                        border: isCurrent ? "1px solid rgba(200,168,107,0.18)" : "1px solid transparent",
                        textDecoration: "none",
                        opacity: status === "planned" && !isCurrent ? 0.4 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: status === "completed" ? "rgba(134,239,172,0.15)" : status === "active" ? "rgba(200,168,107,0.12)" : "rgba(255,255,255,0.05)",
                      }}>
                        {status === "completed" ? (
                          <CheckCircle2 size={12} style={{ color: "#86efac" }} />
                        ) : status === "active" ? (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8a86b", display: "block", animation: "chapterPanelPulse 2s ease-in-out infinite" }} />
                        ) : (
                          <span style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: "rgba(200,168,107,0.4)" }}>{i + 1}</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontFamily: "var(--font-cass)", fontSize: "11px", color: isCurrent ? "#c8a86b" : "rgba(200,168,107,0.4)", margin: 0, letterSpacing: "1px" }}>
                          Chapter {i + 1}{isCurrent && " · current"}
                        </p>
                        {ch.goal && (
                          <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "13px", color: "rgba(232,224,208,0.7)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ch.goal}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {onPlanChapters && (
                <button
                  type="button"
                  onClick={onPlanChapters}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "12px 14px", width: "100%",
                    background: "transparent", border: "none",
                    cursor: "pointer", marginTop: "4px",
                    fontFamily: "var(--font-cass)",
                    fontSize: "11px", color: "rgba(200,168,107,0.5)",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={12} />
                  Plan new chapters
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Cass FAB — refine before retro, share after ── */}
      {!retroDone && (
        <CassFab
          onClick={onRefine}
          hoverText="Refine this chapter"
          teaserText={storyFabTeaser}
          ringColor={isRunningLong ? "amber" : "gold"}
          expandedWidth="272px"
        />
      )}
      {retroDone && !shareDrawerOpen && (
        <CassFab
          onClick={() => { setChatKey((k) => k + 1); setShareDrawerOpen(true); }}
          hoverText="Ready to share this story?"
          teaserText="Your chapter is written. Let's share it."
          expandedWidth="272px"
        />
      )}

      {/* ── Share drawer backdrop ── */}
      {shareDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setShareDrawerOpen(false)}
        />
      )}

      {/* ── Generating overlay ── */}
      {cassPhase === "generating" && <GeneratingOverlay />}

      {/* ── Share drawer ── */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[30%] lg:min-w-[340px]"
        style={{
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%)",
          transform: shareDrawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: shareDrawerOpen ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
          fontFamily: "var(--font-cass)",
        }}
        aria-hidden={!shareDrawerOpen}
      >
        {/* Progress bar */}
        <div style={{ height: "3px", background: "rgba(200,168,107,0.1)", flexShrink: 0, width: "100%" }}>
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, rgba(200,168,107,0.6), #c8a86b)",
              width:
                cassPhase === "refine1" ? "33%" :
                cassPhase === "refine2" ? "66%" :
                cassPhase === "generating" ? "100%" :
                "0%",
              transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        <div style={{ flexShrink: 0, display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
          <button
            type="button"
            onClick={() => setShareDrawerOpen(false)}
            aria-label="Close share panel"
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(232,224,208,0.5)",
            }}
          >
            ✕
          </button>
        </div>
        <CassShareChat
          key={chatKey}
          onComplete={(format) => { onSelectShareFormat?.(format); setShareDrawerOpen(false); }}
          onPhaseChange={setCassPhase}
        />
      </div>
    </>
  );
}
