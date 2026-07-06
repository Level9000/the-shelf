-- The live, continuously-updated draft of an active chapter's narrative,
-- assembled from daily testimonial check-ins as they come in (see
-- story_fragments, source = 'daily_testimonial'). Distinct from chapter_story,
-- which is the final, retro-generated prose and only ever set once the
-- chapter's retro is complete.
alter table public.boards
  add column if not exists live_draft_story text,
  add column if not exists live_draft_updated_at timestamptz;
