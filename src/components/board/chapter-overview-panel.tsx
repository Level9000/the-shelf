import { CheckCircle2, Flag, Sparkles, Target } from "lucide-react";
import type { Board, Project } from "@/types";
import { ChapterPageNav } from "@/components/projects/chapter-page-nav";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function ChapterOverviewPanel({
  project,
  board,
  projectId,
  chapterId,
  onRefine,
}: {
  project: Project;
  board: Board;
  projectId: string;
  chapterId: string;
  onRefine: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              <Sparkles className="size-3.5" />
              Chapter framing
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {board.name}
            </h2>
            <div className="mt-4">
              <ChapterPageNav
                projectId={projectId}
                chapterId={chapterId}
                active="overview"
              />
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Use this chapter overview to define how {board.name} advances{" "}
              {project.name} before you drive execution through the board.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefine}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:bg-black"
          >
            Refine this chapter with chat
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Target className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">The chapter goal</h3>
              <p className="text-sm text-[var(--muted)]">
                The specific contribution this chapter should make to the story.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
            {copyOrFallback(
              board.goal,
              "Define the concrete change this chapter needs to create so the team can focus the board on meaningful progress.",
            )}
          </p>
        </article>

        <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Flag className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Why this chapter matters</h3>
              <p className="text-sm text-[var(--muted)]">
                The reason this chapter deserves attention inside the larger story.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
            {copyOrFallback(
              board.whyItMatters,
              "Explain why this chapter matters now so the team can make stronger tradeoffs inside the sprint.",
            )}
          </p>
        </article>

        <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">What success looks like here</h3>
              <p className="text-sm text-[var(--muted)]">
                The visible state you want this chapter to reach.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
            {copyOrFallback(
              board.successLooksLike,
              "Describe the chapter end state that would tell you this slice of work landed well.",
            )}
          </p>
        </article>

        <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">How we know this chapter is done</h3>
              <p className="text-sm text-[var(--muted)]">
                The completion signal for this chapter.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
            {copyOrFallback(
              board.doneDefinition,
              "Set a clear finish line for this chapter so the board can close cleanly before the next one begins.",
            )}
          </p>
        </article>
      </section>
    </div>
  );
}
