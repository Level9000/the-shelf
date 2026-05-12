-- Ensure chapter retro fields exist on boards.
-- The earlier 20260501_chapter_retro.sql lacked a sequence number and may
-- not have been applied to the remote database.  This migration is idempotent.

alter table boards
  add column if not exists retro_conversation   jsonb,
  add column if not exists chapter_story        text,
  add column if not exists story_length         text check (story_length in ('short', 'long')),
  add column if not exists retro_completed_at   timestamptz,
  add column if not exists shared_at            timestamptz,
  add column if not exists share_slug           text;

-- Unique constraint on share_slug (safe to re-add; ignored if already present).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'boards_share_slug_key'
  ) then
    alter table boards add constraint boards_share_slug_key unique (share_slug);
  end if;
end;
$$;

-- Ensure story_updated_at exists on projects (also from the original migration).
alter table projects
  add column if not exists story_updated_at timestamptz;

-- Public read policy for shared chapters (safe re-create).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'boards' and policyname = 'Public can read shared chapters'
  ) then
    execute $p$
      create policy "Public can read shared chapters"
        on boards for select
        using (share_slug is not null)
    $p$;
  end if;
end;
$$;

-- Public read policy for projects with shared chapters (safe re-create).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'projects' and policyname = 'Public can read projects with shared chapters'
  ) then
    execute $p$
      create policy "Public can read projects with shared chapters"
        on projects for select
        using (
          exists (
            select 1 from boards
            where boards.project_id = projects.id
              and boards.share_slug is not null
          )
        )
    $p$;
  end if;
end;
$$;
