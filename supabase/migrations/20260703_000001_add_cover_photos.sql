-- Cover photos for the Story tab, matching the magazine/chronicle visual
-- direction: one hero photo per chapter, and one for the project overview
-- ("the story so far").
alter table public.projects
  add column if not exists cover_image_url text;

alter table public.boards
  add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public)
values ('chapter-photos', 'chapter-photos', true)
on conflict (id) do nothing;

-- Public read (cover photos are meant to be seen, same spirit as share cards).
create policy "chapter_photos_select_public"
on storage.objects
for select
to public
using (bucket_id = 'chapter-photos');

-- Object paths are always "{project_id}/..." — reuse the existing
-- owns_project() helper (see 20260427_000008_fix_project_access_rls_recursion.sql)
-- so anyone with owner/author/contributor access to the project can manage
-- its cover photos, same as the boards/tasks tables.
create policy "chapter_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chapter-photos'
  and public.owns_project((storage.foldername(name))[1]::uuid)
);

create policy "chapter_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chapter-photos'
  and public.owns_project((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'chapter-photos'
  and public.owns_project((storage.foldername(name))[1]::uuid)
);

create policy "chapter_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chapter-photos'
  and public.owns_project((storage.foldername(name))[1]::uuid)
);
