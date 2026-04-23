create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  name text not null default 'Main Board',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (board_id, name),
  unique (board_id, position)
);

create table if not exists public.voice_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  audio_path text,
  transcript text,
  ai_parsed_json jsonb,
  status text not null default 'pending_upload'
    check (status in ('pending_upload', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.board_columns(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  priority text check (priority in ('low', 'medium', 'high')),
  due_date date,
  position integer not null default 1000,
  source_voice_capture_id uuid references public.voice_captures(id) on delete set null,
  source_transcript text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists boards_project_id_idx on public.boards(project_id);
create index if not exists board_columns_board_id_position_idx on public.board_columns(board_id, position);
create index if not exists tasks_project_id_column_id_position_idx on public.tasks(project_id, column_id, position);
create index if not exists tasks_board_id_position_idx on public.tasks(board_id, position);
create index if not exists tasks_source_voice_capture_id_idx on public.tasks(source_voice_capture_id);
create index if not exists voice_captures_project_id_created_at_idx on public.voice_captures(project_id, created_at desc);
create index if not exists voice_captures_user_id_idx on public.voice_captures(user_id);

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create or replace function public.create_default_board_for_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_board_id uuid;
begin
  insert into public.boards (project_id, name)
  values (new.id, 'Main Board')
  returning id into created_board_id;

  insert into public.board_columns (board_id, name, position)
  values
    (created_board_id, 'To Do', 1000),
    (created_board_id, 'In Progress', 2000),
    (created_board_id, 'Done', 3000);

  return new;
end;
$$;

drop trigger if exists create_default_board_on_project_insert on public.projects;

create trigger create_default_board_on_project_insert
after insert on public.projects
for each row
execute function public.create_default_board_for_project();

create or replace function public.owns_project(project_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.projects
    where id = project_uuid and user_id = auth.uid()
  );
$$;

create or replace function public.owns_board(board_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.boards b
    join public.projects p on p.id = b.project_id
    where b.id = board_uuid and p.user_id = auth.uid()
  );
$$;

create or replace function public.owns_column(column_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.board_columns c
    join public.boards b on b.id = c.board_id
    join public.projects p on p.id = b.project_id
    where c.id = column_uuid and p.user_id = auth.uid()
  );
$$;

alter table public.projects enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.voice_captures enable row level security;

create policy "projects_select_own"
on public.projects
for select
to authenticated
using (user_id = auth.uid());

create policy "projects_insert_own"
on public.projects
for insert
to authenticated
with check (user_id = auth.uid());

create policy "projects_update_own"
on public.projects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "projects_delete_own"
on public.projects
for delete
to authenticated
using (user_id = auth.uid());

create policy "boards_select_own"
on public.boards
for select
to authenticated
using (public.owns_project(project_id));

create policy "boards_insert_own"
on public.boards
for insert
to authenticated
with check (public.owns_project(project_id));

create policy "boards_update_own"
on public.boards
for update
to authenticated
using (public.owns_project(project_id))
with check (public.owns_project(project_id));

create policy "boards_delete_own"
on public.boards
for delete
to authenticated
using (public.owns_project(project_id));

create policy "board_columns_select_own"
on public.board_columns
for select
to authenticated
using (public.owns_board(board_id));

create policy "board_columns_insert_own"
on public.board_columns
for insert
to authenticated
with check (public.owns_board(board_id));

create policy "board_columns_update_own"
on public.board_columns
for update
to authenticated
using (public.owns_board(board_id))
with check (public.owns_board(board_id));

create policy "board_columns_delete_own"
on public.board_columns
for delete
to authenticated
using (public.owns_board(board_id));

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using (
  public.owns_project(project_id)
  and public.owns_board(board_id)
  and public.owns_column(column_id)
);

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.owns_project(project_id)
  and public.owns_board(board_id)
  and public.owns_column(column_id)
);

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using (
  public.owns_project(project_id)
  and public.owns_board(board_id)
  and public.owns_column(column_id)
);

create policy "tasks_update_own_check"
on public.tasks
as restrictive
for update
to authenticated
with check (
  public.owns_project(project_id)
  and public.owns_board(board_id)
  and public.owns_column(column_id)
);

create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using (public.owns_project(project_id));

create policy "voice_captures_select_own"
on public.voice_captures
for select
to authenticated
using (user_id = auth.uid() and public.owns_project(project_id));

create policy "voice_captures_insert_own"
on public.voice_captures
for insert
to authenticated
with check (user_id = auth.uid() and public.owns_project(project_id));

create policy "voice_captures_update_own"
on public.voice_captures
for update
to authenticated
using (user_id = auth.uid() and public.owns_project(project_id))
with check (user_id = auth.uid() and public.owns_project(project_id));

create policy "voice_captures_delete_own"
on public.voice_captures
for delete
to authenticated
using (user_id = auth.uid() and public.owns_project(project_id));
