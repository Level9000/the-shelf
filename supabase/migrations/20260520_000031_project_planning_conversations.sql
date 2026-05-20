-- ── Project: chapter-planning conversation history ───────────────────────────

-- Stores completed chapter-planning chat threads at the project level.
-- Each element is one completed planning session that may have produced
-- one or more chapters.  Shape: Array<{ completedAt: string; messages: Array<{ role: string; content: string }> }>

alter table public.projects
  add column if not exists planning_conversations jsonb not null default '[]'::jsonb;
