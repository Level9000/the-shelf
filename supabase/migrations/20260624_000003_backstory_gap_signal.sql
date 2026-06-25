-- Backstory completeness as a sixth quiet story-health signal. Tracks the
-- most recently detected gap (something repeatedly implied but never
-- explained across chapters/fragments) and a session counter used to cap
-- how often the Story tab nudges the founder about it.
alter table public.projects
  add column if not exists backstory_gap_note text,
  add column if not exists backstory_gap_detected_at timestamptz,
  add column if not exists backstory_nudge_session_count integer not null default 0;
