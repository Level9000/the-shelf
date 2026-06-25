-- The synthesized "backstory" paragraph that sits above Chapter 1 — what was
-- happening before the story started. Built up over time from conversations
-- with Cass (see story_fragments, source = 'foundation'); this column holds
-- the current synthesized prose, not the raw conversation.
alter table public.projects
  add column if not exists story_foundation text,
  add column if not exists story_foundation_updated_at timestamptz;
