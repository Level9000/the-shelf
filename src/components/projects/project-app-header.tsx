"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, LogOut, Plus, Settings, Sparkles, SquareKanban } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

// ── Breadcrumb dropdown ───────────────────────────────────────────────────────
// Single-line trigger (just value + chevron) with the same portal dropdown panel.

function BreadcrumbDropdown({
  displayValue,
  options,
  onSelect,
  actionLabel,
  onAction,
  bottomActionLabel,
  onBottomAction,
  isOpen,
  onOpenChange,
}: {
  displayValue: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  bottomActionLabel?: string;
  onBottomAction?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [isOpen]);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        onBlur={() => setTimeout(() => onOpenChange(false), 150)}
        className="flex items-center gap-1 text-sm font-semibold text-white transition hover:text-white/70"
      >
        <span className="max-w-[180px] truncate">{displayValue}</span>
        <ChevronDown className="size-3 shrink-0 text-white/45" />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[220px] overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl shadow-black/25"
        >
          {actionLabel && onAction && (
            <>
              <button
                type="button"
                onMouseDown={() => { onAction(); onOpenChange(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-black/5"
              >
                <Plus className="size-3.5 shrink-0" />
                {actionLabel}
              </button>
              <div className="mx-3 border-t border-black/8" />
            </>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => { onSelect(opt.value); onOpenChange(false); }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-black/5"
            >
              <span className="line-clamp-1">{opt.label}</span>
            </button>
          ))}
          {bottomActionLabel && onBottomAction && (
            <>
              <div className="mx-3 border-t border-black/8" />
              <button
                type="button"
                onMouseDown={() => { onBottomAction(); onOpenChange(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-black/5"
              >
                <Sparkles className="size-3.5 shrink-0" />
                {bottomActionLabel}
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Main header ──────────────────────────────────────────────────────────────

export function ProjectAppHeader({
  projects,
  currentProjectId,
  currentChapterId,
  navChapterId,
  onOpenSettings,
  activeNav,
  retroAvailable,
  onEndChapter,
  onPlanChapters,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  currentChapterId?: string | null;
  /** The chapter to link Story/Board tabs to (falls back to currentChapterId) */
  navChapterId?: string | null;
  onOpenSettings: () => void;
  activeNav?: "overview" | "story" | "board";
  retroAvailable?: boolean;
  onEndChapter?: () => void;
  onPlanChapters?: () => void;
}) {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<"project" | "chapter" | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const chapterIndex     = currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;
  const navChapterIndex  = currentProject?.chapters.findIndex((ch) => ch.id === navChapterId) ?? -1;
  const chapterDisplayValue =
    chapterIndex    >= 0 ? `Chapter ${chapterIndex + 1}` :
    navChapterIndex >= 0 ? `Chapter ${navChapterIndex + 1}` : "Select";
  const effectiveNavChapterId = navChapterId ?? currentChapterId;
  const hasChapter = Boolean(effectiveNavChapterId);

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const chapterOptions = (currentProject?.chapters.map((ch, i) => ({
    value: ch.id,
    label: `Chapter ${i + 1}`,
  })) ?? []) as { value: string; label: string }[];

  return (
    <div className="relative shrink-0 overflow-hidden">
      {/* Paper texture */}
      <Image
        src="/images/paper.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-top"
        priority
      />
      {/* Scrim for legibility */}
      <div className="absolute inset-0 bg-black/42" />

      {/* Three-zone row */}
      <div className="relative flex items-center px-5 py-3">

        {/* ── Left: logo + breadcrumb ── */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/projects"
            className="flex shrink-0 items-center rounded-lg p-0.5 transition hover:bg-white/10"
          >
            <Image
              src="/icons/authored_by_icon_512.png"
              alt="The Shelf"
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
          </Link>

          <div className="h-4 w-px shrink-0 bg-white/20" />

          {/* Project selector */}
          <BreadcrumbDropdown
            displayValue={currentProject?.name ?? "Select project"}
            options={projectOptions}
            onSelect={(id) => router.push(`/projects/${id}`)}
            actionLabel="New Project"
            onAction={() => router.push("/projects/new")}
            isOpen={openDropdown === "project"}
            onOpenChange={(open) => setOpenDropdown(open ? "project" : null)}
          />

          {/* Breadcrumb separator */}
          <span className="select-none text-sm text-white/30">›</span>

          {/* Chapter selector */}
          <BreadcrumbDropdown
            displayValue={chapterDisplayValue}
            options={chapterOptions}
            onSelect={(val) => router.push(`/projects/${currentProjectId}/chapters/${val}`)}
            bottomActionLabel="Plan new chapters"
            onBottomAction={() => onPlanChapters?.()}
            isOpen={openDropdown === "chapter"}
            onOpenChange={(open) => setOpenDropdown(open ? "chapter" : null)}
          />
        </div>

        {/* ── Center: unified tab strip — always Chronicle › Story › Board ── */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="inline-flex gap-0.5 rounded-full bg-white/10 p-1">

            <Link
              href={`/projects/${currentProjectId}${effectiveNavChapterId ? `?chapter=${effectiveNavChapterId}` : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                activeNav === "overview"
                  ? "bg-white text-[var(--ink)]"
                  : "text-white/75 hover:bg-white/15 hover:text-white",
              )}
            >
              <BookOpen className="size-3.5" />
              Chronicle
            </Link>

            <Link
              href={hasChapter
                ? `/projects/${currentProjectId}/chapters/${effectiveNavChapterId}`
                : "#"}
              aria-disabled={!hasChapter}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                !hasChapter && "pointer-events-none opacity-35",
                activeNav === "story"
                  ? "bg-white text-[var(--ink)]"
                  : "text-white/75 hover:bg-white/15 hover:text-white",
              )}
            >
              <BookOpen className="size-3.5" />
              Story
            </Link>

            <Link
              href={hasChapter
                ? `/projects/${currentProjectId}/chapters/${effectiveNavChapterId}/board`
                : "#"}
              aria-disabled={!hasChapter}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                !hasChapter && "pointer-events-none opacity-35",
                activeNav === "board"
                  ? "bg-white text-[var(--ink)]"
                  : "text-white/75 hover:bg-white/15 hover:text-white",
              )}
            >
              <SquareKanban className="size-3.5" />
              Board
            </Link>

          </div>
        </div>

        {/* ── Right: chapter action + settings + logout ── */}
        <div className="ml-auto flex shrink-0 items-center gap-1">

          {retroAvailable && onEndChapter && (
            <button
              type="button"
              onClick={onEndChapter}
              className="mr-1 flex shrink-0 items-center rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              End chapter early
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/15 hover:text-white"
          >
            <Settings className="size-4" />
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/15 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
