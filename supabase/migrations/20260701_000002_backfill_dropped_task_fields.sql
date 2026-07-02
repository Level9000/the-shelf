-- One-time backfill for task_dropped fragments written before task_title/reason
-- existed: those rows only ever got the prose `content` string
-- (`Dropped "title" — reason`), which is fully parseable. Guarded by
-- `task_title is null` so this is safe to run more than once.
update public.story_fragments
set
  task_title = substring(content from '^Dropped "(.*)" — .*$'),
  reason = substring(content from '^Dropped ".*" — (.*)$')
where source = 'task_dropped'
  and task_title is null
  and content ~ '^Dropped ".*" — .*$';
