-- Dropped-task fragments previously only encoded "what + why" as prose inside
-- `content`. These columns let the Story tab's chapter-task disclosure render
-- them deterministically; `content` keeps writing the prose version unchanged
-- for Cass/retro to read as before. Populated only when source = 'task_dropped'.
alter table public.story_fragments
  add column if not exists task_title text,
  add column if not exists reason text;
