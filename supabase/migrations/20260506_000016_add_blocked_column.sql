-- Add "Blocked" column to all existing boards, positioned between "Do Today"
-- (or "In Progress" for boards on the old naming) and "Done".

insert into public.board_columns (board_id, name, position)
select
  b.id,
  'Blocked',
  -- Place it halfway between the preceding action column and Done
  case
    when dt.position is not null and done.position is not null
      then (dt.position + done.position) / 2
    when ip.position is not null and done.position is not null
      then (ip.position + done.position) / 2
    when done.position is not null
      then done.position - 500
    else 3500
  end
from public.boards b
-- Don't add if "Blocked" already exists for this board
left join public.board_columns existing
  on existing.board_id = b.id and existing.name = 'Blocked'
-- "Do Today" column (new naming)
left join public.board_columns dt
  on dt.board_id = b.id and dt.name = 'Do Today'
-- "In Progress" column (old naming)
left join public.board_columns ip
  on ip.board_id = b.id and ip.name = 'In Progress'
-- "Done" column
left join public.board_columns done
  on done.board_id = b.id and done.name = 'Done'
where existing.id is null;

-- Update the trigger function to use the new column set for freshly created projects
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
    (created_board_id, 'Stuff I Need to Do', 1000),
    (created_board_id, 'Do This Week',       2000),
    (created_board_id, 'Do Today',           3000),
    (created_board_id, 'Blocked',            4000),
    (created_board_id, 'Done',               5000);

  return new;
end;
$$;
