"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { deleteChapterAction, deleteProjectAction } from "@/lib/actions/project-actions";
import { deleteAccountAction } from "@/lib/actions/profile-actions";
import { logoutAction } from "@/lib/actions/auth-actions";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useTheme } from "@/lib/theme-context";
import { SettingsForm } from "@/components/settings/settings-form";
import { TapeButton } from "@/components/ui/tape-button";

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

// ── Settings content ──────────────────────────────────────────────────────────

export function SettingsContent({
  profile,
  hasActiveSubscription,
  currentProjectId,
  currentProjectName,
  currentChapterId,
  currentChapterName,
  onClose,
}: {
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
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

      {/* ── Danger zone ── */}
      {hasDangerZone && (
        <div>
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
}: {
  open: boolean;
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  onClose: () => void;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentChapterId?: string | null;
  currentChapterName?: string | null;
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
        onClose={onClose}
      />
    </SideDrawer>
  );
}
