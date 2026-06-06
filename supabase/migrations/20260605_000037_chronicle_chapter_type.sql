-- Add 'chronicle' to the chapter_type check constraint on boards
alter table public.boards
  drop constraint if exists boards_chapter_type_check;

alter table public.boards
  add constraint boards_chapter_type_check
  check (chapter_type in ('climb', 'win', 'turn', 'fog', 'reframe', 'chronicle'));
