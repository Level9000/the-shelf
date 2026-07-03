-- Completing a task now asks a quick 3-tap feeling check (Excited / Pretty good /
-- Meh) instead of just disappearing off the list. Stored as its own fragment
-- column, mirroring task_title/reason for source = 'task_dropped'.
-- Populated only when source = 'task_completed'.
alter table public.story_fragments
  add column if not exists feeling text;
