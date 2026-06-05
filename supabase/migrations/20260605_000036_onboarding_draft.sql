-- Add onboarding_draft JSONB column to user_profiles
-- Stores partial onboarding progress so users can resume later

alter table public.user_profiles
  add column if not exists onboarding_draft jsonb;

comment on column public.user_profiles.onboarding_draft is
  'Partial onboarding state. Cleared after first project is created.';
