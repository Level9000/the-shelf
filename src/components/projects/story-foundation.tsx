"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { VoiceInputFooter } from "@/components/cass/VoiceInputFooter";
import { useTheme } from "@/lib/theme-context";

type FoundationMessage = { role: "user" | "assistant"; content: string };

// ── Pill + paragraph (sits above Chapter 1) ───────────────────────────────────

export function StoryFoundationSection({
  project,
  isDark,
}: {
  project: ProjectWithChapters;
  isDark: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [foundation, setFoundation] = useState(project.storyFoundation ?? null);

  const textColor = isDark ? "rgba(232,224,208,0.78)" : "rgba(22,19,15,0.78)";
  const placeholderColor = isDark ? "rgba(200,168,107,0.4)" : "rgba(0,0,0,0.32)";
  const pillBg = isDark ? "rgba(200,168,107,0.12)" : "rgba(200,168,107,0.12)";
  const pillBorder = isDark ? "rgba(200,168,107,0.45)" : "rgba(180,140,60,0.4)";
  const pillColor = isDark ? "#e8c789" : "#8a6d2f";

  return (
    <div style={{ marginBottom: "44px" }}>
      <p
        style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "16px",
          lineHeight: 1.75,
          fontStyle: foundation ? "normal" : "italic",
          color: foundation ? textColor : placeholderColor,
          margin: "0 0 18px",
        }}
      >
        {foundation ?? "The story behind the story hasn't been written yet."}
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
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
            e.currentTarget.style.background = isDark ? "rgba(200,168,107,0.2)" : "rgba(200,168,107,0.2)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = pillBg;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Pencil size={12} />
          Refine the backstory
        </button>
      </div>

      <CassFoundationDrawer
        open={drawerOpen}
        project={project}
        onClose={() => setDrawerOpen(false)}
        onSaved={(summary) => setFoundation(summary)}
      />
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────────────────

export function CassFoundationDrawer({
  open,
  project,
  onClose,
  onSaved,
  gapHint = null,
  onPartialClose,
}: {
  open: boolean;
  project: ProjectWithChapters;
  onClose: () => void;
  onSaved: (summary: string) => void;
  gapHint?: string | null;
  /** Called with the in-progress conversation when the drawer is closed before completion. */
  onPartialClose?: (conversation: FoundationMessage[]) => void;
}) {
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
  const userBubbleBg = isDark ? "rgba(200,168,107,0.1)" : "rgba(200,168,107,0.12)";
  const userBubbleBdr= isDark ? "rgba(200,168,107,0.22)" : "rgba(200,168,107,0.3)";
  const userBubbleTxt= isDark ? "#e8c789" : "rgba(26,14,0,0.82)";
  const closeColor   = isDark ? "rgba(200,168,107,0.6)" : "rgba(26,14,0,0.4)";
  const closeBtnBg   = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.06)";
  const inputBorder  = isDark ? "#2e2e2e" : "rgba(26,14,0,0.1)";
  const thatEnoughColor = isDark ? "rgba(200,168,107,0.5)" : "rgba(200,168,107,0.7)";

  const [messages, setMessages] = useState<FoundationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const openedRef = useRef(false);

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

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/cass-foundation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, messages: [], gapHint }),
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
  }, [open, project.id, gapHint]);

  function handleClose() {
    if (!done) onPartialClose?.(messages);
    onClose();
  }

  function send(content: string) {
    if (!content.trim() || isLoading || done) return;
    const next: FoundationMessage[] = [...messages, { role: "user", content: content.trim() }];
    setMessages(next);
    setDraft("");
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/cass-foundation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, messages: next }),
        });
        const data = (await res.json()) as {
          reply?: string;
          done?: boolean;
          foundationSummary?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Foundation chat failed.");
        const reply = data.reply?.trim() ?? "";
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        if (data.done) {
          setDone(true);
          if (data.foundationSummary) onSaved(data.foundationSummary);
        }
        if (conversationModeRef.current) speakCassReply(reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  }

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
        onClick={handleClose}
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
          {/* Authored By banner */}
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
              type="button" onClick={handleClose} aria-label="Close"
              style={{
                position: "absolute", top: "50%", right: "16px", transform: "translateY(-50%)",
                width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", background: closeBtnBg, color: closeColor,
                border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s",
              }}
            >
              <X size={14} />
            </button>
          </div>
          {/* Label bar */}
          <div style={{ background: labelBarBg, padding: "6px 16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(200,168,107,0.85)" }}>
              Before Chapter One
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Cass avatar — always at top, matching the board drawer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <CassRecorder animState={isLoading ? "playing" : "idle"} size="sm" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted }}>
              Cass · Story Guide
            </span>
          </div>

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "assistant" ? (
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "15px",
                  lineHeight: "1.65",
                  color: textBody,
                  margin: 0,
                  maxWidth: "92%",
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
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 2px" }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f5c84a", opacity: 0.4, animation: `foundationDotPulse 1.1s ease-in-out ${d * 0.18}s infinite` }} />
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
                Saved. You can come back and add more to this anytime.
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
        @keyframes foundationDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
