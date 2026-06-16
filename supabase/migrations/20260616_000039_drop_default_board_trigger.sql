-- Drop the trigger that auto-creates a blank "Chapter 1" board when a project
-- is inserted. This was designed for the old form-based createProjectAction
-- flow, but the current onboarding (completeProjectKickoffAction) creates the
-- chapter 1 board explicitly with prefill data from the conversation. The
-- trigger was causing two boards to be created on every new project.
drop trigger if exists create_default_board_on_project_insert on public.projects;
drop function if exists public.create_default_board_for_project();
