"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  FileText,
  Link2,
  Mail,
  Mic,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { Board, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ShareFormat = "email" | "blog" | "linkedin" | "podcast";

const FORMAT_META: Record<
  ShareFormat,
  {
    label: string;
    icon: React.ElementType;
    description: string;
    audienceOptions?: { value: string; label: string }[];
  }
> = {
  email: {
    label: "Email update",
    icon: Mail,
    description: "A personal email to your board, investors, or team",
    audienceOptions: [
      { value: "Board / Investors", label: "Board / Investors" },
      { value: "Manager", label: "Manager" },
      { value: "Team", label: "Team" },
      { value: "Friend / Mentor", label: "Friend / Mentor" },
    ],
  },
  blog: {
    label: "Blog post",
    icon: FileText,
    description: "A 400–600 word post in your authentic founder voice",
  },
  linkedin: {
    label: "LinkedIn post",
    icon: Link2,
    description: "A punchy 150–200 word post for your network",
  },
  podcast: {
    label: "Podcast script",
    icon: Mic,
    description: "A 2–3 minute conversational solo-cast monologue",
  },
};

// ── Hub card grid ────────────────────────────────────────────────────────────

function HubView({
  board,
  completedCount,
  onSelectFormat,
}: {
  board: Board;
  completedCount: number;
  onSelectFormat: (format: ShareFormat) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
      {/* Story header */}
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Chapter complete
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
              Share your story
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {completedCount} task{completedCount !== 1 ? "s" : ""} shipped
              {board.name ? ` · ${board.name}` : ""}
            </p>
          </div>
        </div>

        {board.chapterStory && (
          <blockquote className="mt-5 rounded-2xl bg-[var(--surface-muted)] px-5 py-4 text-sm italic leading-7 text-[var(--ink)]">
            {board.chapterStory}
          </blockquote>
        )}
      </section>

      {/* Format cards */}
      <section>
        <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Share as...
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            Object.entries(FORMAT_META) as [
              ShareFormat,
              (typeof FORMAT_META)[ShareFormat],
            ][]
          ).map(([format, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={format}
                type="button"
                onClick={() => onSelectFormat(format)}
                className="surface-card hairline group flex items-center gap-4 rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--ink)] group-hover:text-white">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink)]">{meta.label}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Format editor ────────────────────────────────────────────────────────────

function FormatEditor({
  format,
  board,
  project,
  completedTasks,
  remainingTasks,
  onBack,
}: {
  format: ShareFormat;
  board: Board;
  project: { id: string; name: string; accumulativeStory: string | null };
  completedTasks: Task[];
  remainingTasks: Task[];
  onBack: () => void;
}) {
  const meta = FORMAT_META[format];
  const Icon = meta.icon;

  const [audienceType, setAudienceType] = useState(
    meta.audienceOptions?.[0]?.value ?? "",
  );
  const [content, setContent] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isRefining, startRefining] = useTransition();

  async function callShareApi(messages: Array<{ role: string; content: string }>) {
    const response = await fetch(`/api/share/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        chapterId: board.id,
        audienceType,
        messages,
      }),
    });

    const payload = (await response.json()) as {
      content?: string;
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Generation failed.");
    return payload.content ?? "";
  }

  function generate() {
    setError(null);
    startGenerating(async () => {
      try {
        const result = await callShareApi([]);
        setContent(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function refine() {
    const instruction = refineInput.trim();
    if (!instruction || !content) return;

    setError(null);
    setRefineInput("");
    startRefining(async () => {
      try {
        const result = await callShareApi([
          { role: "assistant", content },
          { role: "user", content: instruction },
        ]);
        setContent(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fallback
    }
  }

  const isPending = isGenerating || isRefining;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
      {/* Header */}
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {meta.label}
            </h2>
            <p className="text-sm text-[var(--muted)]">{meta.description}</p>
          </div>
        </div>

        {/* Audience picker for email */}
        {meta.audienceOptions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.audienceOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudienceType(opt.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  audienceType === opt.value
                    ? "bg-[var(--ink)] text-white"
                    : "bg-black/5 text-[var(--muted)] hover:bg-black/10 hover:text-[var(--ink)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Content editor */}
      <section className="surface-card hairline flex-1 rounded-[2rem] p-5 sm:p-6">
        {!content && !isGenerating ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4">
            <p className="text-sm text-[var(--muted)]">
              Ready to generate your {meta.label.toLowerCase()}.
            </p>
            <Button onClick={generate} className="gap-2">
              <Sparkles className="size-4" />
              Generate
            </Button>
          </div>
        ) : isGenerating ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Sparkles className="size-4 animate-pulse" />
              Writing your {meta.label.toLowerCase()}...
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Draft
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={generate}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-40"
                >
                  <RefreshCw className="size-3" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={copyContent}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[280px] rounded-2xl border-black/8 bg-[var(--surface-muted)] text-sm leading-7"
              disabled={isPending}
            />
          </div>
        )}
      </section>

      {/* Refine with AI */}
      {content && (
        <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
          <p className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Refine with AI
          </p>
          {error && (
            <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="rounded-[1.9rem] bg-[var(--surface-muted)] p-3">
            <Textarea
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  refine();
                }
              }}
              placeholder="Make it shorter, change the tone, add a specific detail..."
              className="min-h-[80px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
              disabled={isPending}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                Enter sends · Shift+Enter for new line
              </p>
              <Button
                onClick={refine}
                disabled={!refineInput.trim() || isPending}
                className="gap-2 px-3 py-2 text-xs"
              >
                {isRefining ? (
                  <Sparkles className="size-3.5 animate-pulse" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
                {isRefining ? "Refining..." : "Refine"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Locked state ─────────────────────────────────────────────────────────────

function LockedView({
  board,
  onEndChapter,
}: {
  board: Board;
  onEndChapter?: () => void;
}) {
  const retroAvailable =
    Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="surface-card hairline w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <BookOpen className="size-7" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
          Your story is almost ready
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Complete the chapter retro and your story will unlock here — ready to
          share with your team, investors, or the world.
        </p>
        {retroAvailable && onEndChapter && (
          <button
            type="button"
            onClick={onEndChapter}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-black"
          >
            <BookOpen className="size-4" />
            End chapter &amp; write the story
          </button>
        )}
        {!board.kickoffCompletedAt && (
          <p className="mt-4 text-xs text-[var(--muted)]">
            Complete the chapter kickoff first to unlock the retro.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StoryHub({
  board,
  project,
  completedTasks,
  remainingTasks,
  onEndChapter,
}: {
  board: Board;
  project: { id: string; name: string; accumulativeStory: string | null };
  completedTasks: Task[];
  remainingTasks: Task[];
  onEndChapter?: () => void;
}) {
  const [activeFormat, setActiveFormat] = useState<ShareFormat | null>(null);

  if (!board.retroCompletedAt) {
    return <LockedView board={board} onEndChapter={onEndChapter} />;
  }

  if (activeFormat) {
    return (
      <FormatEditor
        format={activeFormat}
        board={board}
        project={project}
        completedTasks={completedTasks}
        remainingTasks={remainingTasks}
        onBack={() => setActiveFormat(null)}
      />
    );
  }

  return (
    <HubView
      board={board}
      completedCount={completedTasks.length}
      onSelectFormat={setActiveFormat}
    />
  );
}
