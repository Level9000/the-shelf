"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition, type ComponentType } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Board, Project } from "@/types";
import { updateBoardOverviewFieldAction } from "@/lib/actions/project-actions";
import type { ProjectOverviewSection } from "@/lib/ai/schema";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

type SectionConfig = {
  key: ProjectOverviewSection;
  title: string;
  shortTitle: string;
  prompt: string;
  icon: ComponentType<{ className?: string }>;
};

const SECTIONS: SectionConfig[] = [
  {
    key: "goal",
    title: "The chapter goal",
    shortTitle: "Goal",
    prompt:
      "Let’s align on the chapter goal first. What should this chapter move forward inside the larger story?",
    icon: Target,
  },
  {
    key: "whyItMatters",
    title: "Why this chapter matters",
    shortTitle: "Why it matters",
    prompt:
      "Now let’s sharpen why this chapter matters. Why is this slice of work important right now?",
    icon: Flag,
  },
  {
    key: "successLooksLike",
    title: "What success looks like here",
    shortTitle: "Success",
    prompt:
      "Let’s define what success looks like for this chapter. What should be true when this chapter goes well?",
    icon: Sparkles,
  },
  {
    key: "doneDefinition",
    title: "How we know this chapter is done",
    shortTitle: "Done",
    prompt:
      "Finally, let’s define done for this chapter. What signal tells us this chapter is complete?",
    icon: CheckCircle2,
  },
];

function getSectionValue(board: Board, key: ProjectOverviewSection) {
  return board[key] ?? "";
}

export function ChapterOverviewRefiner({
  project,
  board,
  onClose,
}: {
  project: Project;
  board: Board;
  onClose: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initialApproved = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => [section.key, getSectionValue(board, section.key)]),
      ) as Record<ProjectOverviewSection, string>,
    [board],
  );

  const [approvedSections, setApprovedSections] = useState(initialApproved);
  const [currentIndex, setCurrentIndex] = useState(
    SECTIONS.findIndex((section) => !initialApproved[section.key]?.trim()) >= 0
      ? SECTIONS.findIndex((section) => !initialApproved[section.key]?.trim())
      : 0,
  );
  const [messages, setMessages] = useState<DialogueMessage[]>([
    {
      role: "assistant",
      content:
        SECTIONS.find((section) => !initialApproved[section.key]?.trim())?.prompt ??
        "All four chapter sections are already filled in. We can still refine any one of them if you want to tighten the language.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();

  const currentSection = SECTIONS[currentIndex] ?? SECTIONS[SECTIONS.length - 1];
  const completedCount = SECTIONS.filter((section) =>
    approvedSections[section.key]?.trim(),
  ).length;

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chapter-overview/refine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: project.id,
        boardId: board.id,
        currentSection: currentSection.key,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as {
      reply?: string;
      readyForApproval?: boolean;
      draftValue?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Chapter refinement failed.");
    }

    const reply = payload.reply?.trim();

    if (!reply) {
      throw new Error("Chapter refinement returned an incomplete response.");
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);

    if (payload.readyForApproval && payload.draftValue?.trim()) {
      setApprovalDraft(payload.draftValue.trim());
      setApprovalOpen(true);
    }
  }

  function sendMessage() {
    const content = draft.trim();

    if (!content || isPending || isApproving) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        await requestAssistantReply(nextMessages);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Chapter refinement failed.",
        );
      } finally {
        queueMicrotask(() =>
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
        );
      }
    });
  }

  function handleApproveSection() {
    if (!approvalDraft.trim()) {
      return;
    }

    setError(null);
    startApproveTransition(async () => {
      try {
        await updateBoardOverviewFieldAction({
          projectId: project.id,
          boardId: board.id,
          field: currentSection.key,
          value: approvalDraft,
        });

        setApprovedSections((current) => ({
          ...current,
          [currentSection.key]: approvalDraft,
        }));
        setApprovalOpen(false);

        const nextSection =
          SECTIONS.find(
            (section) =>
              section.key !== currentSection.key && !approvedSections[section.key]?.trim(),
          ) ?? null;

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: nextSection
              ? `We have alignment on ${currentSection.title.toLowerCase()}. Next, let’s refine ${nextSection.title.toLowerCase()}. ${nextSection.prompt}`
              : "We have alignment across the chapter overview. Every section is complete, and this chapter now ladders up more clearly to the broader project goals.",
          },
        ]);

        if (nextSection) {
          setCurrentIndex(SECTIONS.findIndex((section) => section.key === nextSection.key));
        }

        router.refresh();
      } catch (approveError) {
        setError(
          approveError instanceof Error
            ? approveError.message
            : "Failed to save the approved chapter section.",
        );
      }
    });
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
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
                  Refine this chapter with chat
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Work through {board.name} so it clearly advances the larger story.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {completedCount}/{SECTIONS.length} aligned
              </div>
              <Button variant="secondary" onClick={onClose}>
                <ArrowLeft className="mr-2 size-4" />
                Back to chapter
              </Button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.08fr)_400px]">
          <section className="surface hairline flex min-h-0 flex-col rounded-[2rem] overflow-hidden">
            <div className="border-b border-black/6 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Chapter overview refinement
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                One section at a time, aligned to the parent story goals.
              </p>
            </div>

            <div className="border-b border-black/6 bg-[var(--surface-muted)]/65 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Parent story context
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Story goal</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {project.goal ?? "Not set yet on the story overview."}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Success looks like</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {project.successLooksLike ?? "Not set yet on the story overview."}
                  </p>
                </div>
              </div>
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
                      Tightening the chapter section...
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-black/6 bg-white/72 px-5 py-4">
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
                  placeholder={`Reply about ${currentSection.title.toLowerCase()}.`}
                  className="min-h-[118px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
                  disabled={isPending || isApproving}
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <MessageSquareText className="size-3.5" />
                    Enter sends. Shift + Enter adds a new line.
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!draft.trim() || isPending || isApproving}
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

          <aside className="surface-card hairline min-h-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <CheckCircle2 className="size-4 text-[var(--accent)]" />
              Chapter alignment
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The goal, why this chapter matters, what success looks like, and when
              this chapter is done.
            </p>
            <div className="mt-4 space-y-2 overflow-y-auto lg:min-h-0 lg:flex-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isComplete = Boolean(approvedSections[section.key]?.trim());
                const isCurrent = section.key === currentSection.key;

                return (
                  <div
                    key={section.key}
                    className={cn(
                      "flex items-center justify-between rounded-[1.2rem] px-4 py-3 ring-1 ring-black/6",
                      isCurrent
                        ? "bg-white text-[var(--ink)]"
                        : "bg-white/55 text-[var(--muted)]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-xl",
                          isComplete
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-black/5 text-[var(--muted)]",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs">
                          {isComplete
                            ? "Aligned"
                            : isCurrent
                              ? "In progress"
                              : "Waiting"}
                        </p>
                      </div>
                    </div>
                    {isComplete ? (
                      <Check className="size-4 text-[var(--accent)]" />
                    ) : (
                      <Circle className="size-4 text-[var(--muted)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <Modal
        open={approvalOpen}
        onClose={() => !isApproving && setApprovalOpen(false)}
        title={`Approve ${currentSection.shortTitle}`}
        description="We have alignment on this chapter section. Approve it to save the overview copy."
        className="max-w-2xl"
      >
        <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">
          {approvalDraft}
        </div>
        <div className="sticky bottom-0 mt-5 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
          <Button
            variant="ghost"
            onClick={() => setApprovalOpen(false)}
            disabled={isApproving}
          >
            Needs more work
          </Button>
          <Button onClick={handleApproveSection} disabled={isApproving}>
            {isApproving ? "Saving..." : "Approve section"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
