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
import { useRouter } from "next/navigation";
import type { AIProjectKickoffDialogue } from "@/lib/ai/schema";
import { completeProjectKickoffAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkplanProposal, type WorkplanChapter } from "@/components/projects/workplan-proposal";
import { cn } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

type Stage = "chatting" | "workplan";

function buildOpeningMessage(projectName: string): DialogueMessage {
  return {
    role: "assistant",
    content: `${projectName} — love it. Before we build anything, let's get clear on what this is really about. Tell me about it — what are you making and why now?`,
  };
}

export function ProjectKickoffChat({
  projectName,
}: {
  projectName: string;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [stage, setStage] = useState<Stage>("chatting");
  const [messages, setMessages] = useState<DialogueMessage[]>([
    buildOpeningMessage(projectName),
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<AIProjectKickoffDialogue | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  // Scroll to bottom after new messages
  useEffect(() => {
    queueMicrotask(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, [messages]);

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chat/project-kickoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as AIProjectKickoffDialogue & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Kickoff dialogue failed.");
    }

    const reply = payload.reply?.trim();
    if (!reply) {
      throw new Error("Kickoff returned an empty response.");
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);

    if (payload.done) {
      setProjectData(payload);
      setStage("workplan");
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

  function handleAcceptWorkplan(chapters: WorkplanChapter[]) {
    if (!projectData) return;
    setError(null);

    startSaveTransition(async () => {
      try {
        const { projectId, chapter1Id } = await completeProjectKickoffAction({
          name: projectName,
          northStar: projectData.north_star,
          projectGoal: projectData.project_goal,
          projectAudience: projectData.project_audience,
          projectSuccess: projectData.project_success,
          projectBiggestRisk: projectData.project_biggest_risk,
          conversation: messages,
          proposedChapters: chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            goal: ch.goal,
            prefill: ch.prefill ?? null,
          })),
        });

        router.push(`/projects/${projectId}/chapters/${chapter1Id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up project.");
      }
    });
  }

  // ─── Stage: Workplan ─────────────────────────────────────────────────────────
  if (stage === "workplan" && projectData) {
    const initialChapters: WorkplanChapter[] = projectData.proposed_chapters.map(
      (ch) => ({
        chapterNumber: ch.chapter_number,
        title: ch.title,
        goal: ch.goal,
        prefill: ch.prefill
          ? {
              goal: ch.prefill.goal,
              value: ch.prefill.value,
              measure: ch.prefill.measure,
              done: ch.prefill.done,
            }
          : null,
      }),
    );

    return (
      <WorkplanProposal
        projectName={projectName}
        northStar={projectData.north_star}
        initialChapters={initialChapters}
        isSaving={isSaving}
        onAccept={handleAcceptWorkplan}
        error={error}
      />
    );
  }

  // ─── Stage: Chatting ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh flex-col bg-[var(--ink)]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
            <Image
              src="/icons/authored_by_icon_512.png"
              alt="Shelf AI icon"
              width={40}
              height={40}
              className="size-10 object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
              Setting up your project
            </p>
            <h1 className="text-base font-semibold text-white">
              {projectName}
            </h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`}>
              <div
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "justify-end",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
                    <Bot className="size-4" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-[1.7rem] px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "assistant"
                      ? "rounded-tl-[0.55rem] bg-white/10 text-white"
                      : "rounded-tr-[0.55rem] bg-white text-[var(--ink)]",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-55">
                    {message.role === "assistant" ? "Shelf AI" : "You"}
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                    <UserRound className="size-4" />
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isPending ? (
            <div className="flex gap-3">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
                <Bot className="size-4" />
              </div>
              <div className="rounded-[1.7rem] rounded-tl-[0.55rem] bg-white/10 px-4 py-3 text-sm text-white/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <LoaderCircle className="size-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-white/8 bg-[var(--ink)]/90 px-4 py-4 sm:px-6 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-900/50 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <div className="rounded-[1.9rem] bg-white/10 p-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tell me what you're building..."
              className="min-h-[100px] border-0 bg-transparent px-2 py-2 text-white shadow-none placeholder:text-white/35 focus:ring-0"
              disabled={isPending}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <MessageSquareText className="size-3.5" />
                Enter sends. Shift + Enter adds a new line.
              </div>
              <Button
                onClick={sendMessage}
                disabled={!draft.trim() || isPending}
                className="gap-2 bg-white text-[var(--ink)] hover:bg-white/90"
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
      </div>
    </div>
  );
}
