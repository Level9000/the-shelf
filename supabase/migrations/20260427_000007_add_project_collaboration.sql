create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.user_profiles (id, email)
select id, email
from auth.users
where email is not null
on conflict (id) do update set email = excluded.email;

create or replace function public.handle_user_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;

create trigger on_auth_user_created_sync_profile
after insert on auth.users
for each row
execute function public.handle_user_profile_sync();

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, user_id)
);

create index if not exists project_members_project_id_idx
on public.project_members(project_id);

create index if not exists project_members_user_id_idx
on public.project_members(user_id);

create or replace function public.is_project_owner(project_uuid uuid)
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

create or replace function public.owns_project(project_uuid uuid)
returns boolean
language sql
stable
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
as $$
  select exists (
    select 1
    from public.board_columns c
    join public.boards b on b.id = c.board_id
    where c.id = column_uuid and public.owns_project(b.project_id)
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.project_members enable row level security;

create policy "user_profiles_select_authenticated"
on public.user_profiles
for select
to authenticated
using (true);

create policy "project_members_select_accessible"
on public.project_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_project_owner(project_id)
);

create policy "project_members_insert_owner"
on public.project_members
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and public.is_project_owner(project_id)
);

create policy "project_members_delete_owner"
on public.project_members
for delete
to authenticated
using (public.is_project_owner(project_id));

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_accessible"
on public.projects
for select
to authenticated
using (public.owns_project(id));
