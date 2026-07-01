"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { TapeButton } from "@/components/ui/tape-button";
import { Modal } from "@/components/ui/modal";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { useTheme } from "@/lib/theme-context";

// ── Voice input footer ──────────────────────────────────────────────────────────
// Shared input bar + full voice-mode screen used by onboarding and by the Cass
// chat drawer (board + story tabs). Two visual states:
//  - Text mode: a pill text input with an inline "Voice" toggle and a send button.
//  - Voice mode: a full centered mic button ("talking out loud", like a call).

export function VoiceInputFooter({
  value,
  onChange,
  onSubmit,
  voiceMode = false,
  isCassSpeaking = false,
  onRegisterOpenMic,
  onEnterVoiceMode,
  onExitVoiceMode,
  textRowMarginLeft,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text?: string) => void;
  voiceMode?: boolean;
  /** True while Cass's spoken reply is playing — drives the bottom glow alongside `listening`. */
  isCassSpeaking?: boolean;
  onRegisterOpenMic?: (fn: () => void) => void;
  /** When provided, the inline "Voice" button enters full voice mode instead of just dictating into the bar. */
  onEnterVoiceMode?: () => void;
  /** Onboarding indents the bar to align with its avatar gutter — leave unset elsewhere. */
  textRowMarginLeft?: string;
  onExitVoiceMode?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [listening, setListening] = useState(false);
  const [showMobileConversationNotice, setShowMobileConversationNotice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef(value);
  // iOS doesn't support continuous SpeechRecognition — use push-to-talk instead
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  // Mobile browsers (iOS + Android) handle mic access for conversation mode poorly —
  // point people to the app instead of dropping them into a broken voice-mode screen.
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

  // Auto-start mic when entering voice mode (desktop only — iOS uses push-to-talk)
  useEffect(() => {
    if (voiceMode && !listening && !isIOS) {
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
      // On iOS, don't auto-open mic after TTS — user initiates with a hold
      if (voiceMode && !isIOS) startListening();
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

    // Tear down any existing instance before creating a new one.
    // Without this, the old recognition keeps firing onresult and both instances
    // append to finalTranscriptRef — causing the transcript to repeat itself.
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }

    finalTranscriptRef.current = "";
    onChange("");

    const rec: any = new SR();
    rec.continuous = !isIOS; // iOS doesn't support continuous mode reliably
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
      // On iOS, recognition ends naturally after speech — auto-submit what we captured
      if (isIOS && finalTranscriptRef.current.trim()) {
        const text = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = "";
        onChange("");
        onSubmit(text);
      }
    };
    rec.onerror = () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setListening(false);
    };

    rec.start();
    setListening(true);
  }

  function toggleVoice() {
    if (onEnterVoiceMode && !voiceMode) {
      if (isMobile) {
        setShowMobileConversationNotice(true);
        return;
      }
      onEnterVoiceMode();
      return;
    }
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <>
      <style>{`
        @keyframes voice-input-dot-pulse {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
        @keyframes voice-input-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scaleY(0.85); }
          50%       { opacity: 1;   transform: scaleY(1); }
        }
        .voice-input-textarea {
          flex: 1; background: transparent; border: none; border-radius: 0;
          padding: 9px 4px 9px 16px;
          font-family: 'Lora', Georgia, serif; font-size: 14px;
          caret-color: #f5c84a; outline: none; resize: none;
          min-height: 40px; max-height: 120px; line-height: 1.5;
          scrollbar-width: none;
        }
        .voice-input-textarea--dark::placeholder { color: #666; }
        .voice-input-textarea--light::placeholder { color: rgba(26,14,0,0.35); }
      `}</style>
      <div style={{
        position: "relative",
        padding: "12px 16px 20px",
        flexShrink: 0,
        animation: "cass-fade-up 0.25s ease forwards",
        maxWidth: "600px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}>
      {voiceMode && (listening || isCassSpeaking) && (
        /* Pulsating gold glow — active while the user is talking (input) or Cass is talking (output) */
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            bottom: 0,
            width: "100vw",
            height: "25vh",
            pointerEvents: "none",
            background: "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(200,168,107,0.55) 0%, rgba(200,168,107,0.3) 45%, rgba(200,168,107,0) 80%)",
            filter: "blur(10px)",
            transformOrigin: "bottom center",
            animation: "voice-input-glow-pulse 1.6s ease-in-out infinite",
            zIndex: 0,
          }}
        />
      )}
      {voiceMode ? (
        /* ── Full voice mode UI ── */
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
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
          {/* Mic pulse button — push-to-talk on iOS, tap-to-toggle on desktop */}
          <button
            type="button"
            {...(isIOS ? {
              onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (!listening) startListening(); },
              onPointerUp:   (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (listening) stopListening(); },
              onPointerCancel: () => { if (listening) stopListening(); },
            } : {
              onClick: toggleVoice,
            })}
            aria-label={listening ? "Stop recording" : "Start recording"}
            style={{
              width: "96px", height: "96px", borderRadius: "50%",
              background: listening
                ? "rgba(245,200,74,0.15)"
                : isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.04)",
              border: `2px solid ${listening ? "#f5c84a" : isDark ? "rgba(255,255,255,0.15)" : "rgba(200,168,107,0.5)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: listening ? "0 0 0 12px rgba(245,200,74,0.08), 0 0 0 24px rgba(245,200,74,0.04)" : "none",
              userSelect: "none", WebkitUserSelect: "none",
            }}
          >
            <svg width="28" height="24" viewBox="0 0 16 14" fill="none" aria-hidden="true">
              {[
                { x: 0,  h: 4,  y: 5 },
                { x: 3,  h: 8,  y: 3 },
                { x: 6,  h: 14, y: 0 },
                { x: 9,  h: 8,  y: 3 },
                { x: 12, h: 4,  y: 5 },
              ].map((bar, i) => (
                <rect
                  key={i} x={bar.x} y={bar.y} width="2" height={bar.h} rx="1"
                  fill={listening ? "#f5c84a" : isDark ? "#666" : "rgba(26,14,0,0.35)"}
                  style={listening ? { animation: `voice-input-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
                />
              ))}
            </svg>
          </button>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px",
            fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
            color: listening ? "#f5c84a" : isDark ? "#888" : "rgba(26,14,0,0.9)",
            transition: "color 0.2s",
          }}>
            {isIOS
              ? (listening ? "Release to send" : "Hold to speak")
              : (listening && value ? "Listening…" : "Start talking...")}
          </span>
          {/* Exit conversation mode */}
          <button
            type="button"
            onClick={onExitVoiceMode}
            style={{
              marginTop: "4px",
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px",
              fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
              color: isDark ? "rgba(200,168,107,0.6)" : "rgba(26,14,0,0.5)",
              transition: "color 0.15s",
              padding: "4px 8px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(200,168,107,0.9)" : "rgba(26,14,0,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(200,168,107,0.6)" : "rgba(26,14,0,0.5)"; }}
          >
            Exit conversation mode
          </button>
        </div>
      ) : (
        /* ── Text + optional mic UI ── */
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
          marginLeft: textRowMarginLeft,
        }}>
          {/* Input bar with inline Voice button */}
          <div style={{
            flex: 1, display: "flex", alignItems: "flex-end",
            background: isDark ? "#2e2e2e" : "rgba(26,14,0,0.06)",
            border: `1px solid ${listening ? "#f5c84a" : isDark ? "#3a3a3a" : "rgba(26,14,0,0.15)"}`,
            borderRadius: "22px", overflow: "hidden",
            transition: "border-color 0.15s",
            boxShadow: listening ? "0 0 0 3px rgba(245,200,74,0.15)" : "none",
          }}>
            <textarea
              ref={textareaRef}
              autoFocus
              className={`voice-input-textarea ${isDark ? "voice-input-textarea--dark" : "voice-input-textarea--light"}`}
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
              style={{
                color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)",
                colorScheme: isDark ? "dark" : "light",
              }}
            />
            {/* Inline Voice button — hidden once user starts typing */}
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? "Stop recording" : "Voice input"}
              style={{
                display: value.trim() && !listening ? "none" : "flex", alignItems: "center", gap: "5px",
                background: listening ? "rgba(245,200,74,0.15)" : "transparent",
                border: "none",
                borderLeft: `1px solid ${listening ? "rgba(245,200,74,0.3)" : isDark ? "#3a3a3a" : "rgba(26,14,0,0.12)"}`,
                padding: "0 14px", height: "100%", minHeight: "40px",
                cursor: "pointer", flexShrink: 0,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (!listening) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(26,14,0,0.05)"; }}
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
                    fill={listening ? "#f5c84a" : isDark ? "#888" : "rgba(26,14,0,0.4)"}
                    style={listening ? { animation: `voice-input-dot-pulse 0.8s ease-in-out ${i * 0.12}s infinite` } : {}}
                  />
                ))}
              </svg>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: listening ? "#f5c84a" : isDark ? "#888" : "rgba(26,14,0,0.4)",
                transition: "color 0.15s",
              }}>
                {listening ? "Stop" : "Voice"}
              </span>
            </button>
          </div>

          {/* Send button — matches input height (40px) */}
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={!value.trim()}
            aria-label="Send"
            style={{
              width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
              background: value.trim() ? "#f5c84a" : isDark ? "#2e2e2e" : "rgba(26,14,0,0.08)",
              border: "none", cursor: value.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (value.trim()) e.currentTarget.style.background = "#f0c040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = value.trim() ? "#f5c84a" : isDark ? "#2e2e2e" : "rgba(26,14,0,0.08)"; }}
          >
            <span className="material-icons" style={{ fontSize: "18px", color: value.trim() ? "#0a0a0a" : isDark ? "#555" : "rgba(26,14,0,0.25)" }}>arrow_upward</span>
          </button>
        </div>
      )}
      </div>
      <Modal
        open={showMobileConversationNotice}
        onClose={() => setShowMobileConversationNotice(false)}
        title="Conversation mode lives in the app"
        hideHeader
      >
        <div className="px-6 pt-6 text-center">
          {/* Cass avatar — same treatment as the chat drawer's header avatar */}
          <div className="flex flex-col items-center gap-2">
            <CassRecorder animState="talking" size="sm" />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)",
              }}
            >
              Cass · Story Guide
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-cass)" }}>
            Conversation mode lives in the app
          </h1>
          <p
            style={{ fontFamily: "'Lora', Georgia, serif" }}
            className="mt-2 text-sm leading-6 text-[var(--muted)]"
          >
            Mobile browsers don&apos;t handle voice well. Download the Authored By app for the full talk-it-out experience.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-6 pt-5">
          <div className="flex justify-center">
            <TapeButton
              variant="primary"
              size="lg"
              onClick={() => setShowMobileConversationNotice(false)}
              className="justify-center"
            >
              <ArrowRight className="size-4" />
              Got it
            </TapeButton>
          </div>
          <TapeButton
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileConversationNotice(false)}
            className="flex w-full items-center justify-center gap-1.5"
          >
            <X className="size-3" />
            Close
          </TapeButton>
        </div>
      </Modal>
    </>
  );
}
