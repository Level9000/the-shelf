-- Tone-of-voice refiner: a synthesized voice guide built from a calibration
-- conversation with Cass, applied to every chapter the Narrative Engine drafts
-- or rewrites for this project. voice_profile holds the current synthesized
-- prose; voice_profile_conversation holds the raw calibration dialogue so it
-- can be resumed or edited later.
alter table public.projects
  add column if not exists voice_profile text,
  add column if not exists voice_profile_updated_at timestamptz,
  add column if not exists voice_profile_conversation jsonb,
  add column if not exists voice_profile_dismissed_at timestamptz;
