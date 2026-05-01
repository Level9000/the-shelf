"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import type { Board } from "@/types";
import type { RetroData } from "@/lib/ai/schema";
import { Button } from "@/components/ui/button";

function ShareButton({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
    >
      <ExternalLink className="size-3.5" />
      {label}
    </a>
  );
}

export function ChapterShareCard({
  board,
  project,
  retroData,
  chapterStory,
  completedCount,
  remainingCount,
  shareSlug,
}: {
  board: Board;
  project: { id: string; name: string };
  retroData: RetroData;
  chapterStory: string;
  completedCount: number;
  remainingCount: number;
  shareSlug: string;
}) {
  const [copied, setCopied] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  const storyUrl = `${appUrl}/story/${shareSlug}`;

  const twitterText = encodeURIComponent(
    `${retroData.pull_quote}\n\nRead the full story →`,
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(storyUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Branded card */}
        <div className="overflow-hidden rounded-[2rem] bg-[var(--ink)] text-white shadow-2xl shadow-black/20">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              <span className="text-base text-white/80">◈</span>
              Shelf
            </div>

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {board.name} · {project.name}
            </p>

            <blockquote className="mt-3 text-lg font-semibold leading-snug tracking-tight">
              &ldquo;{retroData.pull_quote}&rdquo;
            </blockquote>
          </div>

          <div className="flex items-center gap-5 border-t border-white/10 px-6 py-4">
            {completedCount > 0 ? (
              <div className="flex items-center gap-1.5 text-sm text-white/60">
                <CheckCircle2 className="size-3.5 text-white/40" />
                {completedCount}{" "}
                {completedCount === 1 ? "task" : "tasks"} completed
              </div>
            ) : null}
            {remainingCount > 0 ? (
              <div className="flex items-center gap-1.5 text-sm text-white/60">
                <span className="text-white/40">→</span>
                {remainingCount} carried forward
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-6 py-4">
            <a
              href={storyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-white/70 transition hover:text-white"
            >
              Read the full story →
            </a>
          </div>

          <div className="border-t border-white/10 px-6 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
              never lose the story
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ShareButton label="Share on X" href={twitterUrl} />
        <ShareButton label="Share on LinkedIn" href={linkedInUrl} />
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--ink)] ring-1 ring-black/12 transition hover:bg-[var(--surface-muted)]"
        >
          {copied ? (
            <Check className="size-3.5 text-green-600" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <p className="text-center text-xs text-[var(--muted)]">
        Anyone with the link can read this story — no login required.
      </p>
    </div>
  );
}
