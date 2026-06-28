-- The backstory nudge now auto-opens its drawer instead of showing a banner.
-- backstory_nudge_dismissed_at gives it the same permanent-dismiss semantics as
-- voice_profile_dismissed_at: closing without finishing stops it from auto-opening
-- again, with the partial conversation (if any) saved as a story_fragments row.
alter table public.projects
  add column if not exists backstory_nudge_dismissed_at timestamptz;
