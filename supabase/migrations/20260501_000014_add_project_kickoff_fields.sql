-- Project-level kickoff story fields
alter table public.projects
  add column if not exists north_star text,
  add column if not exists project_goal text,
  add column if not exists project_audience text,
  add column if not exists project_success text,
  add column if not exists project_biggest_risk text,
  add column if not exists project_kickoff_conversation jsonb,
  add column if not exists project_kickoff_completed_at timestamptz,
  add column if not exists accumulative_story text,
  add column if not exists story_updated_at timestamptz;

-- Proposed chapters from the project kickoff workplan
create table if not exists public.proposed_chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_number int not null,
  title text not null,
  goal text,
  accepted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists proposed_chapters_project_id_idx
  on public.proposed_chapters(project_id);

-- Board flag: set when Chapter 1 is pre-filled from the project kickoff
alter table public.boards
  add column if not exists kickoff_prefilled_at timestamptz;

-- RLS for proposed_chapters: owner and project members can read/write
alter table public.proposed_chapters enable row level security;

create policy "Project owner can manage proposed chapters"
  on public.proposed_chapters
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

create policy "Project members can view proposed chapters"
  on public.proposed_chapters
  for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
    )
  );
