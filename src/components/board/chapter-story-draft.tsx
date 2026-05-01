"use client";

import { useState } from "react";
import { Check, LoaderCircle, PencilLine, Quote, X } from "lucide-react";
import type { RetroData } from "@/lib/ai/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChapterStoryDraft({
  retroData,
  editedStory,
  onEditStory,
  onPublish,
  isSaving,
  error,
}: {
  retroData: RetroData;
  editedStory: string;
  onEditStory: (value: string) => void;
  onPublish: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              {retroData.story_length === "long" ? "Long story" : "Short story"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">
              Your chapter story
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Review and edit before publishing. This becomes part of your
              project narrative.
            </p>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface hairline flex min-h-0 flex-col rounded-[2rem] overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Story</p>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--muted)] ring-1 ring-black/8 transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              >
                <PencilLine className="size-3" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--muted)] ring-1 ring-black/8 transition hover:bg-[var(--surface-muted)]"
                >
                  <X className="size-3" />
                  Done
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {editing ? (
              <Textarea
                value={editedStory}
                onChange={(event) => onEditStory(event.target.value)}
                className="min-h-[320px] rounded-[1.5rem] text-sm leading-7"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {editedStory.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="mb-4 text-sm leading-7 text-[var(--ink)] last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-black/6 bg-white/72 px-5 py-4">
            {error ? (
              <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                onClick={onPublish}
                disabled={isSaving || !editedStory.trim()}
                className="gap-2"
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isSaving ? "Publishing..." : "Looks good — Publish"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="surface-card hairline min-h-0 rounded-[2rem] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <Quote className="size-4 text-[var(--accent)]" />
            Pull quote
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            This will appear on your share card.
          </p>
          <blockquote className="mt-4 rounded-[1.25rem] bg-[var(--surface-muted)] px-4 py-4 text-sm italic leading-6 text-[var(--ink)]">
            &ldquo;{retroData.pull_quote}&rdquo;
          </blockquote>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Added to project story
            </p>
            <p className="rounded-[1.25rem] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
              {retroData.accumulative_paragraph}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
