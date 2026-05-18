"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BookOpen,
  CheckCircle2,
  MessageSquare,
  PencilLine,
  Save,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board, Chapter, Task, BoardColumn } from "@/types";
import { updateBoardOverviewAction } from "@/lib/actions/project-actions";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { CassShareChat, type Phase as CassPhase } from "@/components/cass/CassShareChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

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
          lineHeight: "1.7",
          color: "#e8e0d0",
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

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  projectName,
  northStar,
  accumulativeStory,
  chapters,
  onRefine,
  onStartRetro,
  onEndChapter,
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
  const router = useRouter();

  const doneColumnId = columns?.find(
    (col) => col.name.toLowerCase() === "done",
  )?.id;
  const allTasksDone =
    tasks !== undefined &&
    tasks.length > 0 &&
    tasks.every((t) => t.columnId === doneColumnId);
const retroAvailable =
    Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;
  const retroDone = Boolean(board.retroCompletedAt);

  type EditableField = "goal" | "whyItMatters" | "successLooksLike" | "doneDefinition";

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [cassPhase, setCassPhase] = useState<CassPhase | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!retroDone) return;
    const t = setTimeout(() => setBubbleVisible(true), 900);
    return () => clearTimeout(t);
  }, [retroDone]);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    goal: board.goal ?? "",
    whyItMatters: board.whyItMatters ?? "",
    successLooksLike: board.successLooksLike ?? "",
    doneDefinition: board.doneDefinition ?? "",
  });

  function handleChange(field: EditableField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCancelEdit() {
    setForm({
      goal: board.goal ?? "",
      whyItMatters: board.whyItMatters ?? "",
      successLooksLike: board.successLooksLike ?? "",
      doneDefinition: board.doneDefinition ?? "",
    });
    setError(null);
    setEditingField(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBoardOverviewAction({
          projectId,
          boardId: board.id,
          name: board.name,
          ...form,
        });
        setEditingField(null);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save the chapter overview.",
        );
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6">

      {/* Mobile: north star — project identity at a glance */}
      {northStar && (
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--ink)] px-5 py-4 lg:hidden">
          <div className="absolute right-4 top-3 opacity-[0.07]">
            <Sparkles className="size-14" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
            {projectName ? `${projectName} · ` : ""}North star
          </p>
          <p className="mt-1.5 text-sm font-semibold italic leading-6 text-white">
            &ldquo;{northStar}&rdquo;
          </p>
        </div>
      )}

      {!retroDone && retroAvailable && allTasksDone && onStartRetro && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onStartRetro}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition duration-200 hover:-translate-y-0.5"
          >
            <BookOpen className="size-4" />
            All done — write the story
          </button>
        </div>
      )}

      <div className="grid items-start gap-4">
        {/* Left: combined chapter overview card */}
        <div className="flex flex-col gap-4">
        <article className="surface-card hairline rounded-[1.75rem] overflow-hidden">

          {/* Story section — shown only after retro is complete */}
          {retroDone && board.chapterStory && (
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                  <div className="h-3 shrink-0 bg-violet-200" />
                  <div className="flex flex-1 items-center justify-center bg-violet-100">
                    <span className="text-[10px] font-bold tracking-wide text-violet-900/60">Story</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">How it went</h3>
                  <p className="text-sm text-[var(--muted)]">The story of this chapter.</p>
                </div>
              </div>
              <p className="mt-4 text-sm italic leading-7 text-[var(--ink)] sm:text-base">
                {board.chapterStory}
              </p>
              {/* Share button — opens the share drawer */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShareDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85"
                >
                  <Share2 className="size-3.5" />
                  Share this story
                </button>
              </div>
            </div>
          )}

          {/* What — the bet */}
          <div className={cn("border-t border-black/6", !(retroDone && board.chapterStory) && "border-t-0")}>
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-yellow-200" />
                <div className="flex flex-1 items-center justify-center bg-yellow-100">
                  <span className="text-[10px] font-bold tracking-wide text-yellow-900/60">What</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What's the bet that we made?" : "What's the bet we're making?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The core hypothesis we're acting on this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "goal" && (
                <button
                  type="button"
                  onClick={() => setEditingField("goal")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit chapter goal"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "goal" ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <Textarea
                  value={form.goal}
                  onChange={(event) => handleChange("goal", event.target.value)}
                  placeholder="What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                {error && editingField === "goal" && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 px-5 pb-5 text-sm leading-7 text-[var(--muted)] sm:px-6 sm:pb-6 sm:text-base">
                {copyOrFallback(
                  board.goal,
                  "What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds.",
                )}
              </p>
            )}
          </div>

          {/* Why — urgency and stakes */}
          <div className="border-t border-black/6">
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-blue-200" />
                <div className="flex flex-1 items-center justify-center bg-blue-100">
                  <span className="text-[10px] font-bold tracking-wide text-blue-900/60">Why</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "Why did this matter at the time?" : "Why does this matter right now?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The urgency and stakes behind this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "whyItMatters" && (
                <button
                  type="button"
                  onClick={() => setEditingField("whyItMatters")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit why this chapter matters"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "whyItMatters" ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <Textarea
                  value={form.whyItMatters}
                  onChange={(event) => handleChange("whyItMatters", event.target.value)}
                  placeholder="What's the window? What's the pressure? Why is this the right chapter to run right now?"
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                {error && editingField === "whyItMatters" && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 px-5 pb-5 text-sm leading-7 text-[var(--muted)] sm:px-6 sm:pb-6 sm:text-base">
                {copyOrFallback(
                  board.whyItMatters,
                  "What's the window? What's the pressure? Why is this the right chapter to run right now?",
                )}
              </p>
            )}
          </div>

          {/* How — conditions for success */}
          <div className="border-t border-black/6">
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-pink-200" />
                <div className="flex flex-1 items-center justify-center bg-pink-100">
                  <span className="text-[10px] font-bold tracking-wide text-pink-900/60">How</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What needed to be true?" : "What has to be true?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The conditions that need to hold for this chapter to work.
                </p>
              </div>
              {!retroDone && editingField !== "successLooksLike" && (
                <button
                  type="button"
                  onClick={() => setEditingField("successLooksLike")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit what success looks like"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "successLooksLike" ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <Textarea
                  value={form.successLooksLike}
                  onChange={(event) => handleChange("successLooksLike", event.target.value)}
                  placeholder="List the conditions that need to hold. Each one is something the board can work toward directly."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                {error && editingField === "successLooksLike" && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 px-5 pb-5 text-sm leading-7 text-[var(--muted)] sm:px-6 sm:pb-6 sm:text-base">
                {copyOrFallback(
                  board.successLooksLike,
                  "List the conditions that need to hold. Each one is something the board can work toward directly.",
                )}
              </p>
            )}
          </div>

          {/* When — the proof point */}
          <div className="border-t border-black/6">
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-green-200" />
                <div className="flex flex-1 items-center justify-center bg-green-100">
                  <span className="text-[10px] font-bold tracking-wide text-green-900/60">When</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What did we have to show for it?" : "What will we have to show?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The proof point at the end of this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "doneDefinition" && (
                <button
                  type="button"
                  onClick={() => setEditingField("doneDefinition")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit done definition"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "doneDefinition" ? (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <Textarea
                  value={form.doneDefinition}
                  onChange={(event) => handleChange("doneDefinition", event.target.value)}
                  placeholder="What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                {error && editingField === "doneDefinition" && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 px-5 pb-5 text-sm leading-7 text-[var(--muted)] sm:px-6 sm:pb-6 sm:text-base">
                {copyOrFallback(
                  board.doneDefinition,
                  "What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to.",
                )}
              </p>
            )}
          </div>

        </article>
        </div>

      </div>

      {/* Mobile: chapter arc — all chapters in the project */}
      {chapters && chapters.length > 0 && (
        <section className="lg:hidden">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/8" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              All chapters
            </p>
            <div className="h-px flex-1 bg-black/8" />
          </div>

          <div>
            {chapters.map((ch, i) => {
              const status = ch.retroCompletedAt
                ? "completed"
                : ch.kickoffCompletedAt
                ? "active"
                : "planned";
              const isCurrent = ch.id === chapterId;
              const isLast = i === chapters.length - 1;

              return (
                <div key={ch.id} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        status === "completed" && "bg-green-100 text-green-700",
                        status === "active" && "bg-[var(--accent-soft)] text-[var(--accent)]",
                        status === "planned" && "bg-black/5 text-[var(--muted)]",
                      )}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : status === "active" ? (
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                          <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold">{i + 1}</span>
                      )}
                    </div>
                    {!isLast && <div className="mt-1 w-px flex-1 bg-black/8" />}
                  </div>

                  {/* Chapter card */}
                  <div className={cn("mb-3 min-w-0 flex-1", isLast && "mb-0")}>
                    <Link
                      href={`/projects/${projectId}/chapters/${ch.id}`}
                      className={cn(
                        "block rounded-[1.5rem] p-4 transition",
                        isCurrent
                          ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/20"
                          : "surface-card hairline hover:shadow-sm",
                        status === "planned" && !isCurrent && "opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Chapter {i + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-[var(--accent)]">
                            · current
                          </span>
                        )}
                        {status === "completed" && !isCurrent && (
                          <span className="text-[10px] font-semibold text-green-600">· done</span>
                        )}
                      </div>
                      {ch.goal && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--ink)]">
                          {ch.goal}
                        </p>
                      )}
                      {ch.openingLine && status === "completed" && (
                        <p className="mt-1 line-clamp-1 text-xs italic text-[var(--muted)]">
                          &ldquo;{ch.openingLine}&rdquo;
                        </p>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {onPlanChapters && (
            <button
              type="button"
              onClick={onPlanChapters}
              className="mt-3 flex w-full items-center gap-2 rounded-[1.5rem] px-4 py-3.5 text-sm font-medium text-[var(--accent)] transition hover:bg-black/5"
            >
              <Sparkles className="size-3.5 shrink-0" />
              Plan new chapters
            </button>
          )}
        </section>
      )}

      </div>{/* end gap-6 content */}

      {/* Floating refine button — shown only before chapter is complete */}
      {!retroDone && (
        <button
          type="button"
          onClick={onRefine}
          className="group fixed bottom-6 right-6 z-40 flex h-14 items-center overflow-hidden rounded-full bg-[var(--ink)] shadow-xl shadow-black/20 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ width: "3.5rem" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "220px"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "3.5rem"; }}
          aria-label="Refine this page with chat"
        >
          <span className="flex size-14 shrink-0 items-center justify-center text-white">
            <MessageSquare className="size-5" />
          </span>
          <span className="whitespace-nowrap pr-5 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Refine story with chat
          </span>
        </button>
      )}

      {/* Cass share FAB — shown after retro is complete, replaces the refine button */}
      {retroDone && !shareDrawerOpen && (
        <button
          type="button"
          onClick={() => { setChatKey((k) => k + 1); setShareDrawerOpen(true); }}
          aria-label="Share your story"
          className="fixed bottom-6 right-6 z-40 flex items-end gap-3"
        >
          {/* Speech bubble — slides in from right after mount */}
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid rgba(200,168,107,0.35)",
              borderRadius: "12px 12px 0 12px",
              padding: "10px 14px",
              maxWidth: "220px",
              fontFamily: "'Special Elite', cursive",
              fontSize: "13px",
              lineHeight: "1.5",
              color: "#e8e0d0",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              opacity: bubbleVisible ? 1 : 0,
              transform: bubbleVisible ? "translateX(0) scale(1)" : "translateX(12px) scale(0.96)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
              pointerEvents: bubbleVisible ? "auto" : "none",
              textAlign: "left",
            }}
          >
            We&apos;ve captured a great story here. Want to share it?
          </div>
          {/* Cass recorder as the anchor icon */}
          <div className="shrink-0 drop-shadow-xl">
            <CassRecorder animState="idle" size="sm" />
          </div>
        </button>
      )}

      {/* Share drawer backdrop — mobile only */}
      {shareDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setShareDrawerOpen(false)}
        />
      )}

      {/* Generating overlay — fullscreen, rendered outside the transformed drawer to avoid stacking context */}
      {cassPhase === "generating" && <GeneratingOverlay />}

      {/* Share drawer — slides in from the right */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[30%] lg:min-w-[340px]"
        style={{
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(ellipse at 20% 90%, rgba(200,168,107,0.06) 0%, transparent 60%)",
          transform: shareDrawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: shareDrawerOpen ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        }}
        aria-hidden={!shareDrawerOpen}
      >
        {/* Progress bar — top edge, above avatar */}
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

        {/* Drawer header — Cass avatar centered, X absolute top-right */}
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 20px 14px",
          }}
        >
          {/* X button */}
          <button
            type="button"
            onClick={() => setShareDrawerOpen(false)}
            aria-label="Close share panel"
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              color: "#888",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#e8e0d0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#888";
            }}
          >
            <X size={14} />
          </button>

          {/* Cass circle avatar */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              background: "#1a1a1a",
              boxShadow: "0 0 0 1.5px rgba(200,168,107,0.35), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transformOrigin: "top left",
                transform: "scale(0.5333) translateY(-6.5px)",
              }}
            >
              <CassRecorder animState="idle" size="sm" />
            </div>
          </div>
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "9px",
              letterSpacing: "2.5px",
              color: "#c8a86b",
              textTransform: "uppercase",
              margin: "6px 0 0",
              opacity: 0.7,
            }}
          >
            Cass
          </p>
        </div>

        {/* Thin gold divider */}
        <div style={{ height: "1px", background: "rgba(200,168,107,0.08)", flexShrink: 0 }} />

        {/* Chat — takes remaining height */}
        <CassShareChat
          key={chatKey}
          onPhaseChange={setCassPhase}
          onComplete={(format) => {
            setCassPhase(null);
            setShareDrawerOpen(false);
            onSelectShareFormat?.(format);
          }}
        />
      </div>
    </div>
  );
}
