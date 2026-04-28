update public.board_columns
set position = position + 100000;

insert into public.board_columns (board_id, name, position)
select b.id, 'Do This Week', 12000
from public.boards b
where not exists (
  select 1
  from public.board_columns c
  where c.board_id = b.id
    and c.name = 'Do This Week'
);

with ranked_columns as (
  select
    id,
    row_number() over (
      partition by board_id
      order by
        case name
          when 'To Do' then 1
          when 'Do This Week' then 2
          when 'In Progress' then 3
          when 'Done' then 4
          else 5
        end,
        position,
        created_at,
        id
    ) as next_position
  from public.board_columns
)
update public.board_columns as columns
set position = ranked_columns.next_position * 1000
from ranked_columns
where columns.id = ranked_columns.id;

create or replace function public.create_default_board_for_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_board_id uuid;
begin
  insert into public.boards (project_id, name, position)
  values (new.id, 'Chapter 1', 1000)
  returning id into created_board_id;

  insert into public.board_columns (board_id, name, position)
  values
    (created_board_id, 'To Do', 1000),
    (created_board_id, 'Do This Week', 2000),
    (created_board_id, 'In Progress', 3000),
    (created_board_id, 'Done', 4000);

  return new;
end;
$$;
