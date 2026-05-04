"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUp,
  Bot,
  LoaderCircle,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { z } from "zod";
import type { Board, Task, BoardColumn } from "@/types";
import { retroDataSchema, type RetroData } from "@/lib/ai/schema";
import { completeChapterRetroAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChapterStoryDraft } from "@/components/board/chapter-story-draft";
import { ChapterShareCard } from "@/components/board/chapter-share-card";
import { cn } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

type Stage = "chatting" | "draft" | "share";

function buildRetroOpener(
  board: Board,
  completedTasks: Task[],
  remainingTasks: Task[],
): DialogueMessage {
  const total = completedTasks.length + remainingTasks.length;

  if (total === 0) {
    return {
      role: "assistant",
      content: `Let's close out ${board.name}. You didn't record any tasks — but work still happened. Tell me about it. What did you actually build or move forward during this chapter?`,
    };
  }

  if (remainingTasks.length === 0) {
    return {
      role: "assistant",
      content: `You shipped it — ${completedTasks.length} of ${total} tasks done. Before we close ${board.name}, let's look back. What's the thing that surprised you most about how this went?`,
    };
  }

  const named = remainingTasks
    .slice(0, 2)
    .map((t) => `"${t.title}"`)
    .join(" and ");
  const more =
    remainingTasks.length > 2 ? ` and ${remainingTasks.length - 2} more` : "";
  const verb = remainingTasks.length === 1 ? "is" : "are";

  return {
    role: "assistant",
    content: `You planned to ${board.goal ?? "complete this chapter"} and got ${completedTasks.length} of ${total} tasks done. I notice ${named}${more} ${verb} still in your backlog. What happened with ${remainingTasks.length === 1 ? "that" : "those"}?`,
  };
}

function parseRetroData(text: string): {
  displayText: string;
  retroData: RetroData | null;
} {
  const match = text.match(/<retro_data>([\s\S]*?)<\/retro_data>/);
  if (!match) {
    return { displayText: text, retroData: null };
  }

  const displayText = text.replace(/<retro_data>[\s\S]*?<\/retro_data>/, "").trim();

  try {
    const parsed = JSON.parse(match[1].trim());
    const retroData = retroDataSchema.parse(parsed);
    return { displayText, retroData };
  } catch {
    return { displayText: text, retroData: null };
  }
}

export function ChapterRetroChat({
  project,
  board,
  completedTasks,
  remainingTasks,
}: {
  project: { id: string; name: string; accumulativeStory: string | null };
  board: Board;
  completedTasks: Task[];
  remainingTasks: Task[];
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const opener = buildRetroOpener(board, completedTasks, remainingTasks);

  const [stage, setStage] = useState<Stage>("chatting");
  const [messages, setMessages] = useState<DialogueMessage[]>([opener]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retroData, setRetroData] = useState<RetroData | null>(null);
  const [editedStory, setEditedStory] = useState("");
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, [messages, stage]);

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chat/retro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        chapterId: board.id,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as { reply?: string; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Retro dialogue failed.");
    }

    const reply = payload.reply?.trim();
    if (!reply) {
      throw new Error("Retro returned an empty response.");
    }

    const { displayText, retroData: parsed } = parseRetroData(reply);

    setMessages((current) => [
      ...current,
      { role: "assistant", content: displayText || reply },
    ]);

    if (parsed) {
      setRetroData(parsed);
      setEditedStory(parsed.chapter_story);
      setStage("draft");
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || stage !== "chatting") return;

    const nextMessages: DialogueMessage[] = [
      ...messages,
      { role: "user", content },
    ];
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

  function handlePublish() {
    if (!retroData) return;

    setError(null);
    startSaveTransition(async () => {
      try {
        const { shareSlug: slug } = await completeChapterRetroAction({
          projectId: project.id,
          boardId: board.id,
          conversation: messages,
          chapterStory: editedStory,
          storyLength: retroData.story_length,
          pullQuote: retroData.pull_quote,
          accumulativeParagraph: retroData.accumulative_paragraph,
        });
        setShareSlug(slug);
        setStage("share");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to publish story.");
      }
    });
  }

  // ─── Stage: Share ─────────────────────────────────────────────────────────────
  if (stage === "share" && retroData && shareSlug) {
    return (
      <ChapterShareCard
        board={board}
        project={project}
        retroData={retroData}
        chapterStory={editedStory}
        completedCount={completedTasks.length}
        remainingCount={remainingTasks.length}
        shareSlug={shareSlug}
      />
    );
  }

  // ─── Stage: Draft ─────────────────────────────────────────────────────────────
  if (stage === "draft" && retroData) {
    return (
      <ChapterStoryDraft
        retroData={retroData}
        editedStory={editedStory}
        onEditStory={setEditedStory}
        onPublish={handlePublish}
        isSaving={isSaving}
        error={error}
      />
    );
  }

  // ─── Stage: Chatting ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
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
                Chapter retro
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Let&apos;s look back at {board.name} and write the story.
              </p>
            </div>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            {project.name}
          </div>
        </div>
      </section>

      <section className="surface hairline flex min-h-0 flex-1 flex-col rounded-[2rem] overflow-hidden">
        <div className="border-b border-black/6 px-5 py-4">
          <p className="text-sm font-semibold text-[var(--ink)]">Reflect</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Answer naturally — this becomes your chapter story.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`}>
              <div
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "justify-end",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Bot className="size-4" />
                  </div>
                ) : null}
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
                {message.role === "user" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <UserRound className="size-4" />
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isPending ? (
            <div className="flex gap-3">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="size-4" />
              </div>
              <div className="rounded-[1.7rem] rounded-tl-[0.55rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
                <div className="flex items-center gap-2">
                  <LoaderCircle className="size-4 animate-spin" />
                  Writing...
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 border-t border-black/6 bg-white/72 px-5 py-4 backdrop-blur-sm">
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="rounded-[1.9rem] bg-[var(--surface-muted)] p-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="What happened..."
              className="min-h-[118px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
              disabled={isPending}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <MessageSquareText className="size-3.5" />
                Enter sends. Shift + Enter adds a new line.
              </div>
              <Button
                onClick={sendMessage}
                disabled={!draft.trim() || isPending}
                className="gap-2"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
