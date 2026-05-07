"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutPanelTop, LogOut, Plus, Settings, SquareKanban } from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";
import { CreateChapterModal } from "@/components/projects/create-chapter-modal";

// ── Reusable nav dropdown ────────────────────────────────────────────────────

function NavDropdown({
  label,
  displayValue,
  options,
  onSelect,
  actionLabel,
  onAction,
  isOpen,
  onOpenChange,
}: {
  label: string;
  displayValue: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
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
        className="flex flex-col items-start text-left"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-0.5">
          {label}
        </span>
        <span className="flex items-center gap-1">
          <span className="max-w-[200px] truncate text-sm font-semibold leading-tight text-white">
            {displayValue}
          </span>
          <ChevronDown className="size-3 shrink-0 text-white/55" />
        </span>
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
                onMouseDown={() => {
                  onAction();
                  onOpenChange(false);
                }}
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
              onMouseDown={() => {
                onSelect(opt.value);
                onOpenChange(false);
              }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-black/5"
            >
              <span className="line-clamp-1">{opt.label}</span>
            </button>
          ))}
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
  onOpenSettings,
  activeNav,
  retroAvailable,
  onEndChapter,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  currentChapterId?: string | null;
  onOpenSettings: () => void;
  activeNav?: "overview" | "board";
  retroAvailable?: boolean;
  onEndChapter?: () => void;
}) {
  const router = useRouter();
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"project" | "chapter" | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const chapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;
  const chapterDisplayValue =
    chapterIndex >= 0 ? `Chapter ${chapterIndex + 1}` : "Story";

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const chapterOptions = [
    { value: "", label: "Story" },
    ...(currentProject?.chapters.map((ch, i) => ({
      value: ch.id,
      label: `Chapter ${i + 1}`,
    })) ?? []),
  ];

  return (
    <>
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

        {/* Row */}
        <div className="relative flex items-center gap-2 px-6 py-4">

          {/* Logo */}
          <Link
            href="/projects"
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-0.5 transition hover:bg-white/10"
          >
            <Image
              src="/icons/authored_by_icon_512.png"
              alt="The Shelf"
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-lg"
            />
          </Link>

          <div className="mx-2 h-5 w-px shrink-0 bg-white/20" />

          {/* Project selector */}
          <NavDropdown
            label="Currently reading"
            displayValue={currentProject?.name ?? "Select project"}
            options={projectOptions}
            onSelect={(id) => router.push(`/projects/${id}`)}
            actionLabel="New Project"
            onAction={() => router.push("/projects/new")}
            isOpen={openDropdown === "project"}
            onOpenChange={(open) => setOpenDropdown(open ? "project" : null)}
          />

          <div className="mx-2 h-5 w-px shrink-0 bg-white/20" />

          {/* Chapter selector */}
          <NavDropdown
            label="Chapter"
            displayValue={chapterDisplayValue}
            options={chapterOptions}
            onSelect={(val) => {
              if (!val) {
                router.push(`/projects/${currentProjectId}`);
              } else {
                router.push(`/projects/${currentProjectId}/chapters/${val}`);
              }
            }}
            actionLabel="New Chapter"
            onAction={() => setChapterModalOpen(true)}
            isOpen={openDropdown === "chapter"}
            onOpenChange={(open) => setOpenDropdown(open ? "chapter" : null)}
          />

          {/* Overview / Board nav — only when inside a chapter */}
          {currentChapterId && activeNav && (
            <>
              <div className="mx-1 h-5 w-px shrink-0 bg-white/20" />
              <div className="flex gap-1">
                <Link
                  href={`/projects/${currentProjectId}/chapters/${currentChapterId}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    activeNav === "overview"
                      ? "bg-white text-[var(--ink)]"
                      : "bg-white/15 text-white hover:bg-white/25",
                  )}
                >
                  <LayoutPanelTop className="size-3.5" />
                  Story
                </Link>
                <Link
                  href={`/projects/${currentProjectId}/chapters/${currentChapterId}/board`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    activeNav === "board"
                      ? "bg-white text-[var(--ink)]"
                      : "bg-white/15 text-white hover:bg-white/25",
                  )}
                >
                  <SquareKanban className="size-3.5" />
                  Board
                </Link>
              </div>
            </>
          )}

          {/* Chapter actions — grouped together on the right of nav */}
          <div className="mx-1 h-5 w-px shrink-0 bg-white/20" />
          <button
            type="button"
            onClick={() => setChapterModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
          >
            <Plus className="size-3" />
            New chapter
          </button>
          {retroAvailable && onEndChapter && (
            <button
              type="button"
              onClick={onEndChapter}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              End chapter
            </button>
          )}

          <div className="flex-1" />

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/15 hover:text-white"
          >
            <Settings className="size-4" />
          </button>

          {/* Logout */}
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

      <CreateChapterModal
        open={chapterModalOpen}
        project={currentProject ?? null}
        onClose={() => setChapterModalOpen(false)}
        onCreated={(chapterId) => {
          setChapterModalOpen(false);
          router.push(`/projects/${currentProjectId}/chapters/${chapterId}`);
          router.refresh();
        }}
      />
    </>
  );
}
