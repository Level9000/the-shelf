alter table public.user_profiles
add column if not exists display_name text,
add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.user_profiles
set updated_at = timezone('utc', now())
where updated_at is null;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop policy if exists "user_profiles_update_own" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;

create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
