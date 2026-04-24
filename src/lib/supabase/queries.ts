import { cache } from "react";
import { redirect } from "next/navigation";
import type {
  Board,
  BoardColumn,
  BoardSnapshot,
  ProjectWithChapters,
  Project,
  Task,
  VoiceCapture,
} from "@/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBoard(row: Record<string, unknown>): Board {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    position: Number(row.position ?? 1000),
    createdAt: String(row.created_at),
  };
}

function mapColumn(row: Record<string, unknown>): BoardColumn {
  return {
    id: String(row.id),
    boardId: String(row.board_id),
    name: String(row.name),
    position: Number(row.position),
  };
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    boardId: String(row.board_id),
    columnId: String(row.column_id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    priority: (row.priority as Task["priority"]) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    position: Number(row.position),
    sourceVoiceCaptureId: (row.source_voice_capture_id as string | null) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sourceTranscript: (row.source_transcript as string | null) ?? null,
  };
}

function mapVoiceCapture(row: Record<string, unknown>): VoiceCapture {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    audioPath: (row.audio_path as string | null) ?? null,
    transcript: (row.transcript as string | null) ?? null,
    aiParsedJson:
      (row.ai_parsed_json as VoiceCapture["aiParsedJson"] | null) ?? null,
    status: row.status as VoiceCapture["status"],
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
});

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProjects() {
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapProject(row));
}

export async function getProjectsWithChapters(): Promise<ProjectWithChapters[]> {
  const { supabase } = await getAuthenticatedUser();
  const [{ data: projectData, error: projectError }, { data: boardData, error: boardError }] =
    await Promise.all([
      supabase.from("projects").select("*").order("updated_at", { ascending: false }),
      supabase.from("boards").select("*").order("position", { ascending: true }),
    ]);

  if (projectError || boardError) {
    throw new Error(projectError?.message ?? boardError?.message);
  }

  const boardsByProject = new Map<string, Board[]>();
  (boardData ?? []).forEach((row) => {
    const board = mapBoard(row);
    const current = boardsByProject.get(board.projectId) ?? [];
    current.push(board);
    boardsByProject.set(board.projectId, current);
  });

  return (projectData ?? []).map((row) => {
    const project = mapProject(row);
    return {
      ...project,
      chapters: boardsByProject.get(project.id) ?? [],
    };
  });
}

export async function getProjectBoardSnapshot(
  projectId: string,
  boardId: string,
): Promise<BoardSnapshot> {
  const { supabase } = await getAuthenticatedUser();

  const [{ data: projectRow, error: projectError }, { data: boardRow, error: boardError }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase
        .from("boards")
        .select("*")
        .eq("project_id", projectId)
        .eq("id", boardId)
        .maybeSingle(),
    ]);

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (!projectRow) {
    redirect("/dashboard");
  }

  if (boardError || !boardRow) {
    throw new Error(boardError?.message ?? "Board not found.");
  }

  const board = mapBoard(boardRow);

  const [{ data: columnsData, error: columnsError }, { data: tasksData, error: tasksError }, { data: voiceData, error: voiceError }] =
    await Promise.all([
      supabase
        .from("board_columns")
        .select("*")
        .eq("board_id", board.id)
        .order("position", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .eq("board_id", board.id)
        .order("position", { ascending: true }),
      supabase
        .from("voice_captures")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  if (columnsError || tasksError || voiceError) {
    throw new Error(
      columnsError?.message ?? tasksError?.message ?? voiceError?.message,
    );
  }

  return {
    project: mapProject(projectRow),
    board,
    columns: (columnsData ?? []).map((row) => mapColumn(row)),
    tasks: (tasksData ?? []).map((row) => mapTask(row)),
    voiceCaptures: (voiceData ?? []).map((row) => mapVoiceCapture(row)),
  };
}

export async function getLatestChapterId(projectId: string) {
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("boards")
    .select("id")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}
