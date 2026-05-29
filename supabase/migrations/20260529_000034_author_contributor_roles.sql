-- ── Add role column to project_members + enforce author/contributor ──────────
--
-- The project_members table previously had no role column; role was fabricated
-- in the query layer as a hardcoded "editor".
--
-- New roles:
--   'owner'       — project creator (stored in projects.user_id, not here)
--   'author'      — can run kickoffs, retros, chapter planning, all AI/story features
--   'contributor' — can manage tasks (create, move, delete) only
--
-- All existing rows default to 'author' since they were invited as full
-- collaborators before this distinction existed.

alter table public.project_members
  add column if not exists role text not null default 'author'
  check (role in ('owner', 'author', 'contributor'));
