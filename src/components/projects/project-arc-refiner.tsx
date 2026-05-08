"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  LoaderCircle,
  MessageSquareText,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Chapter, ProjectWithChapters } from "@/types";
import { updateProjectArcFieldAction } from "@/lib/actions/project-actions";
import type { AIArcDialogue } from "@/lib/ai/schema";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = { role: "user" | "assistant"; content: string };
type Intent = "exploring" | "northStar" | "accumulativeStory" | "shareable";

function chapterStatus(ch: Chapter): "upcoming" | "active" | "complete" {
  if (ch.retroCompletedAt) return "complete";
  if (ch.kickoffCompletedAt) return "active";
  return "upcoming";
}

function buildOpeningMessage(northStar: string | null, story: string | null): string {
  const hasNorthStar = !!northStar?.trim();
  const hasStory = !!story?.trim();

  if (hasNorthStar && hasStory) {
    return `I can help you sharpen the north star, build out the story so far, or, if you like what we have for those sections already, help you craft a shareable version of your story for your intended audience. What would you like to work on?`;
  }
  if (hasNorthStar) {
    return `Your north star is already set. I can help you refine it further, or we can work on building out the story so far. What would you like to do?`;
  }
  if (hasStory) {
    return `You already have a story so far. I can help you add the north star — the mission that drives this project — or refine the story. What would you like to work on?`;
  }
  return `Let's build your arc. I can help you define the north star — the mission that drives this project — or start building the story so far. Where would you like to begin?`;
}

export function ProjectArcRefiner({
  project,
  onClose,
}: {
  project: ProjectWithChapters;
  onClose: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [intent, setIntent] = useState<Intent>("exploring");
  const [approvedValues, setApprovedValues] = useState({
    northStar: project.northStar ?? "",
    accumulativeStory: project.accumulativeStory ?? "",
  });
  const [shareContent, setShareContent] = useState("");
  const [copied, setCopied] = useState(false);

  const [messages, setMessages] = useState<DialogueMessage[]>([
    {
      role: "assistant",
      content: buildOpeningMessage(project.northStar, project.accumulativeStory),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalField, setApprovalField] = useState<"northStar" | "accumulativeStory" | "">("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/arc/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, messages: nextMessages }),
    });

    const payload = (await response.json()) as AIArcDialogue & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Arc refinement failed.");

    const reply = payload.reply?.trim();
    if (!reply) throw new Error("Arc refinement returned an incomplete response.");

    setMessages((cur) => [...cur, { role: "assistant", content: reply }]);

    if (payload.intent && payload.intent !== "exploring") {
      setIntent(payload.intent);
    }

    if (payload.shareReady && payload.shareContent?.trim()) {
      setShareContent(payload.shareContent.trim());
    }

    if (payload.readyForApproval && payload.draftValue?.trim() && payload.draftField) {
      setApprovalDraft(payload.draftValue.trim());
      setApprovalField(payload.draftField);
      setApprovalOpen(true);
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || isApproving) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        await requestAssistantReply(nextMessages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Arc refinement failed.");
      } finally {
        queueMicrotask(() =>
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
        );
      }
    });
  }

  function handleApproveSection() {
    if (!approvalDraft.trim() || !approvalField) return;

    setError(null);
    startApproveTransition(async () => {
      try {
        await updateProjectArcFieldAction({
          projectId: project.id,
          field: approvalField,
          value: approvalDraft,
        });

        setApprovedValues((cur) => ({ ...cur, [approvalField]: approvalDraft }));
        setApprovalOpen(false);

        const fieldLabel = approvalField === "northStar" ? "north star" : "story so far";
        const hasNorthStar = approvalField === "northStar" ? true : !!approvedValues.northStar.trim();
        const hasStory = approvalField === "accumulativeStory" ? true : !!approvedValues.accumulativeStory.trim();
        const bothDone = hasNorthStar && hasStory;

        setMessages((cur) => [
          ...cur,
          {
            role: "assistant",
            content: bothDone
              ? `The ${fieldLabel} is saved. Both sections are now complete. Would you like to refine anything further, or shall I help you craft a shareable version of your story for your intended audience?`
              : `The ${fieldLabel} is saved. Would you like to keep refining, or work on the other section?`,
          },
        ]);

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save the approved section.");
      }
    });
  }

  function handleCopy() {
    if (!shareContent) return;
    navigator.clipboard.writeText(shareContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const intentLabel: Record<Intent, string> = {
    exploring: "Exploring",
    northStar: "North Star",
    accumulativeStory: "Story So Far",
    shareable: "Crafting Share",
  };

  const northStarDone = !!approvedValues.northStar.trim();
  const storyDone = !!approvedValues.accumulativeStory.trim();
  const completedCount = [northStarDone, storyDone].filter(Boolean).length;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5">
        {/* Header */}
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
                  Refine the Arc
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Sharpen the north star and story for {project.name}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {intentLabel[intent]}
              </div>
              <Button variant="secondary" onClick={onClose}>
                <ArrowLeft className="mr-2 size-4" />
                Back to Arc
              </Button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.08fr)_400px]">
          {/* Chat panel */}
          <section className="surface hairline flex min-h-0 flex-col overflow-hidden rounded-[2rem]">
            <div className="border-b border-black/6 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Arc narrative</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tell me what you'd like to work on and I'll follow your lead.
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
                      {intent === "shareable" ? "Crafting your story..." : "Weaving the narrative..."}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="sticky bottom-0 border-t border-black/6 bg-white/72 px-5 py-4 backdrop-blur-sm">
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
                  placeholder="Reply..."
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
                    {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Right panel */}
          <aside className="surface-card hairline min-h-0 space-y-5 overflow-y-auto rounded-[2rem] p-5">
            {/* Arc section status */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <CheckCircle2 className="size-4 text-[var(--accent)]" />
                Arc alignment
              </div>
              <div className="space-y-2">
                {(
                  [
                    { key: "northStar", label: "North Star", done: northStarDone },
                    { key: "accumulativeStory", label: "Story So Far", done: storyDone },
                  ] as const
                ).map(({ key, label, done }) => {
                  const isCurrent = intent === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center justify-between rounded-[1.2rem] px-4 py-3 ring-1 ring-black/6",
                        isCurrent ? "bg-white text-[var(--ink)]" : "bg-white/55 text-[var(--muted)]",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs">
                          {done ? "Saved" : isCurrent ? "In progress" : "Not yet written"}
                        </p>
                      </div>
                      {done ? (
                        <Check className="size-4 text-[var(--accent)]" />
                      ) : (
                        <Circle className="size-4 text-[var(--muted)]" />
                      )}
                    </div>
                  );
                })}

                {/* Shareable path indicator */}
                <div
                  className={cn(
                    "flex items-center justify-between rounded-[1.2rem] px-4 py-3 ring-1 ring-black/6",
                    intent === "shareable" ? "bg-white text-[var(--ink)]" : "bg-white/55 text-[var(--muted)]",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">Shareable version</p>
                    <p className="text-xs">
                      {shareContent
                        ? "Ready to copy"
                        : intent === "shareable"
                          ? "In progress"
                          : completedCount === 2
                            ? "Available"
                            : "Unlocks when both sections are written"}
                    </p>
                  </div>
                  {shareContent ? (
                    <Check className="size-4 text-[var(--accent)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--muted)]" />
                  )}
                </div>
              </div>
            </div>

            {/* Shareable content panel — shown when ready */}
            {shareContent && (
              <div className="rounded-[1.5rem] bg-white ring-1 ring-black/6">
                <div className="flex items-center justify-between border-b border-black/6 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Shareable copy
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
                  >
                    {copied ? <Check className="size-3" /> : <ClipboardCopy className="size-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="px-4 py-4 text-sm leading-7 text-[var(--ink)] whitespace-pre-wrap">
                  {shareContent}
                </p>
              </div>
            )}

            {/* Chapter arc context */}
            {project.chapters.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Chapter arc
                </p>
                <div className="space-y-2">
                  {project.chapters.map((ch, i) => {
                    const status = chapterStatus(ch);
                    return (
                      <div
                        key={ch.id}
                        className="rounded-[1.2rem] bg-white/55 px-4 py-3 ring-1 ring-black/6"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              status === "complete" && "bg-green-100 text-green-700",
                              status === "active" && "bg-[var(--accent-soft)] text-[var(--accent)]",
                              status === "upcoming" && "bg-black/5 text-[var(--muted)]",
                            )}
                          >
                            {status === "complete" ? (
                              <BookOpen className="size-2.5" />
                            ) : status === "active" ? (
                              <Share2 className="size-2.5" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <p className="text-xs font-semibold text-[var(--ink)]">Chapter {i + 1}</p>
                          <span
                            className={cn(
                              "ml-auto text-[10px] font-semibold",
                              status === "complete" && "text-green-600",
                              status === "active" && "text-[var(--accent)]",
                              status === "upcoming" && "text-[var(--muted)]",
                            )}
                          >
                            {status}
                          </span>
                        </div>
                        {ch.goal && (
                          <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                            <span className="font-semibold text-[var(--ink)]/50">Bet </span>
                            {ch.goal}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>

        {error && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}
      </div>

      {/* Approval modal — for north star and story saves */}
      <Modal
        open={approvalOpen}
        onClose={() => !isApproving && setApprovalOpen(false)}
        title={`Approve ${approvalField === "northStar" ? "North Star" : "Story So Far"}`}
        description="We have alignment on this section. Approve it to save to the Arc page."
        className="max-w-2xl"
      >
        <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">
          {approvalDraft}
        </div>
        <div className="sticky bottom-0 mt-5 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
          <Button variant="ghost" onClick={() => setApprovalOpen(false)} disabled={isApproving}>
            Needs more work
          </Button>
          <Button onClick={handleApproveSection} disabled={isApproving}>
            {isApproving ? "Saving..." : "Approve & save"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
