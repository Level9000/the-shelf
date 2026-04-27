drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_select_accessible" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_select_accessible"
on public.projects
for select
to authenticated
using (public.owns_project(id));

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
