"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  ChevronDown,
  FileText,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  PencilLine,
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Board, Task, BoardColumn } from "@/types";
import { updateBoardOverviewAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  projectName,
  northStar,
  onRefine,
  onStartRetro,
  onEndChapter,
}: {
  board: Board;
  projectId: string;
  chapterId: string;
  tasks?: Task[];
  columns?: BoardColumn[];
  projectName?: string | null;
  northStar?: string | null;
  onRefine: () => void;
  onStartRetro?: () => void;
  onEndChapter?: () => void;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />

        <div className="flex flex-wrap items-center gap-3">
          {retroDone ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 ring-1 ring-green-200">
              <BookOpen className="size-4" />
              Story published
            </div>
          ) : retroAvailable && allTasksDone && onStartRetro ? (
            <button
              type="button"
              onClick={onStartRetro}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition duration-200 hover:-translate-y-0.5"
            >
              <BookOpen className="size-4" />
              All done — write the story
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile collapsible share teaser */}
      {!retroDone && (
        <div className="lg:hidden overflow-hidden rounded-[1.5rem] border border-black/6 bg-white">
          <button
            type="button"
            onClick={() => setShareOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)]">
                <Lock className="size-3.5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--ink)]">Share your story</p>
                <p className="text-xs text-[var(--muted)]">Unlocks when this chapter closes</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
                shareOpen && "rotate-180",
              )}
            />
          </button>

          {shareOpen && (
            <div className="flex flex-col gap-2.5 px-4 pb-4 opacity-50 pointer-events-none select-none">
              {[
                { icon: Mail, label: "Email update", description: "A personal email to your board, investors, or team" },
                { icon: FileText, label: "Blog post", description: "A 400–600 word post in your authentic founder voice" },
                { icon: Link2, label: "LinkedIn post", description: "A punchy 150–200 word post for your network" },
                { icon: Mic, label: "Podcast script", description: "A 2–3 minute conversational solo-cast monologue" },
              ].map(({ icon: Icon, label, description }) => (
                <div key={label} className="surface-card hairline flex items-center gap-3 rounded-[1.25rem] p-3.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_30%]">
        {/* Left: 4 overview cards */}
        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2">
          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-yellow-200" />
                <div className="flex flex-1 items-center justify-center bg-yellow-100">
                  <span className="text-[10px] font-bold tracking-wide text-yellow-900/60">What</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">What's the bet we're making?</h3>
                <p className="text-sm text-[var(--muted)]">
                  The core hypothesis we're acting on this chapter.
                </p>
              </div>
              {editingField !== "goal" && (
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
              <>
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
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.goal,
                  "What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds.",
                )}
              </p>
            )}
            {error && editingField === "goal" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-blue-200" />
                <div className="flex flex-1 items-center justify-center bg-blue-100">
                  <span className="text-[10px] font-bold tracking-wide text-blue-900/60">Why</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Why does this matter right now?</h3>
                <p className="text-sm text-[var(--muted)]">
                  The urgency and stakes behind this chapter.
                </p>
              </div>
              {editingField !== "whyItMatters" && (
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
              <>
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
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.whyItMatters,
                  "What's the window? What's the pressure? Why is this the right chapter to run right now?",
                )}
              </p>
            )}
            {error && editingField === "whyItMatters" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-pink-200" />
                <div className="flex flex-1 items-center justify-center bg-pink-100">
                  <span className="text-[10px] font-bold tracking-wide text-pink-900/60">How</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">What has to be true?</h3>
                <p className="text-sm text-[var(--muted)]">
                  The conditions that need to hold for this chapter to work.
                </p>
              </div>
              {editingField !== "successLooksLike" && (
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
              <>
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
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.successLooksLike,
                  "List the conditions that need to hold. Each one is something the board can work toward directly.",
                )}
              </p>
            )}
            {error && editingField === "successLooksLike" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-green-200" />
                <div className="flex flex-1 items-center justify-center bg-green-100">
                  <span className="text-[10px] font-bold tracking-wide text-green-900/60">When</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">What will we have to show?</h3>
                <p className="text-sm text-[var(--muted)]">
                  The proof point at the end of this chapter.
                </p>
              </div>
              {editingField !== "doneDefinition" && (
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
              <>
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
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.doneDefinition,
                  "What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to.",
                )}
              </p>
            )}
            {error && editingField === "doneDefinition" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>
        </section>

        {/* Right: share teaser — desktop only, mobile uses collapsible above */}
        {!retroDone && (
          <section className="hidden surface hairline sticky top-6 rounded-[2rem] p-5 sm:p-6 lg:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Unlocks when you close this chapter
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ink)]">
                  Share your story
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  End the chapter and complete the retro — AI will turn your work into polished updates ready to send.
                </p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]">
                <Lock className="size-4" />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 opacity-50 pointer-events-none select-none">
              {[
                { icon: Mail, label: "Email update", description: "A personal email to your board, investors, or team" },
                { icon: FileText, label: "Blog post", description: "A 400–600 word post in your authentic founder voice" },
                { icon: Link2, label: "LinkedIn post", description: "A punchy 150–200 word post for your network" },
                { icon: Mic, label: "Podcast script", description: "A 2–3 minute conversational solo-cast monologue" },
              ].map(({ icon: Icon, label, description }) => (
                <div
                  key={label}
                  className="surface-card hairline flex items-center gap-3 rounded-[1.25rem] p-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating refine button — bottom-right FAB */}
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
    </div>
  );
}
