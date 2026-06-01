-- Add terms acceptance tracking to user_profiles
alter table public.user_profiles
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists terms_version      text;

comment on column public.user_profiles.terms_accepted_at is
  'Timestamp when the user accepted the Terms of Service and Privacy Policy.';

comment on column public.user_profiles.terms_version is
  'Version string (YYYY-MM-DD) of the terms the user accepted. Used to detect when re-acceptance is needed after an update.';
