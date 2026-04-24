"use client";

import { Mic, Sparkles, Speech } from "lucide-react";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function StrategicVoiceDialogueModal({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Strategic voice dialogue"
      description={`Voice-first planning for ${project.name}.`}
      fullScreen
      className="flex min-h-full flex-col bg-[linear-gradient(180deg,rgba(252,250,246,0.98),rgba(243,238,231,0.98))]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <Sparkles className="size-3.5" />
            Full-screen planning mode
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Strategic voice dialogue will live here.
          </h3>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            The goal is the same as strategic text: talk through the outcome,
            let AI narrow the work, and then move the aligned cards into the
            existing review flow. This screen is now reserved for that mode so it
            can expand into a dedicated voice workspace instead of a small modal.
          </p>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] bg-white/75 p-6 ring-1 ring-black/6">
            <div className="flex items-center gap-3 text-[var(--ink)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Speech className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Planned experience
                </p>
                <p className="mt-1 text-lg font-semibold">
                  Dedicated conversation canvas
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                Users will be able to speak naturally about the goal, blockers,
                and constraints while AI asks follow-up questions out loud.
              </p>
              <p>
                Once aligned, this mode should present the same confirmation
                language as text dialogue, then hand off into the task review
                modal already used by audio-to-backlog.
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] bg-[var(--ink)] p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                <Mic className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/65">
                  Current status
                </p>
                <p className="mt-1 text-lg font-semibold">
                  Shell is ready, voice loop is not
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-white/75">
              This is a full-screen placeholder for now. The next step is wiring
              microphone capture, turn-by-turn AI responses, and the same review
              handoff used by the text strategy flow.
            </p>
            <div className="mt-8">
              <Button variant="secondary" onClick={onClose}>
                Back to board
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
