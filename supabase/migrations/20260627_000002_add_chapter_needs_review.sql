-- Paragraph-level chapter editing can ripple into other chapters already written.
-- needs_review_reason is null when a chapter is fine, or a one-line explanation
-- (written by Cass, approved by the founder) when an edit elsewhere means this
-- chapter may need a second look. Non-null doubles as the boolean flag — no
-- separate boolean column needed. Cleared when the founder addresses it in that
-- chapter's own refine conversation.
alter table public.boards
  add column if not exists needs_review_reason text;
