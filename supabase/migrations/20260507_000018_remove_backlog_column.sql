-- Remove the backlog column ("Stuff I Need to Do" / legacy "To Do") from all boards.
-- Tasks in that column are moved to "Do This Week" on the same board.
-- If a board has no "Do This Week" column, tasks fall to the first remaining column.

do $$
declare
  backlog_col record;
  target_col_id uuid;
  max_position integer;
begin
  -- Iterate over every backlog column that still exists
  for backlog_col in
    select id, board_id
    from public.board_columns
    where name in ('Stuff I Need to Do', 'To Do')
  loop
    -- Find the "Do This Week" column on the same board
    select id into target_col_id
    from public.board_columns
    where board_id = backlog_col.board_id
      and name = 'Do This Week'
    limit 1;

    -- Fall back to the first non-backlog column if "Do This Week" doesn't exist
    if target_col_id is null then
      select id into target_col_id
      from public.board_columns
      where board_id = backlog_col.board_id
        and id <> backlog_col.id
      order by position asc
      limit 1;
    end if;

    if target_col_id is null then
      continue; -- Nothing to move into; skip (shouldn't happen)
    end if;

    -- Find the highest existing position in the target column so we append
    select coalesce(max(position), 0) into max_position
    from public.tasks
    where column_id = target_col_id;

    -- Re-assign the backlog tasks, appending after existing tasks.
    -- Window functions aren't allowed directly in UPDATE, so compute
    -- new positions in a CTE first then join against it.
    with ranked as (
      select
        id,
        max_position + (row_number() over (order by position asc))::integer * 1000 as new_position
      from public.tasks
      where column_id = backlog_col.id
    )
    update public.tasks t
    set
      column_id = target_col_id,
      position  = ranked.new_position
    from ranked
    where t.id = ranked.id;

    -- Delete the now-empty backlog column
    delete from public.board_columns where id = backlog_col.id;
  end loop;
end;
$$;

-- Update the trigger so new projects never get a backlog column
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
    (created_board_id, 'Do This Week', 1000),
    (created_board_id, 'Do Today',     2000),
    (created_board_id, 'Blocked',      3000),
    (created_board_id, 'Done',         4000);

  return new;
end;
$$;
