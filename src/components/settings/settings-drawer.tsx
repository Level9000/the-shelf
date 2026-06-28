"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { deleteChapterAction, deleteProjectAction, updateBoardOverviewFieldAction } from "@/lib/actions/project-actions";
import { deleteAccountAction } from "@/lib/actions/profile-actions";
import { logoutAction } from "@/lib/actions/auth-actions";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useTheme } from "@/lib/theme-context";
import { SettingsForm } from "@/components/settings/settings-form";
import { TapeButton } from "@/components/ui/tape-button";
import { getVoiceProfileSummaryAction } from "@/lib/actions/voice-profile-actions";
import { ToneVoiceRefinerDrawer } from "@/components/projects/tone-voice-refiner-chat";

// ── Section wrapper ───────────────────────────────────────────────────────────

function DrawerSection({ label, children, danger = false }: { label: string; children: React.ReactNode; danger?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div>
      <div style={{ padding: "20px 16px 8px" }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: danger ? "rgba(248,113,113,0.6)" : isDark ? "rgba(245,200,74,0.45)" : "rgba(160,100,10,0.55)",
        }}>
          {label}
        </span>
      </div>
      <div style={{ padding: "6px 16px 14px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Tone of voice section ────────────────────────────────────────────────────

function ToneOfVoiceSection({ projectId }: { projectId: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [voiceProfile, setVoiceProfile] = useState<string | null>(null);
  const [voiceProfileUpdatedAt, setVoiceProfileUpdatedAt] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getVoiceProfileSummaryAction(projectId)
      .then((res) => {
        setVoiceProfile(res.voiceProfile);
        setVoiceProfileUpdatedAt(res.voiceProfileUpdatedAt);
      })
      .catch(() => undefined);
  }, [projectId]);

  return (
    <DrawerSection label="Tone of Voice">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "13px",
          color: isDark ? "rgba(248,248,246,0.6)" : "rgba(26,14,0,0.6)",
          margin: 0,
          lineHeight: 1.55,
        }}>
          {voiceProfile
            ? "Cass writes every chapter in your calibrated voice."
            : "Refine how Cass writes your story, in your vocabulary, your phrasing."}
        </p>
        {voiceProfile && voiceProfileUpdatedAt && (
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.35)",
            margin: 0,
            textTransform: "uppercase",
          }}>
            Last refined {new Date(voiceProfileUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
        <TapeButton variant={voiceProfile ? "secondary" : "primary"} size="sm" onClick={() => setDrawerOpen(true)}>
          {voiceProfile ? "Edit voice profile" : "Create profile"}
        </TapeButton>
      </div>

      <ToneVoiceRefinerDrawer
        open={drawerOpen}
        projectId={projectId}
        onClose={() => setDrawerOpen(false)}
        onSaved={(profile) => {
          setVoiceProfile(profile);
          setVoiceProfileUpdatedAt(new Date().toISOString());
        }}
      />
    </DrawerSection>
  );
}

// ── Plan data (mirrors paywall-modal) ────────────────────────────────────────

const PLANS = [
  {
    id: "builderMonthly" as const,
    label: "Builder Monthly",
    price: "$12",
    period: "/month",
    description: "Full access, billed monthly.",
  },
  {
    id: "builderAnnual" as const,
    label: "Builder Annual",
    price: "$99",
    period: "/year",
    description: "Save 30% — billed once a year.",
    highlight: true,
  },
];

// Tape-flag "Best value" clip — matches paywall modal
const BEST_VALUE_CLIP = "polygon(4px 0%, calc(100% - 4px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 4px) 100%, 4px 100%, 0% 72%, 3px 48%, 0% 22%)";

function SubscribePicker() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedPlan, setSelectedPlan] = useState<"builderMonthly" | "builderAnnual">("builderAnnual");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        window.location.href = data.url;
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: "13px",
        color: "var(--muted)",
        margin: 0,
        lineHeight: 1.55,
      }}>
        Unlock unlimited chapters, Cass AI, voice capture, and more.
      </p>

      {/* Plan selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlan(plan.id)}
            style={{
              position: "relative",
              borderRadius: "14px",
              padding: "10px 14px",
              textAlign: "left",
              border: `1px solid ${selectedPlan === plan.id ? "var(--accent)" : "var(--border, rgba(128,128,128,0.2))"}`,
              background: selectedPlan === plan.id ? "var(--accent-soft)" : "var(--surface-raised, var(--surface))",
              cursor: "pointer",
              overflow: "hidden",
              transition: "border-color 0.15s, background 0.15s",
              width: "100%",
            }}
          >
            {plan.highlight && (
              <span style={{
                position: "absolute",
                top: "14px",
                right: "-14px",
                whiteSpace: "nowrap",
                padding: "2px 18px",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#3a2a0a",
                background: "#e8dfc0",
                transform: "rotate(45deg)",
                clipPath: BEST_VALUE_CLIP,
                fontFamily: "var(--font-cass)",
                fontWeight: 700,
              }}>
                Best value
              </span>
            )}
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", fontWeight: 700, color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.9)", margin: "0 0 2px" }}>
              {plan.label}
            </p>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: "0 0 2px" }}>
              {plan.price}
              <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--muted)" }}>{plan.period}</span>
            </p>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "11px", color: "var(--muted)", margin: 0 }}>
              {plan.description}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>
      )}

      <TapeButton variant="primary" size="sm" onClick={handleSubscribe} disabled={isPending} className="w-full justify-center">
        {isPending ? "Redirecting…" : `Start ${selectedPlan === "builderAnnual" ? "Annual" : "Monthly"} Subscription`}
      </TapeButton>
    </div>
  );
}

// ── Goal editor sub-component ─────────────────────────────────────────────────

function GoalEditor({ projectId, boardId, initialValue, isDark }: { projectId: string; boardId: string; initialValue: string; isDark: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    if (!boardId || !value.trim()) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateBoardOverviewFieldAction({ projectId, boardId, field: "goal", value: value.trim() });
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const inputColor = isDark ? "rgba(248,248,246,0.85)" : "rgba(26,14,0,0.85)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        placeholder="What's the focus of this chapter?"
        rows={3}
        style={{
          width: "100%", background: inputBg, border: "1px solid rgba(200,168,107,0.25)",
          borderRadius: "10px", padding: "10px 12px", boxSizing: "border-box",
          fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: "1.55",
          color: inputColor, outline: "none", resize: "vertical", caretColor: "#c8a86b",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.55)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)"; }}
      />
      {error && <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>}
      <TapeButton
        variant={saved ? "secondary" : "primary"}
        size="sm"
        onClick={handleSave}
        disabled={isPending || !value.trim() || value.trim() === initialValue}
        className="w-full justify-center"
      >
        {isPending ? "Saving…" : saved ? "Saved ✓" : "Save focus"}
      </TapeButton>
    </div>
  );
}

// ── Settings content ──────────────────────────────────────────────────────────

export function SettingsContent({
  profile,
  hasActiveSubscription,
  currentProjectId,
  currentProjectName,
  currentChapterId,
  currentChapterName,
  currentBoardId,
  currentBoardGoal,
  currentBoardCreatedAt,
  onClose,
}: {
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
  currentBoardId?: string | null;
  currentBoardGoal?: string | null;
  currentBoardCreatedAt?: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [page, setPage] = useState<"project" | "app">("project");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [deleteProjectInput, setDeleteProjectInput] = useState("");
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [isDeletingProject, startDeleteProjectTransition] = useTransition();

  // Subscription management
  const [isOpeningPortal, startPortalTransition] = useTransition();
  const [portalError, setPortalError] = useState<string | null>(null);

  // Account deletion
  const [confirmingDeleteAccount, setConfirmingDeleteAccount] = useState(false);
  const [isDeletingAccount, startDeleteAccountTransition] = useTransition();
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  function handleOpenPortal() {
    setPortalError(null);
    startPortalTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setPortalError(data.error ?? "Could not open billing portal.");
          return;
        }
        window.location.href = data.url;
      } catch {
        setPortalError("Something went wrong. Please try again.");
      }
    });
  }

  function handleDeleteAccount() {
    startDeleteAccountTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (err) {
        setDeleteAccountError(err instanceof Error ? err.message : "Failed to delete account.");
      }
    });
  }

  // Theme-aware colors
  const labelColor  = isDark ? "rgba(248,248,246,0.35)"  : "rgba(26,14,0,0.38)";
  const bodyColor   = isDark ? "rgba(248,248,246,0.6)"   : "rgba(26,14,0,0.65)";
  const strongColor = isDark ? "#f8f8f6"                 : "rgba(26,14,0,0.9)";
  const inputBg     = isDark ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.04)";
  const inputColor  = isDark ? "rgba(248,248,246,0.85)"  : "rgba(26,14,0,0.85)";
  const themeLabelColor = isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)";

  function handleDeleteProject() {
    if (!currentProjectId) return;
    setDeleteProjectError(null);
    startDeleteProjectTransition(async () => {
      try {
        await deleteProjectAction({ projectId: currentProjectId });
        onClose?.();
        router.push("/projects");
        router.refresh();
      } catch (err) {
        setDeleteProjectError(err instanceof Error ? err.message : "Failed to delete the project.");
      }
    });
  }

  function handleDeleteChapter() {
    if (!currentProjectId || !currentChapterId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteChapterAction({ projectId: currentProjectId, boardId: currentChapterId });
        onClose?.();
        router.push(`/projects/${currentProjectId}`);
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete the chapter.");
      }
    });
  }

  const hasDangerZone = Boolean(currentProjectId && (currentChapterId || currentProjectName));

  return (
    <div>

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--stroke)", padding: "0 16px" }}>
        {(["project", "app"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${page === p ? "#f5c84a" : "transparent"}`,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: page === p ? "#f5c84a" : isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: "-1px",
            }}
          >
            {p === "project" ? "Project" : "App"}
          </button>
        ))}
      </div>

      {/* ── Project Settings page ── */}
      {page === "project" && (
        <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {currentProjectId && (
            <div style={{ marginLeft: "-16px", marginRight: "-16px" }}>
              <ToneOfVoiceSection projectId={currentProjectId} />
            </div>
          )}
          {currentProjectId && currentChapterId ? (
            <>
              {/* ── Chapter countdown card ── */}
              {(() => {
                const SPRINT_DAYS = 14;
                const daysOpen = currentBoardCreatedAt
                  ? Math.floor((Date.now() - new Date(currentBoardCreatedAt).getTime()) / 86_400_000)
                  : null;
                const daysLeft = daysOpen !== null ? SPRINT_DAYS - daysOpen : null;

                // Tone: 0-9 days → on track (green), 10-13 → winding down (gold), 14+ → overdue (red)
                const tone =
                  daysOpen === null ? "neutral" :
                  daysOpen < 10 ? "green" :
                  daysOpen < 14 ? "gold" :
                  "red";

                const toneColors = {
                  neutral: { bg: isDark ? "rgba(255,255,255,0.03)" : "rgba(26,14,0,0.03)", border: "rgba(200,168,107,0.2)", bar: "#c8a86b", barBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.07)" },
                  green:   { bg: isDark ? "rgba(110,231,183,0.06)" : "rgba(110,231,183,0.1)", border: "rgba(110,231,183,0.25)", bar: "#6ee7b7", barBg: isDark ? "rgba(110,231,183,0.08)" : "rgba(110,231,183,0.12)" },
                  gold:    { bg: isDark ? "rgba(245,200,74,0.07)" : "rgba(245,200,74,0.1)", border: "rgba(245,200,74,0.3)", bar: "#f5c84a", barBg: isDark ? "rgba(245,200,74,0.1)" : "rgba(245,200,74,0.14)" },
                  red:     { bg: isDark ? "rgba(248,113,113,0.07)" : "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", bar: "#f87171", barBg: isDark ? "rgba(248,113,113,0.1)" : "rgba(248,113,113,0.12)" },
                };
                const c = toneColors[tone];

                const headline =
                  daysOpen === null ? "Chapter in progress" :
                  daysLeft !== null && daysLeft > 7 ? `${daysLeft} days left in this chapter` :
                  daysLeft !== null && daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left — time to wrap up` :
                  daysLeft === 0 ? "Chapter ends today" :
                  `Chapter ran ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) === 1 ? "" : "s"} over`;

                const subtext =
                  daysOpen === null ? "We recommend 2-week chapters with a recap at the end." :
                  tone === "green" ? `You're ${daysOpen} day${daysOpen === 1 ? "" : "s"} into a 14-day chapter. Stay focused on your chapter goal.` :
                  tone === "gold" ? "You're in the home stretch. Start thinking about what to carry over and what to close out." :
                  tone === "red" ? "Your chapter has run long. A chapter recap helps you reflect and carry momentum forward." :
                  "";

                const progressPct = daysOpen !== null ? Math.min(100, Math.round((daysOpen / SPRINT_DAYS) * 100)) : 0;

                return (
                  <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "14px", padding: "16px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "10px" }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)", margin: 0 }}>
                        Chapter Health
                      </p>
                      {daysOpen !== null && (
                        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: isDark ? "rgba(248,248,246,0.4)" : "rgba(26,14,0,0.4)", margin: 0 }}>
                          Day {daysOpen} of {SPRINT_DAYS}
                        </p>
                      )}
                    </div>

                    {/* Progress bar */}
                    {daysOpen !== null && (
                      <div style={{ height: "4px", borderRadius: "2px", background: c.barBg, marginBottom: "12px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: c.bar, borderRadius: "2px", transition: "width 0.4s ease" }} />
                      </div>
                    )}

                    {/* Headline */}
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", fontWeight: 600, color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: "0 0 5px", lineHeight: 1.35 }}>
                      {headline}
                    </p>
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", lineHeight: 1.6, color: isDark ? "rgba(248,248,246,0.5)" : "rgba(26,14,0,0.5)", margin: 0 }}>
                      {subtext}
                    </p>
                  </div>
                );
              })()}

              {/* Chapter focus / goal */}
              <div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isDark ? "rgba(245,200,74,0.45)" : "rgba(160,100,10,0.55)", marginBottom: "6px" }}>
                  Chapter Focus
                </p>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  This appears as a reminder at the top of your board.
                </p>
                <GoalEditor
                  projectId={currentProjectId}
                  boardId={currentBoardId ?? ""}
                  initialValue={currentBoardGoal ?? ""}
                  isDark={isDark}
                />
              </div>
              {/* Chapter name — read only */}
              <div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.25)" : "rgba(26,14,0,0.28)", marginBottom: "6px" }}>Chapter</p>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>{currentChapterName ?? "—"}</p>
              </div>
              {/* Project name — read only */}
              <div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isDark ? "rgba(248,248,246,0.25)" : "rgba(26,14,0,0.28)", marginBottom: "6px" }}>Project</p>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0 }}>{currentProjectName ?? "—"}</p>
              </div>

              {/* ── Danger zone — delete chapter / delete project ── */}
              {hasDangerZone && (
                <div style={{ marginLeft: "-16px", marginRight: "-16px" }}>
                  <div style={{ padding: "20px 16px 8px" }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(248,113,113,0.6)",
                    }}>
                      Danger Zone
                    </span>
                  </div>
                  <div style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Delete chapter */}
                    {currentChapterId && (
                      <div>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "11px", color: labelColor, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Chapter
                        </p>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: bodyColor, margin: "0 0 12px", lineHeight: 1.55 }}>
                          <span style={{ color: strongColor, fontWeight: 600 }}>{currentChapterName ?? "Untitled chapter"}</span>
                          {" "}— removes its board, columns, and all tasks permanently.
                        </p>
                        {confirmingDelete ? (
                          <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", fontWeight: 600, color: "#f87171", margin: "0 0 4px" }}>Delete this chapter?</p>
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(248,113,113,0.65)", margin: "0 0 12px" }}>This action cannot be undone.</p>
                            {deleteError && (
                              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: "0 0 10px" }}>{deleteError}</p>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                              <TapeButton variant="danger" size="sm" onClick={handleDeleteChapter} disabled={isDeleting} className="w-full justify-center">{isDeleting ? "Deleting…" : "Delete chapter"}</TapeButton>
                              <TapeButton variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>Cancel</TapeButton>
                            </div>
                          </div>
                        ) : (
                          <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDelete(true)} className="w-full justify-center">Delete chapter</TapeButton>
                        )}
                      </div>
                    )}


                    {/* Delete project */}
                    {currentProjectName && (
                      <div>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "11px", color: labelColor, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Project
                        </p>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: bodyColor, margin: "0 0 12px", lineHeight: 1.55 }}>
                          <span style={{ color: strongColor, fontWeight: 600 }}>{currentProjectName}</span>
                          {" "}— permanently deletes all chapters, boards, and tasks.
                        </p>
                        {confirmingDeleteProject ? (
                          <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", fontWeight: 600, color: "#f87171", margin: "0 0 2px" }}>Type the project name to confirm:</p>
                            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: "rgba(248,113,113,0.7)", margin: "0 0 10px" }}>{currentProjectName}</p>
                            <input
                              type="text"
                              value={deleteProjectInput}
                              onChange={(e) => setDeleteProjectInput(e.target.value)}
                              placeholder={currentProjectName}
                              style={{
                                width: "100%",
                                background: inputBg,
                                border: "1px solid rgba(248,113,113,0.22)",
                                borderRadius: "8px",
                                padding: "9px 12px",
                                fontFamily: "'Lora', Georgia, serif",
                                fontSize: "13px",
                                color: inputColor,
                                outline: "none",
                                boxSizing: "border-box",
                                marginBottom: "12px",
                              }}
                            />
                            {deleteProjectError && (
                              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: "0 0 10px" }}>{deleteProjectError}</p>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                              <TapeButton variant="danger" size="sm" onClick={handleDeleteProject} disabled={isDeletingProject || deleteProjectInput !== currentProjectName} className="w-full justify-center">{isDeletingProject ? "Deleting…" : "Delete project"}</TapeButton>
                              <TapeButton variant="ghost" size="sm" onClick={() => { setConfirmingDeleteProject(false); setDeleteProjectInput(""); setDeleteProjectError(null); }} disabled={isDeletingProject}>Cancel</TapeButton>
                            </div>
                          </div>
                        ) : (
                          <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDeleteProject(true)} className="w-full justify-center">Delete project</TapeButton>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "var(--muted)", margin: 0 }}>
              Open a project chapter to see its settings here.
            </p>
          )}
        </div>
      )}

      {/* ── App Settings page ── */}
      {page === "app" && <>

      {/* ── Appearance ── */}
      <DrawerSection label="Appearance">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* LIGHT tape label */}
            <span
              onClick={() => setTheme("light")}
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "18px",
                fontWeight: 700,
                padding: "5px 14px",
                background: theme === "light" ? "#f5c84a" : "#e8dfc0",
                clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                boxShadow: "2px 1px 5px rgba(0,0,0,0.35)",
                color: theme === "light" ? "#1a0e00" : "#9a8450",
                cursor: "pointer",
                userSelect: "none",
                transition: "color 0.28s, background 0.28s",
              }}
            >
              LIGHT
            </span>

            {/* Pill toggle — on = dark */}
            <div
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{
                position: "relative",
                width: "48px", height: "26px",
                background: theme === "dark" ? "#1e1608" : "#e0dbd2",
                borderRadius: "13px",
                border: `1.5px solid ${theme === "dark" ? "#c8880a" : "rgba(26,14,0,0.18)"}`,
                boxShadow: theme === "dark"
                  ? "inset 0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(200,136,10,0.25), 0 0 20px rgba(200,120,0,0.12)"
                  : "inset 0 2px 4px rgba(0,0,0,0.07)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.3s, border-color 0.3s",
              }}
            >
              <div style={{
                position: "absolute",
                top: "3px", left: "3px",
                width: "18px", height: "18px",
                borderRadius: "50%",
                background: theme === "dark"
                  ? "radial-gradient(circle at 35% 30%, #ffd060, #c87010)"
                  : "radial-gradient(circle at 35% 30%, #c8b880, #7a6030)",
                border: "1px solid #5a4820",
                boxShadow: theme === "dark"
                  ? "0 2px 5px rgba(0,0,0,0.6), 0 0 8px rgba(255,180,30,0.7), inset 0 1px 0 rgba(255,255,200,0.3)"
                  : "0 2px 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
                transform: theme === "dark" ? "translateX(22px)" : "translateX(0)",
                transition: "transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), background 0.28s, box-shadow 0.28s",
              }} />
            </div>

            {/* DARK tape label */}
            <span
              onClick={() => setTheme("dark")}
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "18px",
                fontWeight: 700,
                padding: "5px 14px",
                background: theme === "dark" ? "#f5c84a" : "#e8dfc0",
                clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                boxShadow: "-2px 1px 5px rgba(0,0,0,0.35)",
                color: theme === "dark" ? "#1a0e00" : "#9a8450",
                cursor: "pointer",
                userSelect: "none",
                transition: "color 0.28s, background 0.28s",
              }}
            >
              DARK
            </span>
          </div>
        </div>
      </DrawerSection>

      {/* ── Profile ── */}
      <SettingsForm profile={profile} />

      {/* ── Legal ── */}
      <DrawerSection label="Legal">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Link
              href="/terms"
              target="_blank"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px",
                color: isDark ? "rgba(248,248,246,0.65)" : "rgba(26,14,0,0.65)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px",
                color: isDark ? "rgba(248,248,246,0.65)" : "rgba(26,14,0,0.65)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Privacy Policy
            </Link>
          </div>
          {profile.termsAcceptedAt && (
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "11px",
              color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)",
              margin: 0,
            }}>
              Accepted on {new Date(profile.termsAcceptedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
      </DrawerSection>

      {/* ── Subscription ── */}
      <DrawerSection label="Subscription">
        {hasActiveSubscription ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "13px",
              color: isDark ? "rgba(248,248,246,0.6)" : "rgba(26,14,0,0.6)",
              margin: 0,
              lineHeight: 1.55,
            }}>
              Manage your billing, update your payment method, or cancel your subscription.
            </p>
            {portalError && (
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{portalError}</p>
            )}
            <TapeButton variant="secondary" size="sm" onClick={handleOpenPortal} disabled={isOpeningPortal}>
              {isOpeningPortal ? "Opening portal…" : "Manage subscription"}
            </TapeButton>
          </div>
        ) : (
          <SubscribePicker />
        )}
      </DrawerSection>

      {/* ── Delete account — always shown in danger zone ── */}
      <div>
        <div style={{ padding: "18px 16px 6px" }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(248,113,113,0.6)",
          }}>
            Account
          </span>
        </div>
        <div style={{ padding: "10px 16px 14px" }}>
          {confirmingDeleteAccount ? (
            <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", fontWeight: 600, color: "#f87171", margin: "0 0 6px" }}>
                Delete your account?
              </p>
              {hasActiveSubscription && (
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(248,113,113,0.75)", margin: "0 0 10px", lineHeight: 1.55 }}>
                  Your active subscription will be cancelled immediately and your account and all data will be permanently deleted.
                </p>
              )}
              {!hasActiveSubscription && (
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(248,113,113,0.65)", margin: "0 0 10px", lineHeight: 1.55 }}>
                  All your projects, chapters, and data will be permanently deleted. This cannot be undone.
                </p>
              )}
              {deleteAccountError && (
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: "0 0 10px" }}>{deleteAccountError}</p>
              )}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <TapeButton variant="secondary" size="sm" onClick={() => { setConfirmingDeleteAccount(false); setDeleteAccountError(null); }} disabled={isDeletingAccount}>
                  Cancel
                </TapeButton>
                <TapeButton variant="danger" size="sm" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                  {isDeletingAccount ? "Deleting…" : "Delete my account"}
                </TapeButton>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "13px", color: isDark ? "rgba(248,248,246,0.55)" : "rgba(26,14,0,0.55)", margin: 0, lineHeight: 1.55 }}>
                {hasActiveSubscription
                  ? "Permanently delete your account and cancel your subscription."
                  : "Permanently delete your account and all your data."}
              </p>
              <TapeButton variant="danger" size="sm" onClick={() => setConfirmingDeleteAccount(true)}>
                Delete account
              </TapeButton>
            </div>
          )}
        </div>
      </div>

      </>}

    </div>
  );
}

// ── Sign out footer button ────────────────────────────────────────────────────

function SignOutButton() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.35)",
          padding: "0",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.7)" : "rgba(26,14,0,0.75)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.35)"; }}
      >
        Sign out
      </button>
    </form>
  );
}

// ── Drawer shell ──────────────────────────────────────────────────────────────

export function SettingsDrawer({
  open,
  profile,
  hasActiveSubscription,
  onClose,
  currentProjectId,
  currentProjectName,
  currentChapterId,
  currentChapterName,
  currentBoardId,
  currentBoardGoal,
  currentBoardCreatedAt,
}: {
  open: boolean;
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  onClose: () => void;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
  currentBoardId?: string | null;
  currentBoardGoal?: string | null;
  currentBoardCreatedAt?: string | null;
}) {
  return (
    <SideDrawer open={open} title="" onClose={onClose} side="right" footer={<SignOutButton />}>
      <SettingsContent
        profile={profile}
        hasActiveSubscription={hasActiveSubscription}
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        currentChapterId={currentChapterId}
        currentChapterName={currentChapterName}
        currentBoardId={currentBoardId}
        currentBoardGoal={currentBoardGoal}
        currentBoardCreatedAt={currentBoardCreatedAt}
        onClose={onClose}
      />
    </SideDrawer>
  );
}
