-- Rename legacy column names to match the current DEFAULT_COLUMNS in constants.ts.
-- "To Do" → "Stuff I Need to Do"
-- "In Progress" → "Do Today"
-- These renames only touch rows that still carry the old names.

update public.board_columns
set name = 'Stuff I Need to Do'
where name = 'To Do';

update public.board_columns
set name = 'Do Today'
where name = 'In Progress';
