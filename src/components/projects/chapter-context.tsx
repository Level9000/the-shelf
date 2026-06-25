"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, LoaderCircle, MessageCirclePlus, X } from "lucide-react";
import type { Chapter } from "@/types";
import { CassRecorder } from "@/components/cass/CassRecorder";

type ContextMessage = { role: "user" | "assistant"; content: string };

// ── Pill (sits below each chapter's content) ──────────────────────────────────

export function ChapterContextPill({
  projectId,
  chapter,
  isDark,
}: {
  projectId: string;
  chapter: Chapter;
  isDark: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        Add to this chapter
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
  const [messages, setMessages] = useState<ContextMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const openedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [messages, isLoading]);

  useEffect(() => {
    if (draft === "" && textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [draft]);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  }, [open, projectId, chapter.id]);

  function send(content: string) {
    if (!content.trim() || isLoading || done) return;
    const next: ContextMessage[] = [...messages, { role: "user", content: content.trim() }];
    setMessages(next);
    setDraft("");
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/cass-chapter-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, chapterId: chapter.id, messages: next }),
        });
        const data = (await res.json()) as {
          reply?: string;
          done?: boolean;
          capturedNote?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Chapter context chat failed.");
        const reply = data.reply?.trim() ?? "";
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        if (data.done) setDone(true);
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
        onClick={onClose}
      />

      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(480px, 100vw)",
          display: "flex", flexDirection: "column",
          background: "#0d0c09",
          borderLeft: "1px solid rgba(200,168,107,0.12)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          <div style={{
            background: "#0a0a0a",
            borderBottom: "1px solid #1e1e1e",
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
                borderRadius: "50%", background: "rgba(255,255,255,0.06)", color: "rgba(200,168,107,0.6)",
                border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ background: "#2a2208", padding: "6px 16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(200,168,107,0.85)" }}>
              {chapter.name}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <CassRecorder animState={isLoading ? "playing" : "talking"} size="sm" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.35)" }}>
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
                  color: "rgba(248,248,246,0.82)",
                  margin: 0,
                  maxWidth: "92%",
                }}>
                  {msg.content}
                </p>
              ) : (
                <div style={{
                  background: "rgba(200,168,107,0.1)",
                  border: "1px solid rgba(200,168,107,0.22)",
                  borderRadius: "18px 18px 4px 18px",
                  padding: "10px 14px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14px",
                  lineHeight: "1.55",
                  color: "#e8c789",
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
                Saved. This will feed into how this chapter gets written.
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        {!done && (
          <div style={{ flexShrink: 0, borderTop: "1px solid #2e2e2e", padding: "12px 14px 16px" }}>
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
                  color: "rgba(200,168,107,0.5)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                That&rsquo;s enough for now
              </button>
            </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
                placeholder="Type here…"
                rows={1}
                disabled={isLoading}
                style={{
                  flex: 1,
                  height: "40px",
                  maxHeight: "120px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  resize: "none",
                  overflow: "auto",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "rgba(248,248,246,0.85)",
                  caretColor: "#f5c84a",
                  outline: "none",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(245,200,74,0.35)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <button
                type="button"
                onClick={() => send(draft)}
                disabled={!draft.trim() || isLoading}
                style={{
                  width: "40px", height: "40px", flexShrink: 0,
                  borderRadius: "50%", border: "none",
                  background: draft.trim() && !isLoading ? "#f5c84a" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: draft.trim() && !isLoading ? "pointer" : "not-allowed",
                  transition: "background 0.15s",
                }}
              >
                {isLoading
                  ? <LoaderCircle size={16} style={{ color: "#f5c84a", animation: "spin 1s linear infinite" }} />
                  : <ArrowUp size={16} style={{ color: draft.trim() ? "#0a0a0a" : "rgba(255,255,255,0.3)" }} />
                }
              </button>
            </div>
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
