-- ── Launch notification list ─────────────────────────────────────────────────
--
-- The marketing site's download pill can't send anyone to the App Store until
-- the app clears review, so instead it offers to tell them when it does. This
-- is where those addresses land.
--
-- The site talks to this table with the anon key, straight from the browser, so
-- the policy below is the only thing standing in front of it. It grants INSERT
-- and nothing else on purpose:
--
--   • no SELECT policy, so the list cannot be read back with the public key.
--     A scraper with the anon key can add an address; it cannot enumerate the
--     ones already there. This also means the client must insert *without*
--     asking for the row back, or the request fails on the read half.
--   • no UPDATE or DELETE, so nobody can rewrite or clear the list.
--
-- One consequence worth knowing before changing the client: an INSERT-only
-- policy cannot serve a PostgREST upsert. `on_conflict` is rejected with 42501,
-- new row violates row-level security, even asking only to ignore duplicates,
-- while the same row inserts fine plainly. So the site inserts plainly and reads
-- 23505 — this table's unique(email) rejecting a repeat — as success. Making
-- upsert work would mean granting UPDATE to anon, which would hand anyone with
-- the public key the ability to rewrite addresses already on the list.
--
-- Read it from the dashboard or with the service role when it's time to send.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.launch_notifications (
  id         uuid primary key default gen_random_uuid(),
  -- Stored already trimmed and lower-cased by the caller, which is what makes
  -- the unique constraint an effective one: "Erik@x.com " and "erik@x.com" are
  -- the same person and should collide rather than land twice.
  email      text not null unique,
  -- Which pill they used — hero, closing ask, or the phone app bar. Costs
  -- nothing to keep and answers "where did people actually ask from".
  source     text,
  created_at timestamptz not null default now()
);

alter table public.launch_notifications enable row level security;

create policy "Anyone can ask to be notified"
  on public.launch_notifications
  for insert
  to anon, authenticated
  with check (true);
