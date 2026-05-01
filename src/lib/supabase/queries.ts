import { cache } from "react";
import { redirect } from "next/navigation";
import type {
  AppUser,
  Board,
  BoardColumn,
  BoardSnapshot,
  ProjectMember,
  ProjectWithChapters,
  Project,
  Task,
  UserProfile,
  VoiceCapture,
  WorkflowTemplate,
  WorkflowTemplateStep,
} from "@/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    goal: (row.goal as string | null) ?? null,
    whyItMatters: (row.why_it_matters as string | null) ?? null,
    successLooksLike: (row.success_looks_like as string | null) ?? null,
    doneDefinition: (row.done_definition as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProjectMember(row: Record<string, unknown>): ProjectMember {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: String(row.user_id),
    email: String(row.email),
    displayName: (row.display_name as string | null) ?? null,
    invitedBy: (row.invited_by as string | null) ?? null,
    role: row.role as ProjectMember["role"],
    createdAt: String(row.created_at),
  };
}

function mapUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: (row.display_name as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

function mapBoard(row: Record<string, unknown>): Board {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    goal: (row.goal as string | null) ?? null,
    whyItMatters: (row.why_it_matters as string | null) ?? null,
    successLooksLike: (row.success_looks_like as string | null) ?? null,
    doneDefinition: (row.done_definition as string | null) ?? null,
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
    assigneeName: (row.assignee_name as string | null) ?? null,
    priority: (row.priority as Task["priority"]) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    position: Number(row.position),
    sourceVoiceCaptureId: (row.source_voice_capture_id as string | null) ?? null,
    sourceTemplateId: (row.source_template_id as string | null) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sourceTranscript: (row.source_transcript as string | null) ?? null,
  };
}

function mapWorkflowTemplateStep(row: Record<string, unknown>): WorkflowTemplateStep {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    position: Number(row.position),
    title: String(row.title),
    description: (row.description as string | null) ?? "",
    suggestedColumn: String(row.suggested_column ?? "To Do"),
    priority: (row.priority as WorkflowTemplateStep["priority"]) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
  };
}

function mapWorkflowTemplate(row: Record<string, unknown>): WorkflowTemplate {
  const steps = Array.isArray(row.workflow_template_steps)
    ? row.workflow_template_steps.map((step) =>
        mapWorkflowTemplateStep(step as Record<string, unknown>),
      ).sort((left, right) => left.position - right.position)
    : [];

  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    triggerPhrase: String(row.trigger_phrase),
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    steps,
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

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const { supabase, user } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, display_name, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? "",
      displayName: null,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return mapUserProfile(data);
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

export async function getProjectAccessSnapshot(projectId: string): Promise<{
  currentUser: AppUser;
  projectMembers: ProjectMember[];
}> {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (!projectRow) {
    redirect("/projects");
  }

  const [{ data: memberData, error: memberError }, { data: ownerProfileRow, error: ownerProfileError }] =
    await Promise.all([
      supabase
        .from("project_members")
        .select("id, project_id, user_id, invited_by, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_profiles")
        .select("email, display_name")
        .eq("id", String(projectRow.user_id))
        .maybeSingle(),
    ]);

  if (memberError || ownerProfileError) {
    throw new Error(memberError?.message ?? ownerProfileError?.message);
  }

  const memberUserIds = [
    String(projectRow.user_id),
    ...(memberData ?? []).map((row) => String(row.user_id)),
  ];

  const { data: memberProfiles, error: memberProfilesError } = await supabase
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", memberUserIds);

  if (memberProfilesError) {
    throw new Error(memberProfilesError.message);
  }

  const profileByUserId = new Map(
    (memberProfiles ?? []).map((row) => [
      String(row.id),
      {
        email: String(row.email),
        displayName: (row.display_name as string | null) ?? null,
      },
    ]),
  );

  return {
    currentUser: {
      id: user.id,
      email: user.email ?? null,
      displayName:
        profileByUserId.get(user.id)?.displayName ??
        ((user.user_metadata?.display_name as string | undefined) ?? null),
    },
    projectMembers: [
      {
        id: `owner-${projectRow.id}`,
        projectId: String(projectRow.id),
        userId: String(projectRow.user_id),
        email:
          profileByUserId.get(String(projectRow.user_id))?.email ??
          String(ownerProfileRow?.email ?? ""),
        displayName:
          profileByUserId.get(String(projectRow.user_id))?.displayName ??
          ((ownerProfileRow?.display_name as string | null) ?? null),
        invitedBy: null,
        role: "owner",
        createdAt: String(projectRow.created_at),
      },
      ...(memberData ?? []).map((row) =>
        mapProjectMember({
          ...row,
          email: profileByUserId.get(String(row.user_id))?.email ?? "",
          display_name: profileByUserId.get(String(row.user_id))?.displayName ?? null,
          role: "editor",
        }),
      ),
    ],
  };
}

export async function getProjectBoardSnapshot(
  projectId: string,
  boardId: string,
): Promise<BoardSnapshot> {
  const { supabase, user } = await getAuthenticatedUser();

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
    redirect("/projects");
  }

  if (boardError || !boardRow) {
    throw new Error(boardError?.message ?? "Board not found.");
  }

  const board = mapBoard(boardRow);

  const [{ data: columnsData, error: columnsError }, { data: tasksData, error: tasksError }, { data: voiceData, error: voiceError }, { data: workflowTemplateData, error: workflowTemplateError }, { data: memberData, error: memberError }, { data: ownerProfileRow, error: ownerProfileError }] =
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
      supabase
        .from("workflow_templates")
        .select("*, workflow_template_steps(*)")
        .eq("user_id", projectRow.user_id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("project_members")
        .select("id, project_id, user_id, invited_by, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_profiles")
        .select("email, display_name")
        .eq("id", projectRow.user_id)
        .maybeSingle(),
    ]);

  if (
    columnsError ||
    tasksError ||
    voiceError ||
    workflowTemplateError ||
    memberError ||
    ownerProfileError
  ) {
    throw new Error(
      columnsError?.message ??
        tasksError?.message ??
        voiceError?.message ??
        workflowTemplateError?.message ??
        memberError?.message ??
        ownerProfileError?.message,
    );
  }

  const memberUserIds = [
    String(projectRow.user_id),
    ...(memberData ?? []).map((row) => String(row.user_id)),
  ];

  const { data: memberProfiles, error: memberProfilesError } = await supabase
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", memberUserIds);

  if (memberProfilesError) {
    throw new Error(memberProfilesError.message);
  }

  const profileByUserId = new Map(
    (memberProfiles ?? []).map((row) => [
      String(row.id),
      {
        email: String(row.email),
        displayName: (row.display_name as string | null) ?? null,
      },
    ]),
  );

  const projectMembers: ProjectMember[] = [
    {
      id: `owner-${projectRow.id}`,
      projectId: String(projectRow.id),
      userId: String(projectRow.user_id),
      email:
        profileByUserId.get(String(projectRow.user_id))?.email ??
        String(ownerProfileRow?.email ?? ""),
      displayName:
        profileByUserId.get(String(projectRow.user_id))?.displayName ??
        ((ownerProfileRow?.display_name as string | null) ?? null),
      invitedBy: null,
      role: "owner",
      createdAt: String(projectRow.created_at),
    },
    ...(memberData ?? []).map((row) =>
      mapProjectMember({
        ...row,
        email: profileByUserId.get(String(row.user_id))?.email ?? "",
        display_name: profileByUserId.get(String(row.user_id))?.displayName ?? null,
        role: "editor",
      }),
    ),
  ];

  return {
    currentUser: {
      id: user.id,
      email: user.email ?? null,
      displayName:
        profileByUserId.get(user.id)?.displayName ??
        ((user.user_metadata?.display_name as string | undefined) ?? null),
    },
    project: mapProject(projectRow),
    projectMembers,
    board,
    columns: (columnsData ?? []).map((row) => mapColumn(row)),
    tasks: (tasksData ?? []).map((row) => mapTask(row)),
    voiceCaptures: (voiceData ?? []).map((row) => mapVoiceCapture(row)),
    workflowTemplates: (workflowTemplateData ?? []).map((row) =>
      mapWorkflowTemplate(row),
    ),
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
