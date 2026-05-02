-- Chapter retro fields
alter table boards
  add column if not exists retro_conversation jsonb,
  add column if not exists chapter_story text,
  add column if not exists story_length text check (story_length in ('short', 'long')),
  add column if not exists retro_completed_at timestamptz,
  add column if not exists shared_at timestamptz,
  add column if not exists share_slug text unique;

-- Accumulative project story timestamp (accumulative_story column already exists)
alter table projects
  add column if not exists story_updated_at timestamptz;

-- Allow public reads on shared chapters (for /story/[slug] page)
create policy if not exists "Public can read shared chapters"
  on boards for select
  using (share_slug is not null);

-- Allow public reads on projects that have at least one shared chapter
create policy if not exists "Public can read projects with shared chapters"
  on projects for select
  using (
    exists (
      select 1 from boards
      where boards.project_id = projects.id
        and boards.share_slug is not null
    )
  );
