alter table public.boards
  drop constraint if exists boards_project_id_key;

alter table public.boards
  add column if not exists position integer not null default 1000;

update public.boards
set position = 1000
where position is null;

update public.boards
set name = 'Chapter 1'
where name = 'Main Board';

create index if not exists boards_project_id_position_idx
  on public.boards(project_id, position);
