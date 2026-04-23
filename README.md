# Shelf

Shelf is a voice-first AI kanban MVP built with Next.js, TypeScript, Tailwind CSS, Supabase, and an OpenAI-backed transcription/task-extraction flow.

The product flow is:

1. Sign in
2. Create a project
3. Record a voice note
4. Transcribe and parse the note into proposed tasks
5. Review and edit those tasks
6. Save accepted tasks to the kanban board
7. Drag cards between `To Do`, `In Progress`, and `Done`

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- OpenAI HTTP APIs for transcription and structured task extraction
- `dnd-kit` for kanban drag-and-drop

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill it in:

```bash
cp .env.example .env.local
```

3. Create a Supabase project and run the SQL migrations in [supabase/migrations](/Users/warren/SmallMachines/the-shelf/supabase/migrations).

4. In Supabase Auth:
- Enable email/password auth.

5. In Supabase URL/API settings:
- Copy the project URL to `NEXT_PUBLIC_SUPABASE_URL`
- Copy the anon key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

6. Add your OpenAI API key to `OPENAI_API_KEY`.

7. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [.env.example](/Users/warren/SmallMachines/the-shelf/.env.example).

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `OPENAI_API_KEY`: OpenAI API key used by the voice processing route
- `OPENAI_API_BASE_URL`: Optional override for the OpenAI API base URL
- `OPENAI_TASK_MODEL`: Optional task extraction model override
- `OPENAI_TRANSCRIPTION_MODEL`: Optional transcription model override

## Supabase schema notes

The migrations create:

- `projects`
- `boards`
- `board_columns`
- `tasks`
- `voice_captures`

It also includes:

- indexes for common board and capture queries
- RLS policies scoped to the authenticated user
- a trigger that automatically creates a default board and the four default columns when a project is created

## App structure

Key areas:

- [src/app/login/page.tsx](/Users/warren/SmallMachines/the-shelf/src/app/login/page.tsx)
- [src/app/dashboard/page.tsx](/Users/warren/SmallMachines/the-shelf/src/app/dashboard/page.tsx)
- [src/app/projects/[projectId]/page.tsx](/Users/warren/SmallMachines/the-shelf/src/app/projects/%5BprojectId%5D/page.tsx)
- [src/app/api/voice/process/route.ts](/Users/warren/SmallMachines/the-shelf/src/app/api/voice/process/route.ts)
- [src/lib/supabase](/Users/warren/SmallMachines/the-shelf/src/lib/supabase)
- [src/lib/ai](/Users/warren/SmallMachines/the-shelf/src/lib/ai)
- [src/components/board](/Users/warren/SmallMachines/the-shelf/src/components/board)
- [src/components/voice](/Users/warren/SmallMachines/the-shelf/src/components/voice)
- [src/components/tasks](/Users/warren/SmallMachines/the-shelf/src/components/tasks)

## Current MVP behavior

- Email/password auth
- Project creation and switching
- Default board + columns per project
- Manual task creation
- Task editing and deletion
- Drag-and-drop with persisted ordering
- Browser-based audio recording
- Transcription + AI task extraction
- Review-before-save task acceptance flow
- Responsive mobile/desktop layout

## Notes

- The OpenAI integration is intentionally wrapped behind server-side helpers in [src/lib/ai/openai.ts](/Users/warren/SmallMachines/the-shelf/src/lib/ai/openai.ts) so the provider can be swapped later.
- The app relies on browser `MediaRecorder`; stopping a recording immediately begins transcription, and audio is kept in request memory only and is not persisted after transcription completes.
