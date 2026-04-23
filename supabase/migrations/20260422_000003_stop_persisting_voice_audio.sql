alter table public.voice_captures
alter column audio_path drop not null;

update public.voice_captures
set audio_path = null
where audio_path is not null;

delete from storage.objects
where bucket_id = 'voice-notes';

drop policy if exists "voice_notes_select_own" on storage.objects;
drop policy if exists "voice_notes_insert_own" on storage.objects;
drop policy if exists "voice_notes_update_own" on storage.objects;
drop policy if exists "voice_notes_delete_own" on storage.objects;

delete from storage.buckets
where id = 'voice-notes';
