"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCirclePlus, X } from "lucide-react";
import type { Chapter } from "@/types";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { VoiceInputFooter } from "@/components/cass/VoiceInputFooter";
import { clearChapterReviewFlagAction } from "@/lib/actions/project-actions";
import { useTheme } from "@/lib/theme-context";

type ProposedParagraph = { originalText: string; newText: string };
type Reframe = { newChapterType: string; rationale: string };
type AffectedChapter = { chapterId: string; chapterName: string; reason: string };

type ContextMessage = {
  role: "user" | "assistant";
  content: string;
  proposedParagraph?: ProposedParagraph | null;
  reframe?: Reframe | null;
  affectedChapters?: AffectedChapter[];
  resolved?: boolean;
};

const CHAPTER_TYPE_LABEL: Record<string, string> = {
  climb: "Climb",
  win: "Win",
  turn: "Turn",
  fog: "Fog",
  reframe: "Reframe",
};

// ── Pill (sits below each chapter's content) ──────────────────────────────────

export function ChapterContextPill({
  projectId,
  chapter,
  isDark,
  open,
  onOpenChange,
}: {
  projectId: string;
  chapter: Chapter;
  isDark: boolean;
  /** When provided (e.g. by the "Needs review" badge), controls the drawer externally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const drawerOpen = open ?? internalOpen;
  const setDrawerOpen = onOpenChange ?? setInternalOpen;

  const pillBg = "rgba(200,168,107,0.12)";
  const pillBorder = isDark ? "rgba(200,168,107,0.45)" : "rgba(180,140,60,0.4)";
  const pillColor = isDark ? "#e8c789" : "#8a6d2f";

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          background: pillBg,
          border: `1px solid ${pillBorder}`,
          borderRadius: "999px",
          padding: "9px 22px",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: pillColor,
          cursor: "pointer",
          boxShadow: isDark ? "0 2px 10px rgba(200,168,107,0.12)" : "0 2px 10px rgba(180,140,60,0.12)",
          transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(200,168,107,0.2)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = pillBg;
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <MessageCirclePlus size={13} />
        Refine this chapter
      </button>

      <CassChapterContextDrawer
        open={drawerOpen}
        projectId={projectId}
        chapter={chapter}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────────────────

function CassChapterContextDrawer({
  open,
  projectId,
  chapter,
  onClose,
}: {
  open: boolean;
  projectId: string;
  chapter: Chapter;
  onClose: () => void;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobileBrowser = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const drawerBg     = isDark ? "#0d0c09" : "#f5f0e8";
  const drawerBorder = isDark ? "rgba(200,168,107,0.12)" : "rgba(200,168,107,0.25)";
  const headerBg     = isDark ? "#0a0a0a" : "#f0ebe0";
  const headerBorder = isDark ? "#1e1e1e" : "rgba(26,14,0,0.1)";
  const labelBarBg   = isDark ? "#2a2208" : "rgba(200,168,107,0.15)";
  const textMuted    = isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.4)";
  const textBody     = isDark ? "rgba(248,248,246,0.82)" : "rgba(26,14,0,0.82)";
  const refBg        = isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)";
  const refBorder    = isDark ? "rgba(200,168,107,0.12)" : "rgba(200,168,107,0.2)";
  const refLabel     = isDark ? "rgba(200,168,107,0.4)" : "rgba(200,168,107,0.6)";
  const refText      = isDark ? "rgba(248,248,246,0.55)" : "rgba(26,14,0,0.55)";
  const userBubbleBg = isDark ? "rgba(200,168,107,0.1)" : "rgba(200,168,107,0.12)";
  const userBubbleBdr= isDark ? "rgba(200,168,107,0.22)" : "rgba(200,168,107,0.3)";
  const userBubbleTxt= isDark ? "#e8c789" : "rgba(26,14,0,0.82)";
  const closeColor   = isDark ? "rgba(200,168,107,0.6)" : "rgba(26,14,0,0.4)";
  const inputBorder  = isDark ? "#2e2e2e" : "rgba(26,14,0,0.1)";
  const thatEnoughColor = isDark ? "rgba(200,168,107,0.5)" : "rgba(200,168,107,0.7)";
  const affectedText = isDark ? "rgba(248,248,246,0.75)" : "rgba(26,14,0,0.75)";

  const [messages, setMessages] = useState<ContextMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const openedRef = useRef(false);
  const hadReviewFlagRef = useRef(false);

  // ── Conversation (voice) mode ──
  const [conversationMode, setConversationMode] = useState(false);
  const conversationModeRef = useRef(false);
  const [isCassSpeaking, setIsCassSpeaking] = useState(false);
  const cassAudioRef = useRef<HTMLAudioElement | null>(null);
  const openMicRef = useRef<(() => void) | null>(null);

  function stopCassAudio() {
    if (cassAudioRef.current) {
      cassAudioRef.current.pause();
      cassAudioRef.current = null;
    }
    setIsCassSpeaking(false);
  }

  async function speakCassReply(text: string) {
    stopCassAudio();
    try {
      const res = await fetch("/api/tts/cass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      cassAudioRef.current = audio;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (cassAudioRef.current === audio) cassAudioRef.current = null;
        setIsCassSpeaking(false);
        if (conversationModeRef.current) openMicRef.current?.();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      setIsCassSpeaking(true);
      await audio.play();
    } catch {
      setIsCassSpeaking(false);
    }
  }

  function toggleConversationMode(next: boolean) {
    conversationModeRef.current = next;
    setConversationMode(next);
    if (next) {
      const greeting = "Go ahead and talk out loud. I'm listening.";
      setMessages((prev) => [...prev, { role: "assistant", content: greeting }]);
      speakCassReply(greeting);
    } else {
      stopCassAudio();
    }
  }

  useEffect(() => {
    queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [messages, isLoading]);

  // Closing the drawer (or navigating away) must end any live conversation-mode
  // thread — otherwise Cass keeps talking/listening after it's off-screen.
  useEffect(() => {
    if (open) return;
    conversationModeRef.current = false;
    setConversationMode(false);
    stopCassAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      conversationModeRef.current = false;
      stopCassAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;

    setMessages([]);
    setDraft("");
    setError(null);
    setDone(false);
    conversationModeRef.current = false;
    setConversationMode(false);
    stopCassAudio();
    hadReviewFlagRef.current = Boolean(chapter.needsReviewReason);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/cass-chapter-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, chapterId: chapter.id, messages: [] }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Couldn't connect.");
        const reply = data.reply?.trim() ?? "";
        if (!reply) throw new Error("No response.");
        setMessages([{ role: "assistant", content: reply }]);
        if (!isMobileBrowser) {
          conversationModeRef.current = true;
          setConversationMode(true);
          setTimeout(() => speakCassReply(reply), 80);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, chapter.id]);

  function send(
    content: string,
    extra?: {
      acceptedParagraph?: ProposedParagraph;
      acceptedReframe?: { newChapterType: string };
      approvedAffectedChapters?: AffectedChapter[];
    },
  ) {
    if (isLoading || done) return;
    const showUserBubble = content.trim().length > 0;
    const next: ContextMessage[] = showUserBubble
      ? [...messages, { role: "user", content: content.trim() }]
      : messages;
    setMessages(next);
    setDraft("");
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/cass-chapter-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            chapterId: chapter.id,
            messages: next,
            ...extra,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          done?: boolean;
          capturedNote?: string;
          proposedParagraph?: ProposedParagraph | null;
          reframe?: Reframe | null;
          affectedChapters?: AffectedChapter[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Chapter context chat failed.");
        const reply = data.reply?.trim() ?? "";
        setMessages((m) => [...m, {
          role: "assistant",
          content: reply,
          proposedParagraph: data.proposedParagraph ?? null,
          reframe: data.reframe ?? null,
          affectedChapters: data.affectedChapters ?? [],
        }]);
        if (data.done) {
          setDone(true);
          if (hadReviewFlagRef.current) {
            clearChapterReviewFlagAction({ projectId, boardId: chapter.id })
              .then(() => router.refresh())
              .catch(() => undefined);
          }
        }
        if (conversationModeRef.current) speakCassReply(reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  }

  function resolveMessage(index: number) {
    setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, resolved: true } : msg)));
  }

  function acceptParagraph(index: number, p: ProposedParagraph) {
    resolveMessage(index);
    send("", { acceptedParagraph: p });
  }

  function rejectParagraph(index: number) {
    resolveMessage(index);
    send("Let's keep that paragraph as it was.");
  }

  function confirmReframe(index: number, r: Reframe) {
    resolveMessage(index);
    send("", { acceptedReframe: { newChapterType: r.newChapterType } });
  }

  function keepMechanic(index: number) {
    resolveMessage(index);
    send("No, the mechanic is right as it is.");
  }

  function approveAffected(index: number, chapters: AffectedChapter[]) {
    resolveMessage(index);
    send("", { approvedAffectedChapters: chapters });
  }

  const paragraphs = (chapter.chapterStory ?? "").split("\n\n").filter((p) => p.trim());

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: open ? "auto" : "none" }}
      aria-hidden={!open}
    >
      <div
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)",
          transition: "opacity 0.3s", opacity: open ? 1 : 0,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(480px, 100vw)",
          display: "flex", flexDirection: "column",
          background: drawerBg,
          borderLeft: `1px solid ${drawerBorder}`,
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          <div style={{
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            padding: "8px 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/icons/authored-by-tape-icon.png"
              alt="Authored By"
              style={{ width: "auto", height: "52px", objectFit: "contain" }}
            />
            <button
              type="button" onClick={onClose} aria-label="Close"
              style={{
                position: "absolute", top: "50%", right: "16px", transform: "translateY(-50%)",
                width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.06)", color: closeColor,
                border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ background: labelBarBg, padding: "6px 16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(200,168,107,0.85)" }}>
              {chapter.name}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <CassRecorder animState={isLoading ? "playing" : "idle"} size="sm" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted }}>
              Cass · Story Guide
            </span>
          </div>

          {/* Current chapter text — read-only reference while editing */}
          {paragraphs.length > 0 && (
            <div style={{
              background: refBg,
              border: `1px solid ${refBorder}`,
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "8px",
            }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: refLabel, margin: "0 0 8px" }}>
                Chapter as written
              </p>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: 1.6, color: refText, margin: i === 0 ? "0 0 8px" : "8px 0" }}>
                  {p}
                </p>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" ? (
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "15px",
                    lineHeight: "1.65",
                    color: textBody,
                    margin: 0,
                    maxWidth: "92%",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </p>
                ) : (
                  <div style={{
                    background: userBubbleBg,
                    border: `1px solid ${userBubbleBdr}`,
                    borderRadius: "18px 18px 4px 18px",
                    padding: "10px 14px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    lineHeight: "1.55",
                    color: userBubbleTxt,
                    maxWidth: "80%",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                )}
              </div>

              {/* Proposed paragraph edit */}
              {msg.proposedParagraph && (
                <div style={{
                  background: "rgba(245,200,74,0.05)",
                  border: "1px solid rgba(245,200,74,0.18)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  opacity: msg.resolved ? 0.5 : 1,
                }}>
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", lineHeight: 1.6, color: "rgba(248,113,113,0.6)", textDecoration: "line-through", margin: "0 0 6px" }}>
                    {msg.proposedParagraph.originalText}
                  </p>
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: 1.6, color: "#f5c84a", margin: "0 0 10px" }}>
                    {msg.proposedParagraph.newText}
                  </p>
                  {!msg.resolved && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={() => acceptParagraph(i, msg.proposedParagraph!)} style={pillBtnStyle("#f5c84a", "#1a0e00")}>
                        <Check size={12} /> Accept
                      </button>
                      <button type="button" onClick={() => rejectParagraph(i)} style={pillBtnStyle("transparent", "rgba(248,248,246,0.5)", "rgba(248,248,246,0.2)")}>
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reframe proposal */}
              {msg.reframe && (
                <div style={{
                  background: "rgba(248,113,113,0.05)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  opacity: msg.resolved ? 0.5 : 1,
                }}>
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: 1.6, color: "rgba(248,248,246,0.8)", margin: "0 0 10px" }}>
                    Change this chapter&rsquo;s mechanic to <strong>{CHAPTER_TYPE_LABEL[msg.reframe.newChapterType] ?? msg.reframe.newChapterType}</strong>{msg.reframe.rationale ? ` — ${msg.reframe.rationale}` : ""}?
                  </p>
                  {!msg.resolved && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={() => confirmReframe(i, msg.reframe!)} style={pillBtnStyle("#f87171", "#1a0e00")}>
                        <Check size={12} /> Change it
                      </button>
                      <button type="button" onClick={() => keepMechanic(i)} style={pillBtnStyle("transparent", "rgba(248,248,246,0.5)", "rgba(248,248,246,0.2)")}>
                        <X size={12} /> Keep as is
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Affected chapters summary */}
              {msg.affectedChapters && msg.affectedChapters.length > 0 && (
                <div style={{
                  background: "rgba(200,168,107,0.05)",
                  border: "1px solid rgba(200,168,107,0.18)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  opacity: msg.resolved ? 0.5 : 1,
                }}>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,168,107,0.55)", margin: "0 0 8px" }}>
                    This may affect
                  </p>
                  {msg.affectedChapters.map((c) => (
                    <p key={c.chapterId} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", lineHeight: 1.55, color: affectedText, margin: "0 0 6px" }}>
                      <strong>{c.chapterName}</strong> — {c.reason}
                    </p>
                  ))}
                  {!msg.resolved && (
                    <div style={{ display: "flex", marginTop: "6px" }}>
                      <button type="button" onClick={() => approveAffected(i, msg.affectedChapters!)} style={pillBtnStyle("#f5c84a", "#1a0e00")}>
                        <Check size={12} /> Got it, flag these
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 2px" }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f5c84a", opacity: 0.4, animation: `chapterContextDotPulse 1.1s ease-in-out ${d * 0.18}s infinite` }} />
              ))}
            </div>
          )}

          {error && (
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>
          )}

          {done && (
            <div style={{
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.15)",
              borderRadius: "12px",
              padding: "14px 16px",
              marginTop: "4px",
            }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: "rgba(74,222,128,0.8)", margin: 0, lineHeight: 1.6 }}>
                Saved. Come back anytime to refine this chapter further.
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        {!done && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${inputBorder}`, padding: "12px 14px 16px" }}>
            {messages.some((m) => m.role === "user") && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => send("That's enough for now.")}
                disabled={isLoading}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "12px",
                  color: thatEnoughColor,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                That&rsquo;s enough for now
              </button>
            </div>
            )}
            <VoiceInputFooter
              value={draft}
              onChange={setDraft}
              onSubmit={(text) => send(text ?? draft)}
              voiceMode={conversationMode}
              isCassSpeaking={isCassSpeaking}
              onRegisterOpenMic={(fn) => { openMicRef.current = fn; }}
              onEnterVoiceMode={() => toggleConversationMode(true)}
              onExitVoiceMode={() => toggleConversationMode(false)}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes chapterContextDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function pillBtnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: bg,
    color,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: "999px",
    padding: "6px 14px",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
  };
}
