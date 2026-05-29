"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AIChapterPlannerDialogue } from "@/lib/ai/schema";
import type { ProjectWithChapters } from "@/types";
import { createPlannedChaptersAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { ChatProgressBar } from "@/components/ui/chat-progress-bar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = { role: "user" | "assistant"; content: string };
type Stage = "chatting" | "proposal" | "done";

function chapterStatus(chapter: ProjectWithChapters["chapters"][number]) {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

function buildOpeningMessage(project: ProjectWithChapters): DialogueMessage {
  const hasChapters = project.chapters.length > 0;
  if (hasChapters) {
    const activeChapter = project.chapters.find((ch) => ch.kickoffCompletedAt && !ch.retroCompletedAt);
    const hint = activeChapter
      ? `You're currently working on "${activeChapter.name}".`
      : "";
    return {
      role: "assistant",
      content: `${hint ? hint + " " : ""}What are you hoping to tackle next? Tell me what's on your mind and we'll shape it into tracks together.`,
    };
  }
  return {
    role: "assistant",
    content: `Let's plan out your first track${project.northStar ? ` for "${project.northStar}"` : ""}. What's the first big bet you want to make?`,
  };
}

// ── Proposed chapter card ─────────────────────────────────────────────────────

function ProposedChapterCard({
  chapter,
  index,
  onRemove,
}: {
  chapter: { name: string; goal: string };
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-[1.5rem] bg-white px-4 py-4 ring-1 ring-black/6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Track {index + 1}
          </span>
          <p className="mt-0.5 font-semibold text-[var(--ink)]">{chapter.name}</p>
          {chapter.goal && (
            <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink)]/40">Bet</span>
              {chapter.goal}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--muted)] opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
          aria-label="Remove track"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChapterPlannerChat({
  project,
  onClose,
}: {
  project: ProjectWithChapters;
  onClose: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openingMessage = buildOpeningMessage(project);

  const [stage, setStage] = useState<Stage>("chatting");
  const [messages, setMessages] = useState<DialogueMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [liveChapters, setLiveChapters] = useState<AIChapterPlannerDialogue["chapters"]>([]);
  const [proposedChapters, setProposedChapters] = useState<AIChapterPlannerDialogue["chapters"]>([]);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, [messages, stage]);

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chat/plan-chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as AIChapterPlannerDialogue & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Chapter planner failed.");
    }

    const reply = payload.reply?.trim();
    if (!reply) throw new Error("Planner returned an empty response.");

    setMessages((current) => [...current, { role: "assistant", content: reply }]);
    setLiveChapters(payload.chapters ?? []);

    if (payload.done && payload.chapters.length > 0) {
      setProposedChapters(payload.chapters);
      setStage("proposal");
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || stage !== "chatting") return;

    const nextMessages: DialogueMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        await requestAssistantReply(nextMessages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function removeChapter(index: number) {
    setRemovedIndices((prev) => new Set([...prev, index]));
  }

  function handleConfirm() {
    const toCreate = proposedChapters.filter((_, i) => !removedIndices.has(i));
    if (toCreate.length === 0) return;

    setError(null);
    startSaveTransition(async () => {
      try {
        await createPlannedChaptersAction({ projectId: project.id, chapters: toCreate });
        setCreatedCount(toCreate.length);
        setStage("done");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save chapters.");
      }
    });
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (stage === "done") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-5">
      <ChatProgressBar step={3} total={3} />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
          <Image
            src="/icons/authored_by_icon_512.png"
            alt="Shelf AI icon"
            width={64}
            height={64}
            className="size-16 object-cover"
            priority
          />
        </div>
        <div className="max-w-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Tracks planned
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ink)]">
            {createdCount} {createdCount === 1 ? "track" : "tracks"} added to your story
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Each one is ready to kick off whenever you are.
          </p>
        </div>
        <Button onClick={onClose} className="gap-2 rounded-full px-8">
          <ArrowRight className="size-4" />
          Back to Story
        </Button>
      </div>
      </div>
    );
  }

  // ── Proposal ──────────────────────────────────────────────────────────────

  if (stage === "proposal") {
    const remaining = proposedChapters.filter((_, i) => !removedIndices.has(i));

    return (
      <div className="flex h-full min-h-0 flex-col gap-5">
        <ChatProgressBar step={2} total={3} />
        <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
                <Image
                  src="/icons/authored_by_icon_512.png"
                  alt="Shelf AI icon"
                  width={56}
                  height={56}
                  className="size-14 object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  Your track plan
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Remove any you don&apos;t need — you can always plan more later.
                </p>
              </div>
            </div>
            <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              {remaining.length} {remaining.length === 1 ? "track" : "tracks"}
            </div>
          </div>
        </section>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-3">
            {proposedChapters.map((chapter, i) =>
              removedIndices.has(i) ? null : (
                <ProposedChapterCard
                  key={i}
                  chapter={chapter}
                  index={i - [...removedIndices].filter((r) => r < i).length + (project.chapters.length)}
                  onRemove={() => removeChapter(i)}
                />
              ),
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-black/6 bg-white/90 pt-4">
          {error && (
            <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStage("chatting")}
              className="text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Back to chat
            </button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving || remaining.length === 0}
              className="gap-2"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving
                ? "Adding tracks..."
                : `Add ${remaining.length} ${remaining.length === 1 ? "track" : "tracks"} to story`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Chatting ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ChatProgressBar step={1} total={3} />
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
              <Image
                src="/icons/authored_by_icon_512.png"
                alt="Shelf AI icon"
                width={56}
                height={56}
                className="size-14 object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Plan tracks
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Talk through what&apos;s ahead — we&apos;ll turn it into a track plan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">

        {/* ── Chat panel ── */}
        <section className="surface hairline flex min-h-0 flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-black/6 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Track planning</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Answer naturally — describe what you want to get done next.
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <div className={cn("flex gap-3", message.role === "user" && "justify-end")}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-[1.7rem] px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "assistant"
                        ? "rounded-tl-[0.55rem] bg-[var(--surface-muted)] text-[var(--ink)]"
                        : "rounded-tr-[0.55rem] bg-[var(--ink)] text-white",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-65">
                      {message.role === "assistant" ? "Shelf AI" : "You"}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                      <UserRound className="size-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-[1.7rem] rounded-tl-[0.55rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 border-t border-black/6 bg-white/72 px-5 py-4 backdrop-blur-sm">
            {error && (
              <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
            <div className="rounded-[1.9rem] bg-[var(--surface-muted)] p-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Tell me what you want to work on next..."
                className="min-h-[100px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
                disabled={isPending}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <MessageSquareText className="size-3.5" />
                  Enter sends. Shift + Enter adds a new line.
                </div>
                <Button onClick={sendMessage} disabled={!draft.trim() || isPending} className="gap-2">
                  {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right: live chapter list ── */}
        <aside className="hidden lg:flex flex-col gap-4 min-h-0">
          <div className="surface-card hairline flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem]">
            <div className="border-b border-black/6 px-5 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Tracks taking shape
                </p>
                {liveChapters.length > 0 && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                    {liveChapters.length}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {liveChapters.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Sparkles className="size-6 text-[var(--muted)] opacity-30" />
                  <p className="text-[12px] leading-5 text-[var(--muted)] opacity-60">
                    Tracks will appear here as we talk
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveChapters.map((ch, i) => (
                    <div
                      key={i}
                      className="rounded-[1.25rem] bg-white/70 px-3.5 py-3 ring-1 ring-black/6"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Track {project.chapters.length + i + 1}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[var(--ink)]">{ch.name}</p>
                      {ch.goal && (
                        <p className="mt-1 text-[12px] leading-4 text-[var(--muted)]">{ch.goal}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
