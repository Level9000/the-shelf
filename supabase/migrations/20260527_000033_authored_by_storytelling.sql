-- ── Authored By: Enhanced Storytelling System ────────────────────────────────
--
-- Adds chapter intelligence fields, emotional card tags, seasons table,
-- and story health reports to support the full spec:
--   • 3-beat kickoff (Context → Work → Stakes → Thesis)
--   • 4-beat retro (Accounting → Surprise → Learning → Emotional Close → Bridge)
--   • Chapter type detection (climb | win | turn | fog | reframe)
--   • 2-pass narrative engine (400–500 word chapters)
--   • Story health monitoring across last 3–5 chapters
-- ─────────────────────────────────────────────────────────────────────────────

-- Enhanced chapter fields on boards
alter table public.boards
  add column if not exists chapter_type        text
    check (chapter_type in ('climb', 'win', 'turn', 'fog', 'reframe')),
  add column if not exists confirmed_thesis     text,
  add column if not exists bridge_sentence      text,
  add column if not exists story_health_flag    text default 'none'
    check (story_health_flag in ('none', 'recentering_needed')),
  add column if not exists recentering_type     text
    check (recentering_type in (
      'flatline', 'fog_spiral', 'drift', 'shrinking_stakes', 'missing_antagonist'
    )),
  add column if not exists kickoff_beats        jsonb,
  add column if not exists retro_beats          jsonb,
  add column if not exists chapter_headline     text,
  add column if not exists chapter_subheadline  text;

-- Emotional tagging on tasks (narrative metadata for the storytelling system)
alter table public.tasks
  add column if not exists emotional_tag text
    check (emotional_tag in ('excited', 'neutral', 'dreaded'));

-- Seasons table — groups chapters into narrative seasons
create table if not exists public.seasons (
  id                 uuid primary key default gen_random_uuid(),
  founder_id         uuid references auth.users(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete cascade,
  name               text not null,
  theme              text,
  founding_thesis    text,
  started_chapter_id uuid references public.boards(id) on delete set null,
  ended_chapter_id   uuid references public.boards(id) on delete set null,
  created_at         timestamptz default timezone('utc', now())
);

alter table public.seasons enable row level security;

create policy "Users can manage their own seasons"
  on public.seasons
  for all
  using  (founder_id = auth.uid())
  with check (founder_id = auth.uid());

-- Story health reports — one per chapter, generated post-retro
create table if not exists public.story_health_reports (
  id                   uuid primary key default gen_random_uuid(),
  chapter_id           uuid references public.boards(id) on delete cascade,
  project_id           uuid references public.projects(id) on delete cascade,
  chapters_scored      int not null default 0,
  signals              jsonb,
  failing_signal_count int not null default 0,
  patterns_detected    jsonb default '[]'::jsonb,
  recentering_needed   boolean not null default false,
  recentering_type     text,
  created_at           timestamptz default timezone('utc', now())
);

create index if not exists story_health_reports_chapter
  on public.story_health_reports(chapter_id);

create index if not exists story_health_reports_project
  on public.story_health_reports(project_id);

alter table public.story_health_reports enable row level security;

create policy "Users can read their own health reports"
  on public.story_health_reports
  for select
  using (
    exists (
      select 1 from public.boards b
      join public.projects p on p.id = b.project_id
      where b.id = story_health_reports.chapter_id
        and p.user_id = auth.uid()
    )
  );

create policy "Users can insert health reports for their chapters"
  on public.story_health_reports
  for insert
  with check (
    exists (
      select 1 from public.boards b
      join public.projects p on p.id = b.project_id
      where b.id = story_health_reports.chapter_id
        and p.user_id = auth.uid()
    )
  );
