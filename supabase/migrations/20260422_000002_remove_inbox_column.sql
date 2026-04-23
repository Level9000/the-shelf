do $$
declare
  board_record record;
  inbox_column_id uuid;
  todo_column_id uuid;
begin
  for board_record in
    select id from public.boards
  loop
    select id into inbox_column_id
    from public.board_columns
    where board_id = board_record.id and name = 'Inbox'
    limit 1;

    select id into todo_column_id
    from public.board_columns
    where board_id = board_record.id and name = 'To Do'
    limit 1;

    if inbox_column_id is not null and todo_column_id is not null then
      update public.tasks
      set column_id = todo_column_id,
          updated_at = timezone('utc', now())
      where board_id = board_record.id
        and column_id = inbox_column_id;

      delete from public.board_columns
      where id = inbox_column_id;
    end if;
  end loop;

  update public.board_columns
  set position = case name
    when 'To Do' then 1000
    when 'In Progress' then 2000
    when 'Done' then 3000
    else position
  end
  where name in ('To Do', 'In Progress', 'Done');
end $$;
