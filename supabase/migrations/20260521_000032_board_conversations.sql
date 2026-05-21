-- Add board_conversations JSONB column to boards to persist Cass chat sessions
-- from the board tab (task planning, brain dump, break-up task).
alter table public.boards
  add column if not exists board_conversations jsonb not null default '[]'::jsonb;
