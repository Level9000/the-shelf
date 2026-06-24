-- Record what happened to incomplete tasks when a chapter ends, so the
-- retro/story-generation prompt can reference moved/deleted work instead of
-- having it silently vanish from the chapter's task list.
alter table public.boards
  add column if not exists deferred_tasks jsonb;
