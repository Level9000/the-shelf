-- Seed a test project with 3 chapters (2 completed, 1 in progress) for
-- layout testing of the story tab — headline/subheadline, chapter type tag,
-- pull quote, bridge sentence, and conversation threads. Also seeds each
-- chapter's board tab with columns + sticky-note tasks, and grants the
-- user an active subscription.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/seed-three-chapters.sql
-- or paste into the Supabase SQL editor.
--
-- Safe to re-run: it always creates a *new* project named below, it never
-- touches existing projects/boards for this user.
--
-- To tear down all seeded copies of this test project when you're done,
-- run (uncomment first — cascades and deletes the project's boards too):
--
--   delete from public.projects
--   where name = 'Layout Test — Story Tab Seed'
--     and user_id = 'd401eb7c-6855-40c2-830f-dae4059ed137';

do $$
declare
  v_user_id    uuid := 'd401eb7c-6855-40c2-830f-dae4059ed137';
  v_project_id uuid;
  v_chapter1   uuid;
  v_chapter2   uuid;
  v_chapter3   uuid;
begin
  -- ── Project ────────────────────────────────────────────────────────────
  insert into public.projects (user_id, name, description, north_star)
  values (
    v_user_id,
    'Layout Test — Story Tab Seed',
    'Seed project for testing the story-tab reading layout.',
    'Become the daily tool teams reach for before anything else.'
  )
  returning id into v_project_id;

  -- The project-insert trigger auto-creates a default "Chapter 1" board.
  -- Remove it so we control all 3 chapters explicitly.
  delete from public.boards where project_id = v_project_id;

  -- ── Chapter 1 — completed, "fog" (uncertain, early groundwork) ────────
  insert into public.boards (
    project_id, name, position,
    goal, why_it_matters, success_looks_like, done_definition,
    confirmed_thesis,
    chapter_type, chapter_headline, chapter_subheadline,
    opening_line, chapter_story, story_length,
    bridge_sentence,
    kickoff_conversation, retro_conversation, retro_completed_at,
    story_health_flag
  )
  values (
    v_project_id, 'Chapter 1', 1000,
    'Get alignment on what data we actually have access to.',
    'Nothing else can move until we know what we''re working with.',
    'A documented map of every dataset and who owns it.',
    'Map is shared and confirmed by both eng leads.',
    'We thought this would take a week. It took five, and we still aren''t sure we found everything.',
    'fog',
    'The Map Nobody Could Agree On',
    'Three teams, three versions of the truth, and a deadline that kept slipping',
    'Every team swore their spreadsheet was the real one.',
    E'It started as a two-day task: list the datasets, tag the owners, move on. Four weeks later, the list had been rewritten six times and nobody fully trusted it.\n\nThe problem wasn''t the data — it was that everyone had quietly built around a different version of it. Ford''s program teams had each adapted to their own gaps, and nobody had ever said out loud how different those workarounds were.\n\nGetting alignment meant getting people to admit their corner of the system was incomplete. That took longer than any technical fix would have. By the time the map was real, it wasn''t just a spreadsheet anymore — it was the first shared fact the project had.',
    'long',
    'With the ground finally mapped, the real question became whether anyone would actually use it.',
    '[{"role":"assistant","content":"What does the data landscape actually look like right now?"},{"role":"user","content":"Honestly, a mess — three teams, three sources of truth."}]'::jsonb,
    '[{"role":"assistant","content":"What surprised you most this chapter?"},{"role":"user","content":"How long it took just to get everyone to agree on what was true."}]'::jsonb,
    now() - interval '21 days',
    'none'
  )
  returning id into v_chapter1;

  -- ── Chapter 2 — completed, "win" ───────────────────────────────────────
  insert into public.boards (
    project_id, name, position,
    goal, why_it_matters, success_looks_like, done_definition,
    confirmed_thesis,
    chapter_type, chapter_headline, chapter_subheadline,
    opening_line, chapter_story, story_length,
    bridge_sentence,
    kickoff_conversation, retro_conversation, retro_completed_at,
    story_health_flag
  )
  values (
    v_project_id, 'Chapter 2', 2000,
    'Ship a working prototype to one pilot team.',
    'Proof beats promises — one real team needs to feel the time saved.',
    'Pilot team stops checking the old spreadsheet within two weeks.',
    'Pilot team lead confirms in writing they''ve switched over.',
    'If one team adopts it without being told to, the rest will follow.',
    'win',
    'The Week the Pilot Team Stopped Asking Questions',
    'A two-week bet on whether the tool could replace the habit it was built to kill',
    'Nobody announced the switch. They just stopped opening the old spreadsheet.',
    E'The pilot launched quietly, almost apologetically — a Slack message and a link, nothing more. The expectation was a slow, reluctant adoption.\n\nInstead, by day four, one engineer asked a question in standup that could only have come from the new tool. Nobody had told her to use it instead of the spreadsheet; she just had.\n\nBy the end of the two weeks, the team''s old tracking sheet hadn''t been opened once. That silence was the actual signal — not a survey, not a testimonial, just the absence of the old habit. It was the first real evidence the thesis held.',
    'long',
    'But one team switching quietly is not the same as two hundred teams switching loudly.',
    '[{"role":"assistant","content":"What does a successful pilot look like to you?"},{"role":"user","content":"Honestly? If they just stop opening the old spreadsheet."}]'::jsonb,
    '[{"role":"assistant","content":"What''s the biggest surprise this chapter?"},{"role":"user","content":"Nobody had to be convinced. They just switched."}]'::jsonb,
    now() - interval '7 days',
    'none'
  )
  returning id into v_chapter2;

  -- Board conversations (work sessions) for chapter 2, to test the
  -- collapsed "View conversations" disclosure with multiple threads.
  update public.boards
  set board_conversations = '[
    {"id":"conv-1","mode":"tasks","label":"Pilot kickoff planning","completedAt":"2026-06-08T15:00:00Z","messages":[{"role":"assistant","content":"What does the pilot team need from us in week one?"},{"role":"user","content":"Just access and a 15-minute walkthrough."}],"taskCount":4},
    {"id":"conv-2","mode":"braindump","label":"Mid-pilot check-in","completedAt":"2026-06-12T18:30:00Z","messages":[{"role":"assistant","content":"Anything breaking?"},{"role":"user","content":"Nope, weirdly quiet. Good sign or bad sign?"}],"taskCount":0}
  ]'::jsonb
  where id = v_chapter2;

  -- ── Chapter 3 — in progress, no chapter_type/headline yet ─────────────
  insert into public.boards (
    project_id, name, position,
    goal, why_it_matters, success_looks_like, done_definition,
    confirmed_thesis,
    kickoff_conversation
  )
  values (
    v_project_id, 'Chapter 3', 3000,
    'Roll the tool out to all Ford program teams, not just the pilot.',
    'This is the chapter that decides if it''s a tool or a habit.',
    '80% of program teams have logged in at least once a week for a month.',
    'Adoption dashboard shows sustained weekly usage across teams.',
    'The pilot proved it works for one team. This chapter proves it scales past the team that helped build it.',
    '[{"role":"assistant","content":"What''s the goal for this chapter?"},{"role":"user","content":"Get every program team using this, not just the pilot group."}]'::jsonb
  )
  returning id into v_chapter3;

  -- ── Board columns (current default set) for each chapter ───────────────
  insert into public.board_columns (board_id, name, position)
  select b.id, col.name, col.position
  from (values (v_chapter1), (v_chapter2), (v_chapter3)) as b(id)
  cross join (values
    ('Do This Week', 1000),
    ('Do Today',     2000),
    ('Blocked',      3000),
    ('Done',         4000)
  ) as col(name, position);

  -- ── Sticky notes (tasks) per chapter ─────────────────────────────────────
  -- Chapter 1 — fully worked through, everything landed in Done.
  insert into public.tasks (project_id, board_id, column_id, title, priority, emotional_tag, position, created_by)
  values
    (v_project_id, v_chapter1, (select id from public.board_columns where board_id = v_chapter1 and name = 'Done'),
     'List every dataset Ford program teams touch', 'high', 'neutral', 1000, v_user_id),
    (v_project_id, v_chapter1, (select id from public.board_columns where board_id = v_chapter1 and name = 'Done'),
     'Get sign-off from each team lead on their slice of the map', 'medium', 'dreaded', 2000, v_user_id),
    (v_project_id, v_chapter1, (select id from public.board_columns where board_id = v_chapter1 and name = 'Done'),
     'Reconcile the three conflicting versions of the dataset list', 'high', 'dreaded', 3000, v_user_id);

  -- Chapter 2 — the pilot win, also fully complete.
  insert into public.tasks (project_id, board_id, column_id, title, priority, emotional_tag, position, created_by)
  values
    (v_project_id, v_chapter2, (select id from public.board_columns where board_id = v_chapter2 and name = 'Done'),
     'Onboard pilot team with a 15-minute walkthrough', 'medium', 'excited', 1000, v_user_id),
    (v_project_id, v_chapter2, (select id from public.board_columns where board_id = v_chapter2 and name = 'Done'),
     'Set up usage tracking for the pilot', 'low', 'neutral', 2000, v_user_id),
    (v_project_id, v_chapter2, (select id from public.board_columns where board_id = v_chapter2 and name = 'Done'),
     'Check in mid-pilot for blockers', 'medium', 'neutral', 3000, v_user_id);

  -- Chapter 3 — in progress, spread across columns to look like a live board.
  insert into public.tasks (project_id, board_id, column_id, title, priority, emotional_tag, position, created_by)
  values
    (v_project_id, v_chapter3, (select id from public.board_columns where board_id = v_chapter3 and name = 'Do This Week'),
     'Draft the team-by-team rollout schedule', 'medium', 'neutral', 1000, v_user_id),
    (v_project_id, v_chapter3, (select id from public.board_columns where board_id = v_chapter3 and name = 'Do Today'),
     'Send rollout announcement to all program leads', 'high', 'excited', 1000, v_user_id),
    (v_project_id, v_chapter3, (select id from public.board_columns where board_id = v_chapter3 and name = 'Blocked'),
     'Get security sign-off for org-wide SSO', 'high', 'dreaded', 1000, v_user_id),
    (v_project_id, v_chapter3, (select id from public.board_columns where board_id = v_chapter3 and name = 'Done'),
     'Finalize onboarding doc for new teams', 'low', 'neutral', 1000, v_user_id);

  -- ── Grant paid access ──────────────────────────────────────────────────
  -- A signup trigger already inserts a 'free' row for this user; upsert it
  -- to 'active' so paywalled features are unlocked for layout testing.
  -- platform = 'promotional' marks this as a manually-granted test grant,
  -- not a real Stripe/Apple/Android purchase.
  insert into public.user_subscriptions (
    user_id, platform, status, plan_id, entitlement, current_period_start
  )
  values (
    v_user_id, 'promotional', 'active', 'authored_builder_annual', 'builder_access', now()
  )
  on conflict (user_id) do update set
    platform    = 'promotional',
    status      = 'active',
    plan_id     = 'authored_builder_annual',
    entitlement = 'builder_access',
    current_period_start = now(),
    current_period_end   = null,
    cancel_at_period_end  = false,
    cancelled_at          = null,
    updated_at            = timezone('utc', now());

  raise notice 'Seeded project % with chapters % (completed/fog), % (completed/win), % (in progress); granted active subscription to user %',
    v_project_id, v_chapter1, v_chapter2, v_chapter3, v_user_id;
end $$;
