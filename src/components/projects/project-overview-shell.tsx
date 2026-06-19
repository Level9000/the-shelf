"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, ChevronRight, LoaderCircle, X } from "lucide-react";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, Task, UserProfile } from "@/types";
import { PRESS_TEMPLATES } from "@/lib/press/templates";
import type { PressTemplate } from "@/lib/press/templates";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { CassProgressBar } from "@/components/cass/CassProgressBar";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";
import { ShareFab } from "@/components/ui/ShareFab";
import { PressFab } from "@/components/ui/PressFab";
import { MobileFab } from "@/components/ui/MobileFab";
import { renderParagraphs } from "@/lib/render-paragraphs";
import { useTheme } from "@/lib/theme-context";
import { TapeButton } from "@/components/ui/tape-button";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { TyFirstStoryIntro } from "@/components/ui/TyFirstStoryIntro";
import type { SubscriptionStatus } from "@/lib/subscription";

const TY_INTRO_KEY = "ty_story_intro_seen";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chapterStatus(chapter: Chapter): "completed" | "working_on_it" | "planned" {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

// ── Chat history types ───────────────────────────────────────────────────────

type ChatThread = {
  id: string;
  label: string;
  completedAt: string;
  messages: Array<{ role: string; content: string }>;
  tasks?: Task[];
};

/** Pull the human-readable reply out of a message.
 *  Older kickoff/retro flows may have stored raw JSON; newer tool-use flows
 *  store the extracted `reply` string directly. */
function extractContent(msg: { role: string; content: string }): string {
  if (msg.role === "assistant") {
    const trimmed = msg.content.trimStart();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof parsed.reply === "string") return parsed.reply;
      } catch { /* fall through */ }
    }
  }
  return msg.content;
}

// ── Chat history drawer (read-only) ─────────────────────────────────────────

function ChatHistoryDrawer({
  thread,
  onClose,
}: {
  thread: ChatThread | null;
  onClose: () => void;
}) {
  const open = Boolean(thread);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever a thread opens
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, thread?.id]);

  const completedDate = thread
    ? new Date(thread.completedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: open ? "auto" : "none" }}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)",
          transition: "opacity 0.3s", opacity: open ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Panel */}
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
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(200,168,107,0.08)",
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: "12px",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-cass)",
              fontSize: "11px", letterSpacing: "3px",
              color: "rgba(200,168,107,0.45)", textTransform: "uppercase", marginBottom: "5px",
            }}>
              Cass · Archived
            </p>
            <p style={{
              fontFamily: "'Literata', Georgia, serif",
              fontSize: "21px", fontWeight: 700, letterSpacing: "-0.02em",
              color: "#d4cec4", lineHeight: 1.2,
            }}>
              {thread?.label ?? ""}
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "4px", background: "none", border: "none",
              cursor: "pointer", color: "rgba(200,168,107,0.5)", flexShrink: 0, marginTop: "2px",
              fontFamily: "'Literata', Georgia, serif",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Completed banner */}
        <div style={{
          padding: "10px 20px",
          background: "rgba(74,222,128,0.05)",
          borderBottom: "1px solid rgba(74,222,128,0.1)",
        }}>
          <p style={{
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "14px",
            color: "rgba(74,222,128,0.75)", margin: 0,
          }}>
            ✓&nbsp; this conversation completed on {completedDate}
          </p>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {thread?.messages.map((msg, i) => {
            const content = extractContent(msg);
            if (!content.trim()) return null;
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  background: isUser ? "rgba(200,168,107,0.09)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isUser ? "rgba(200,168,107,0.14)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  padding: "10px 14px",
                  fontFamily: "'Literata', Georgia, serif",
                  fontSize: "14px", lineHeight: 1.7,
                  color: isUser ? "#c8a86b" : "rgba(232,224,208,0.88)",
                  whiteSpace: "pre-wrap",
                }}>
                  {content}
                </div>
              </div>
            );
          })}

          {/* Task cards created during this conversation */}
          {thread?.tasks && thread.tasks.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <p style={{
                fontFamily: "'Literata', Georgia, serif",
                fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em",
                color: "rgba(200,168,107,0.55)", margin: "0 0 10px",
              }}>
                Cards created
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {thread.tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(200,168,107,0.1)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                    }}
                  >
                    <p style={{
                      fontFamily: "'Literata', Georgia, serif",
                      fontSize: "13px", fontWeight: 600, lineHeight: 1.4,
                      color: "rgba(232,224,208,0.85)", margin: 0,
                    }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p style={{
                        fontFamily: "'Literata', Georgia, serif",
                        fontSize: "12px", lineHeight: 1.55,
                        color: "rgba(232,224,208,0.45)", margin: "4px 0 0",
                      }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      {task.assigneeName && (
                        <span style={{
                          fontFamily: "'Literata', Georgia, serif",
                          fontSize: "11px", color: "rgba(200,168,107,0.5)",
                        }}>
                          {task.assigneeName}
                        </span>
                      )}
                      {task.priority && (
                        <span style={{
                          fontFamily: "'Literata', Georgia, serif",
                          fontSize: "11px",
                          color: task.priority === "high" ? "rgba(248,113,113,0.65)"
                            : task.priority === "medium" ? "rgba(251,191,36,0.55)"
                            : "rgba(200,168,107,0.4)",
                          textTransform: "capitalize",
                        }}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Disabled input area */}
        <div style={{ padding: "14px 20px 28px", borderTop: "1px solid rgba(200,168,107,0.08)" }}>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(200,168,107,0.07)",
            borderRadius: "12px", padding: "14px 16px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: "var(--font-cass)",
              fontSize: "11px", letterSpacing: "1px",
              color: "rgba(200,168,107,0.28)", margin: 0,
            }}>
              this conversation has ended
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared drawer styles ──────────────────────────────────────────────────────

// ── Audience options ──────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { id: "blog", label: "Blog post", description: "Tell your story in long form", templateId: "case-study" },
  { id: "social", label: "Social media", description: "A punchy update for LinkedIn or X", templateId: "founder-memo" },
  { id: "network", label: "Professional network", description: "Reach your professional contacts", templateId: "quarterly-update" },
  { id: "leadership", label: "Leadership", description: "A memo for your team or board", templateId: "quarterly-update" },
  { id: "investors", label: "Investors", description: "Make the case to funders", templateId: "investor-pitch" },
] as const;

type DrawerMode = "audience" | "chat";
type PlanMessage = { role: "user" | "assistant"; content: string };

// ── Cass Chronicle drawer ─────────────────────────────────────────────────────

function CassChronicleDrawer({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: ProjectWithChapters;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<DrawerMode>("audience");
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);

  // ── Press state ──
  const [pressTemplate, setPressTemplate] = useState<PressTemplate | null>(null);
  const [pressMessages, setPressMessages] = useState<PlanMessage[]>([]);
  const [pressDraft, setPressDraft] = useState("");
  const [pressError, setPressError] = useState<string | null>(null);
  const [pressReadyToGenerate, setPressReadyToGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPressLoading, startPressTransition] = useTransition();
  const pressEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => pressEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [pressMessages, isPressLoading]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setMode("audience");
    setSelectedAudience(null);
    setPressTemplate(null);
    setPressMessages([]);
    setPressDraft("");
    setPressError(null);
    setPressReadyToGenerate(false);
    setIsGenerating(false);
  }, [open]);

  function enterChatMode(audienceId: string) {
    const audience = AUDIENCE_OPTIONS.find((a) => a.id === audienceId);
    if (!audience) return;
    const template = PRESS_TEMPLATES.find((t) => t.id === audience.templateId);
    if (!template) return;

    setSelectedAudience(audienceId);
    setPressTemplate(template);
    setPressMessages([]);
    setPressDraft("");
    setPressError(null);
    setPressReadyToGenerate(false);
    setIsGenerating(false);
    setMode("chat");

    const opener: PlanMessage = { role: "user", content: `__press_open__:${template.label}` };
    startPressTransition(async () => {
      try {
        const res = await fetch("/api/chat/press-gap-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, outputType: template.label, audienceId, messages: [opener] }),
        });
        const data = await res.json() as { reply?: string; ready_to_generate?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Couldn't connect.");
        const reply = data.reply?.trim() ?? "";
        if (!reply) throw new Error("No response.");
        setPressMessages([{ role: "assistant", content: reply }]);
        if (data.ready_to_generate) setPressReadyToGenerate(true);
      } catch (err) {
        setPressError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  }

  function handlePressSend() {
    const content = pressDraft.trim();
    if (!content || isPressLoading || !pressTemplate) return;
    const next: PlanMessage[] = [...pressMessages, { role: "user", content }];
    setPressMessages(next);
    setPressDraft("");
    setPressError(null);
    startPressTransition(async () => {
      try {
        const res = await fetch("/api/chat/press-gap-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, outputType: pressTemplate.label, audienceId: selectedAudience, messages: next }),
        });
        const data = await res.json() as { reply?: string; ready_to_generate?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Press failed.");
        const reply = data.reply?.trim() ?? "";
        setPressMessages((m) => [...m, { role: "assistant", content: reply }]);
        if (data.ready_to_generate) setPressReadyToGenerate(true);
      } catch (err) {
        setPressError(err instanceof Error ? err.message : "Signal lost. Stand by.");
      }
    });
  }

  async function handleGenerate() {
    if (!pressTemplate || isGenerating) return;
    setIsGenerating(true);
    setPressError(null);
    try {
      const res = await fetch("/api/press/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          templateId: pressTemplate.id,
          conversation: pressMessages,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Generation failed.");
      }
      const blob = await res.blob();
      const ext = pressTemplate.format;
      const name = `${project.name.toLowerCase().replace(/\s+/g, "-")}-${pressTemplate.id}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPressError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  const progressPercent =
    mode === "chat" && pressReadyToGenerate ? 90 :
    mode === "chat" && pressMessages.length > 2 ? 60 :
    mode === "chat" ? 30 :
    10;

  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.id === selectedAudience)?.label;

  return (
    <>
      <style>{`
        @keyframes chronicleOptionIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chronicleDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: "rgba(0,0,0,0.6)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.3s ease" }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[30%] lg:min-w-[360px]"
        style={{
          background: "#242424",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.5)" : "none",
        }}
        aria-hidden={!open}
      >
        <CassProgressBar percent={progressPercent} />

        {/* Header */}
        <div style={{
          background: "#0a0a0a",
          borderBottom: "1px solid #1e1e1e",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}>
          {mode === "chat" && (
            <button
              type="button"
              onClick={() => {
                setMode("audience");
                setSelectedAudience(null);
                setPressTemplate(null);
                setPressMessages([]);
                setPressDraft("");
                setPressReadyToGenerate(false);
              }}
              style={{
                position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "rgba(248,248,246,0.35)", padding: "4px 6px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(248,248,246,0.75)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(248,248,246,0.35)"; }}
            >
              ← back
            </button>
          )}
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            style={{ height: "40px", width: "auto", objectFit: "contain" }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(248,248,246,0.3)", padding: "4px",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(248,248,246,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(248,248,246,0.3)"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Audience picker ── */}
        {mode === "audience" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "16px", scrollbarWidth: "none" }}>
            {/* Cass FAB — anchored at top of feed */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <CassRecorder animState="idle" size="sm" />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "10px", fontWeight: 600,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(248,248,246,0.35)",
              }}>
                Cass · Story Guide
              </span>
            </div>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "17px",
              lineHeight: "1.55",
              color: "rgba(248,248,246,0.85)",
              margin: 0,
              padding: "0 2px",
            }}>
              Who would you like to share your story with?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {AUDIENCE_OPTIONS.map(({ id, label, description }, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => enterChatMode(id)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(245,200,74,0.15)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: "14px",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "border-color 0.15s, background 0.15s",
                    animation: "chronicleOptionIn 0.28s ease forwards",
                    animationDelay: `${i * 80}ms`,
                    opacity: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(245,200,74,0.4)"; e.currentTarget.style.background = "rgba(245,200,74,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(245,200,74,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  <div style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "50%", border: "1.5px solid rgba(245,200,74,0.4)", background: "transparent" }} />
                  <div>
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "rgba(248,248,246,0.9)", margin: 0, lineHeight: "1.3" }}>{label}</p>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "12px", letterSpacing: "0.05em", color: "rgba(248,248,246,0.4)", margin: "3px 0 0" }}>{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat mode (gap analysis) ── */}
        {mode === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", scrollbarWidth: "none" }}>
              {/* Cass FAB — anchored at top of feed */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <CassRecorder animState={isPressLoading ? "playing" : "idle"} size="sm" />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "10px", fontWeight: 600,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "rgba(248,248,246,0.35)",
                }}>
                  Cass · Story Guide
                </span>
              </div>
              {/* Audience label pill */}
              {audienceLabel && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "rgba(245,200,74,0.6)",
                    border: "1px solid rgba(245,200,74,0.2)",
                    borderRadius: "999px", padding: "3px 12px",
                  }}>
                    {audienceLabel}
                  </span>
                </div>
              )}

              {/* Loading skeleton (first message) */}
              {isPressLoading && pressMessages.length === 0 && (
                <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 2px" }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f5c84a", opacity: 0.4, animation: `chronicleDotPulse 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                  ))}
                </div>
              )}

              {/* Messages */}
              {pressMessages.map((msg, i) => (
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
                      background: "rgba(245,200,74,0.1)",
                      border: "1px solid rgba(245,200,74,0.2)",
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      lineHeight: "1.55",
                      color: "rgba(248,248,246,0.8)",
                      maxWidth: "80%",
                    }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isPressLoading && pressMessages.length > 0 && (
                <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 2px" }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f5c84a", opacity: 0.4, animation: `chronicleDotPulse 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                  ))}
                </div>
              )}

              {pressError && (
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{pressError}</p>
              )}

              {/* Generate CTA */}
              {pressReadyToGenerate && (
                <div style={{
                  background: "rgba(245,200,74,0.07)",
                  border: "1px solid rgba(245,200,74,0.2)",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                  marginTop: "8px",
                }}>
                  <p style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "rgba(245,200,74,0.8)", margin: "0 0 6px",
                  }}>
                    Ready to generate
                  </p>
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: "rgba(248,248,246,0.5)", margin: "0 0 16px", lineHeight: "1.5" }}>
                    Download your {pressTemplate?.label.toLowerCase()} as a .{pressTemplate?.format} file.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    style={{
                      background: isGenerating ? "rgba(245,200,74,0.5)" : "#f5c84a",
                      border: "none", borderRadius: "8px",
                      padding: "10px 20px",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#0a0a0a",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      transition: "background 0.15s",
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        Generating…
                      </>
                    ) : (
                      `Download .${pressTemplate?.format ?? "file"}`
                    )}
                  </button>
                </div>
              )}

              <div ref={pressEndRef} />
            </div>

            {/* Input */}
            {!pressReadyToGenerate && (
              <div style={{ flexShrink: 0, borderTop: "1px solid #2e2e2e", padding: "12px 14px 16px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <textarea
                    value={pressDraft}
                    onChange={(e) => setPressDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePressSend(); } }}
                    placeholder="Fill in the gaps…"
                    rows={2}
                    disabled={isPressLoading}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      resize: "none",
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
                    onClick={handlePressSend}
                    disabled={!pressDraft.trim() || isPressLoading}
                    style={{
                      width: "40px", height: "40px", flexShrink: 0,
                      borderRadius: "50%", border: "none",
                      background: pressDraft.trim() && !isPressLoading ? "#f5c84a" : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: pressDraft.trim() && !isPressLoading ? "pointer" : "not-allowed",
                      transition: "background 0.15s",
                    }}
                  >
                    {isPressLoading
                      ? <LoaderCircle size={16} style={{ color: "#f5c84a", animation: "spin 1s linear infinite" }} />
                      : <ArrowUp size={16} style={{ color: pressDraft.trim() ? "#0a0a0a" : "rgba(255,255,255,0.3)" }} />
                    }
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Chapter entry ─────────────────────────────────────────────────────────────

function ChapterEntry({
  chapter,
  index,
  projectId,
  isLast,
  onOpenThread,
  chapterTasks = [],
}: {
  chapter: Chapter;
  index: number;
  projectId: string;
  isLast: boolean;
  onOpenThread: (t: ChatThread) => void;
  chapterTasks?: Task[];
}) {
  const status = chapterStatus(chapter);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware colors
  const bodyColor       = isDark ? "rgba(232,224,208,0.8)"   : "rgba(22,19,15,0.78)";
  const mutedColor      = isDark ? "rgba(200,168,107,0.4)"   : "rgba(0,0,0,0.38)";
  const faintColor      = isDark ? "rgba(200,168,107,0.3)"   : "rgba(0,0,0,0.25)";
  const inProgressColor = isDark ? "rgba(232,224,208,0.5)"   : "rgba(22,19,15,0.6)";
  const threadLabelColor= isDark ? "rgba(232,224,208,0.7)"   : "rgba(22,19,15,0.7)";
  const pulseColor      = isDark ? "#c8a86b"                 : "rgba(22,19,15,0.5)";
  const dividerGrad     = isDark
    ? "linear-gradient(90deg, transparent, rgba(200,168,107,0.18) 20%, rgba(200,168,107,0.18) 80%, transparent)"
    : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 80%, transparent)";
  const threadBg        = isDark ? "rgba(200,168,107,0.04)"  : "rgba(0,0,0,0.02)";
  const threadBorder    = isDark ? "rgba(200,168,107,0.1)"   : "rgba(0,0,0,0.07)";
  const threadHoverBg   = isDark ? "rgba(200,168,107,0.08)"  : "rgba(0,0,0,0.05)";
  const threadHoverBdr  = isDark ? "rgba(200,168,107,0.18)"  : "rgba(0,0,0,0.12)";
  const iconColor       = isDark ? "rgba(200,168,107,0.5)"   : "rgba(0,0,0,0.35)";
  const chevronColor    = isDark ? "rgba(200,168,107,0.35)"  : "rgba(0,0,0,0.25)";
  const dateColor       = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.35)";

  // Build the list of completed chat threads for this chapter
  const threads: ChatThread[] = [];
  if (chapter.kickoffConversation && chapter.kickoffCompletedAt) {
    threads.push({
      id: `kickoff-${chapter.id}`,
      label: "Chapter Kickoff",
      completedAt: chapter.kickoffCompletedAt,
      messages: chapter.kickoffConversation,
      tasks: chapterTasks,
    });
  }
  chapter.boardConversations.forEach((conv, i) => {
    threads.push({
      id: `board-conv-${chapter.id}-${i}`,
      label: conv.label,
      completedAt: conv.completedAt,
      messages: conv.messages,
      tasks: chapterTasks,
    });
  });
  if (chapter.retroConversation && chapter.retroCompletedAt) {
    threads.push({
      id: `retro-${chapter.id}`,
      label: "Chapter Retro",
      completedAt: chapter.retroCompletedAt,
      messages: chapter.retroConversation,
    });
  }

  return (
    <div id={`chapter-${chapter.id}`}>
      {/* Gold rule divider between chapters */}
      {index > 0 && (
        <div
          style={{
            height: "1px",
            background: dividerGrad,
            margin: "48px 0",
          }}
        />
      )}

      <div style={{ opacity: status === "planned" ? 0.4 : 1, transition: "opacity 0.2s" }}>
        {/* Chapter number label */}
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: isDark ? "rgba(200,168,107,0.45)" : "rgba(0,0,0,0.35)",
          margin: "0 0 6px",
        }}>
          Chapter {index + 1}
        </p>
        {/* Chapter name */}
        <h2 style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "clamp(22px, 4vw, 30px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          margin: 0,
          color: isDark ? "rgba(232,224,208,0.92)" : "rgba(22,19,15,0.88)",
        }}>
          {chapter.name}
        </h2>

        {/* Completed: pull quote */}
        {status === "completed" && chapter.openingLine && (
          <p style={{ fontFamily: "var(--font-cass)", fontSize: "24px", lineHeight: 1.3, margin: "14px 0 0" }}>
            <span style={{
              display: "inline-block",
              background: "#f5c84a",
              color: "#1a0e00",
              padding: "3px 14px 5px",
              clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
            }}>
              &ldquo;{chapter.openingLine}&rdquo;
            </span>
          </p>
        )}

        {/* Completed: full chapter story */}
        {status === "completed" && chapter.chapterStory && renderParagraphs(chapter.chapterStory, {
          fontFamily: "Verdana, Geneva, sans-serif",
          fontSize: "15px",
          color: bodyColor,
          lineHeight: 1.85,
          margin: "16px 0 0",
        })}

        {/* Completed: no story yet — show the bet */}
        {status === "completed" && !chapter.chapterStory && chapter.goal && (
          <p
            style={{
              fontFamily: "var(--font-cass)",
              fontSize: "12px",
              color: mutedColor,
              lineHeight: 1.7,
              margin: "12px 0 0",
              fontStyle: "italic",
            }}
          >
            {chapter.goal}
          </p>
        )}

        {/* In progress: pulsing indicator + goal */}
        {status === "working_on_it" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "14px" }}>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: pulseColor,
                flexShrink: 0,
                marginTop: "5px",
                animation: "overviewPulse 2s ease-in-out infinite",
              }}
            />
            <p
              style={{
                fontFamily: "Verdana, Geneva, sans-serif",
                fontSize: "14px",
                color: inProgressColor,
                lineHeight: 1.7,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {chapter.confirmedThesis || chapter.goal || "This chapter is being written…"}
            </p>
          </div>
        )}

        {/* Planned: goal if set, otherwise placeholder */}
        {status === "planned" && chapter.goal && (
          <p
            style={{
              fontFamily: "var(--font-cass)",
              fontSize: "12px",
              color: faintColor,
              lineHeight: 1.65,
              margin: "10px 0 0",
            }}
          >
            {chapter.goal}
          </p>
        )}

        {/* ── Chat history threads ── */}
        {threads.length > 0 && (
          <div style={{ marginTop: "36px" }}>
            <p style={{
              fontFamily: "'Literata', Georgia, serif",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: isDark ? "rgba(232,224,208,0.5)" : "rgba(22,19,15,0.45)",
              margin: "0 0 10px",
            }}>
              Conversations
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenThread(t)}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    background: threadBg,
                    border: `1px solid ${threadBorder}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer", width: "100%", textAlign: "left",
                    transition: "background 0.15s, border-color 0.15s",
                    fontFamily: "'Literata', Georgia, serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = threadHoverBg;
                    e.currentTarget.style.borderColor = threadHoverBdr;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = threadBg;
                    e.currentTarget.style.borderColor = threadBorder;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      fontFamily: "'Literata', Georgia, serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: threadLabelColor,
                    }}>
                      {t.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{
                      fontFamily: "var(--font-cass)",
                      fontSize: "11px", color: dateColor,
                    }}>
                      {new Date(t.completedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                    <ChevronRight size={12} style={{ color: chevronColor }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Margin decoration items ───────────────────────────────────────────────────

type DecoAvatar = "cass" | "ty" | "press";

type DecoItem = {
  side: "left" | "right";
  src: string | DecoAvatar; // string = image path, DecoAvatar = render that avatar
  w: number;          // used for images; avatars use a fixed scale
  rotation: number;
  tx: string;
  top: number;
  key: number;
};

/**
 * Cycles right → left → right → left…
 * 4 items: tape/sticky image, Cass, Ty, Press
 */
const DECO_PATTERN: Omit<DecoItem, "top" | "key">[] = [
  { side: "right", src: "ty",    w: 0, rotation:  6, tx:  "28%" },
  { side: "left",  src: "cass",  w: 0, rotation: -5, tx: "-20%" },
  { side: "right", src: "press", w: 0, rotation:  4, tx:  "28%" },
  { side: "left",  src: "ty",    w: 0, rotation: -6, tx: "-20%" },
  { side: "right", src: "cass",  w: 0, rotation:  5, tx:  "28%" },
  { side: "left",  src: "press", w: 0, rotation: -4, tx: "-18%" },
];

// ── Main shell ────────────────────────────────────────────────────────────────

export function ProjectOverviewShell({
  project,
  projects,
  profile,
  currentUser,
  projectMembers,
  lastChapterId,
  initialPlanning = false,
  subscriptionStatus,
  projectTasks = [],
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
  lastChapterId?: string | null;
  initialPlanning?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  projectTasks?: Task[];
}) {
  const needsPaywall = subscriptionStatus === "trial_ended" || subscriptionStatus === "expired";
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [refining, setRefining] = useState(false);
  const [cassDrawerOpen, setCassDrawerOpen] = useState(initialPlanning && !needsPaywall);
  const [showTyIntro, setShowTyIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(TY_INTRO_KEY);
  });

  // Show PressFab once at least one chapter has been fully completed (retro done)
  const hasCompletedChapter = project.chapters.some((ch) => ch.retroCompletedAt);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyThread, setHistoryThread] = useState<ChatThread | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [decoItems, setDecoItems] = useState<DecoItem[]>([]);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware colors for the overview page
  const mastheadLabelColor  = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.38)";
  const northStarColor      = isDark ? "#c8a86b"                 : "rgba(22,19,15,0.55)";
  const mastheadDivider     = isDark
    ? "linear-gradient(90deg, rgba(200,168,107,0.25), rgba(200,168,107,0.06) 70%, transparent)"
    : "linear-gradient(90deg, rgba(0,0,0,0.15), rgba(0,0,0,0.04) 70%, transparent)";
  const projThreadFaintColor= isDark ? "rgba(200,168,107,0.3)"   : "rgba(0,0,0,0.25)";
  const projThreadBg        = isDark ? "rgba(200,168,107,0.04)"  : "rgba(0,0,0,0.02)";
  const projThreadBorder    = isDark ? "rgba(200,168,107,0.1)"   : "rgba(0,0,0,0.07)";
  const projThreadHoverBg   = isDark ? "rgba(200,168,107,0.08)"  : "rgba(0,0,0,0.05)";
  const projThreadHoverBdr  = isDark ? "rgba(200,168,107,0.18)"  : "rgba(0,0,0,0.12)";
  const projIconColor       = isDark ? "rgba(200,168,107,0.5)"   : "rgba(0,0,0,0.35)";
  const projLabelColor      = isDark ? "rgba(232,224,208,0.7)"   : "rgba(22,19,15,0.7)";
  const projDateColor       = isDark ? "rgba(200,168,107,0.45)"  : "rgba(0,0,0,0.35)";
  const projChevronColor    = isDark ? "rgba(200,168,107,0.35)"  : "rgba(0,0,0,0.25)";
  const emptyStateColor     = isDark ? "rgba(232,224,208,0.3)"   : "rgba(22,19,15,0.28)";

  // Scroll to the selected chapter whenever lastChapterId changes
  useEffect(() => {
    if (!lastChapterId) return;
    // Small delay ensures the DOM is fully painted before scrolling
    const t = setTimeout(() => {
      const el = document.getElementById(`chapter-${lastChapterId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [lastChapterId]);

  // Compute margin decoration positions based on total content height
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function recalc() {
      if (!el) return;
      const h = el.scrollHeight;
      const SPACING = 620;
      const START = 240;
      const built: DecoItem[] = [];
      let pos = START;
      let i = 0;
      while (pos < h - 160) {
        const p = DECO_PATTERN[i % DECO_PATTERN.length];
        built.push({ ...p, top: pos, key: i });
        pos += SPACING;
        i++;
      }
      setDecoItems(built);
    }

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDrawerForPlanning() {
    if (needsPaywall) {
      setPaywallOpen(true);
    } else {
      setCassDrawerOpen(true);
    }
  }

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={project.id}
        lastChapterId={lastChapterId}
        activeNav="story"
        mobileEyebrow="Overview"
        mobileTitle={project.name}
        onPlanChapters={openDrawerForPlanning}
      >
        {refining ? (
          <div style={{ background: "var(--background, #faf9f7)", flex: 1 }}>
            <ProjectArcRefiner project={project} onClose={() => setRefining(false)} />
          </div>
        ) : (
          /* ── The Story So Far ── */
          <div
            ref={wrapperRef}
            className="-mx-4 flex-1 lg:mx-0"
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(200,168,107,0.04) 0%, transparent 65%)",
              paddingBottom: "120px",
              position: "relative",
            }}
          >
            <style>{`
              @keyframes overviewPulse {
                0%, 100% { opacity: 0.4; transform: scale(0.85); }
                50% { opacity: 1; transform: scale(1.15); }
              }
            `}</style>

            {/* ── Margin decorations (desktop only) ── */}
            <div className="pointer-events-none hidden select-none lg:block" aria-hidden="true">
              {decoItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    position: "absolute",
                    top: `${item.top}px`,
                    // Left items: hang off the left edge via translateX
                    // Right items: anchor at the right margin's centre (calc(75% + 165px))
                    //   and use translateX(-50%) to centre the image on that point
                    ...(item.side === "left"
                      ? { left: 0, transform: `translateX(${item.tx}) rotate(${item.rotation}deg)` }
                      : { left: "calc(75% + 165px)", transform: `translateX(-50%) rotate(${item.rotation}deg)` }
                    ),
                    zIndex: 0,
                    opacity: 0.72,
                    filter: "drop-shadow(0 6px 16px rgba(28,14,0,0.22))",
                  }}
                >
                  {item.src === "cass" ? (
                    <div style={{ transform: "scale(1.8)", transformOrigin: "center center" }}>
                      <CassRecorder animState="idle" size="sm" />
                    </div>
                  ) : item.src === "ty" ? (
                    <div style={{ transform: "scale(1.4)", transformOrigin: "center center" }}>
                      <TypewriterRecorder animState="idle" size="sm" />
                    </div>
                  ) : item.src === "press" ? (
                    <div style={{ transform: "scale(1.6)", transformOrigin: "center center" }}>
                      <PressMonitor animState="idle" size="sm" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.src}
                      alt=""
                      width={item.w}
                      style={{ display: "block", width: `${item.w}px`, height: "auto" }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Reading column */}
            <div
              style={{
                maxWidth: "660px",
                margin: "0 auto",
                padding: "48px 28px 0",
              }}
            >

              {/* ── Masthead ── */}
              <header style={{ marginBottom: "52px" }}>
                <h1 style={{ fontFamily: "var(--font-cass)", fontSize: "clamp(32px, 5vw, 46px)", margin: 0, lineHeight: 1.2 }}>
                  <span style={{
                    display: "inline-block",
                    background: "#f5c84a",
                    color: "#1a0e00",
                    padding: "4px 16px 6px",
                    clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                    boxShadow: "2px 3px 8px rgba(0,0,0,0.4)",
                  }}>
                    {project.name}
                  </span>
                </h1>

                {project.northStar && (
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: northStarColor,
                      margin: "14px 0 0",
                      lineHeight: 1.65,
                      opacity: 0.85,
                    }}
                  >
                    &ldquo;{project.northStar}&rdquo;
                  </p>
                )}

                {/* Thin rule under masthead */}
                <div
                  style={{
                    height: "1px",
                    background: mastheadDivider,
                    marginTop: "28px",
                  }}
                />
              </header>

              {/* ── Project-level conversations ── */}
              {(() => {
                const projectThreads: ChatThread[] = [];
                if (project.projectKickoffConversation && project.projectKickoffCompletedAt) {
                  projectThreads.push({
                    id: "project-kickoff",
                    label: "Project Setup",
                    completedAt: project.projectKickoffCompletedAt,
                    messages: project.projectKickoffConversation,
                  });
                }
                project.planningConversations.forEach((session, i) => {
                  projectThreads.push({
                    id: `planning-${i}`,
                    label: "Chapter Planning",
                    completedAt: session.completedAt,
                    messages: session.messages,
                  });
                });
                if (projectThreads.length === 0) return null;
                return (
                  <div style={{ marginBottom: "52px" }}>
                    <p style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: projThreadFaintColor,
                      margin: "0 0 10px",
                    }}>
                      Project Conversations
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {projectThreads.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setHistoryThread(t)}
                          style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between",
                            background: projThreadBg,
                            border: `1px solid ${projThreadBorder}`,
                            borderRadius: "10px",
                            padding: "10px 14px",
                            cursor: "pointer", width: "100%", textAlign: "left",
                            transition: "background 0.15s, border-color 0.15s",
                            fontFamily: "'Literata', Georgia, serif",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = projThreadHoverBg;
                            e.currentTarget.style.borderColor = projThreadHoverBdr;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = projThreadBg;
                            e.currentTarget.style.borderColor = projThreadBorder;
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{
                              fontFamily: "'Literata', Georgia, serif",
                              fontSize: "13px",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                              color: projLabelColor,
                            }}>
                              {t.label}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{
                              fontFamily: "var(--font-cass)",
                              fontSize: "11px", color: projDateColor,
                            }}>
                              {new Date(t.completedAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                            </span>
                            <ChevronRight size={12} style={{ color: projChevronColor }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Chapter list ── */}
              {project.chapters.length > 0 ? (
                <div>
                  {project.chapters.map((chapter, i) => (
                    <ChapterEntry
                      key={chapter.id}
                      chapter={chapter}
                      index={i}
                      projectId={project.id}
                      isLast={i === project.chapters.length - 1}
                      onOpenThread={setHistoryThread}
                      chapterTasks={projectTasks.filter((t) => t.boardId === chapter.id)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: emptyStateColor,
                      lineHeight: 1.7,
                    }}
                  >
                    The first chapter hasn&apos;t started yet.
                    <br />
                    Use the button below to plan it.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── FAB — Press (after first chapter completed) or Ty ── */}
        {!refining && hasCompletedChapter && (
          <>
            {/* Mobile: plain + button */}
            <div className="md:hidden">
              <MobileFab onClick={() => {
                if (needsPaywall) { setPaywallOpen(true); return; }
                setCassDrawerOpen(true);
              }} />
            </div>
            {/* Desktop: animated Press avatar */}
            <div className="hidden md:block">
              <PressFab
                onClick={() => {
                  if (needsPaywall) { setPaywallOpen(true); return; }
                  setCassDrawerOpen(true);
                }}
                hoverText="Publish your story"
                teaserText="We've captured a great story together. Want help sharing it?"
              />
            </div>
          </>
        )}
        {!refining && !hasCompletedChapter && (
          <ShareFab onClick={() => needsPaywall ? setPaywallOpen(true) : setCassDrawerOpen(true)} />
        )}

      </ProjectShellFrame>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* ── Ty first-time story tab intro ── */}
      {showTyIntro && (
        <TyFirstStoryIntro
          onComplete={() => {
            localStorage.setItem(TY_INTRO_KEY, "1");
            setShowTyIntro(false);
          }}
        />
      )}

      {/* ── Chat history drawer ── */}
      <ChatHistoryDrawer
        thread={historyThread}
        onClose={() => setHistoryThread(null)}
      />

      {/* ── Cass Chronicle drawer ── */}
      <CassChronicleDrawer
        open={cassDrawerOpen}
        project={project}
        onClose={() => setCassDrawerOpen(false)}
      />

      <ProjectOverviewSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        project={project}
        currentUser={currentUser}
        members={projectMembers}
      />
    </>
  );
}
