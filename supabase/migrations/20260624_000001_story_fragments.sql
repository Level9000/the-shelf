-- ── Story fragments: unstructured raw material ──────────────────────────────
--
-- The board captures what a founder is doing. This captures who they are
-- while they're doing it — stray realizations, customer quotes, backstory,
-- anything that doesn't fit a task or a chapter beat. No forced category at
-- capture time. Cass and Ty read from this as background material; it never
-- needs to be turned into a task or a structured beat.

create table if not exists public.story_fragments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Null chapter_id means project-level material (e.g. story foundation/backstory).
  chapter_id uuid references public.boards(id) on delete set null,
  -- Where this fragment came from: 'chapter_capture' | 'foundation' | 'freeform'.
  -- Not a hard enum — new capture surfaces can introduce new source values.
  source text not null default 'freeform',
  content text not null,
  -- Full back-and-forth for multi-turn captures (e.g. foundation conversation).
  -- Null for single-shot captures where content alone is enough.
  conversation jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists story_fragments_project
  on public.story_fragments(project_id, created_at desc);

create index if not exists story_fragments_chapter
  on public.story_fragments(chapter_id);

alter table public.story_fragments enable row level security;

create policy "Users can manage their own story fragments"
  on public.story_fragments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
