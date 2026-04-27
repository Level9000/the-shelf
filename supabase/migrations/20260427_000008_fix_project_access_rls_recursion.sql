create or replace function public.is_project_owner(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = project_uuid and user_id = auth.uid()
  );
$$;

create or replace function public.owns_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = project_uuid and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members
    where project_id = project_uuid and user_id = auth.uid()
  );
$$;

create or replace function public.owns_board(board_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = board_uuid and public.owns_project(b.project_id)
  );
$$;

create or replace function public.owns_column(column_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_columns c
    join public.boards b on b.id = c.board_id
    where c.id = column_uuid and public.owns_project(b.project_id)
  );
$$;
