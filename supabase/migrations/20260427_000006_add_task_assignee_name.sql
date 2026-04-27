alter table public.tasks
add column if not exists assignee_name text;

create index if not exists tasks_assignee_name_idx
on public.tasks(assignee_name);
