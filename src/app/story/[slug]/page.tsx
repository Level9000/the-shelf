import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2 } from "lucide-react";

// Public page — no authentication required.
// Uses the anon key; Supabase RLS policy grants read access to rows with share_slug set.
function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default async function PublicStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicSupabaseClient();

  const { data: board, error } = await supabase
    .from("boards")
    .select(
      "id,name,position,chapter_story,story_length,goal,why_it_matters,success_looks_like,done_definition,project_id",
    )
    .eq("share_slug", slug)
    .maybeSingle();

  if (error || !board || !board.chapter_story) {
    notFound();
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", String(board.project_id))
    .maybeSingle();

  const chapterNumber = Math.max(1, Math.round(Number(board.position ?? 1000) / 1000));
  const story = String(board.chapter_story);
  const projectName = project ? String(project.name) : "Untitled project";

  const overviewItems = [
    { label: "Goal", value: board.goal as string | null },
    { label: "Why it matters", value: board.why_it_matters as string | null },
    { label: "Success looks like", value: board.success_looks_like as string | null },
    { label: "Done when", value: board.done_definition as string | null },
  ].filter((item) => Boolean(item.value?.trim()));

  return (
    <main className="min-h-screen bg-[var(--app-bg,#f8f7f4)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted,#888)]">
            <span className="text-base">◈</span>
            Shelf
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--muted,#888)]">
            Chapter {chapterNumber} · {projectName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink,#111)] sm:text-4xl">
            {String(board.name)}
          </h1>
        </div>

        {/* Chapter overview */}
        {overviewItems.length > 0 ? (
          <section className="mb-10 rounded-[1.75rem] bg-white/70 px-6 py-5 ring-1 ring-black/6">
            <div className="grid gap-4 sm:grid-cols-2">
              {overviewItems.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted,#888)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink,#111)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Story */}
        <article className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[var(--accent,#5b4ff5)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted,#888)]">
              {board.story_length === "long" ? "Long story" : "Chapter story"}
            </p>
          </div>
          <div className="space-y-4">
            {story.split("\n\n").map((paragraph, i) => (
              <p
                key={i}
                className="text-base leading-8 text-[var(--ink,#111)]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {/* Acquisition CTA */}
        <footer className="rounded-[1.75rem] bg-[var(--ink,#111)] px-6 py-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            ◈ Shelf
          </p>
          <p className="mt-3 text-lg font-semibold leading-snug">
            Build your own story.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Shelf helps founders track work, run retros, and never lose the
            story of what they built.
          </p>
          <a
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink,#111)] shadow-sm transition hover:bg-white/90"
          >
            Start for free →
          </a>
        </footer>
      </div>
    </main>
  );
}
