"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import type { Priority, ProposedTask } from "@/types";

type TaskMutationInput = {
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  sourceVoiceCaptureId?: string | null;
};

async function getNextTaskPosition(boardId: string, columnId: string) {
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.position ?? 0) + 1000;
}

export async function createTaskAction(input: TaskMutationInput) {
  const { supabase, user } = await getAuthenticatedUser();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const position = await getNextTaskPosition(input.boardId, input.columnId);
  const { error } = await supabase.from("tasks").insert({
    project_id: input.projectId,
    board_id: input.boardId,
    column_id: input.columnId,
    title,
    description: input.description?.trim() || null,
    priority: input.priority ?? null,
    due_date: input.dueDate || null,
    position,
    created_by: user.id,
    source_voice_capture_id: input.sourceVoiceCaptureId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function updateTaskAction(input: {
  taskId: string;
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
}) {
  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      column_id: input.columnId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? null,
      due_date: input.dueDate || null,
    })
    .eq("id", input.taskId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function deleteTaskAction(input: {
  taskId: string;
  projectId: string;
  boardId: string;
}) {
  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", input.taskId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function moveTaskAction(input: {
  taskId: string;
  projectId: string;
  boardId: string;
  targetColumnId: string;
}) {
  const { supabase } = await getAuthenticatedUser();
  const position = await getNextTaskPosition(input.boardId, input.targetColumnId);

  const { error } = await supabase
    .from("tasks")
    .update({
      column_id: input.targetColumnId,
      position,
    })
    .eq("id", input.taskId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function persistTaskArrangementAction(input: {
  projectId: string;
  boardId: string;
  updates: Array<{ id: string; columnId: string; position: number }>;
}) {
  const { supabase } = await getAuthenticatedUser();

  if (input.updates.length === 0) {
    return;
  }

  const payload = input.updates.map((update) => ({
    id: update.id,
    column_id: update.columnId,
    position: update.position,
  }));

  const { error } = await supabase.from("tasks").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function acceptProposedTasksAction(input: {
  projectId: string;
  boardId: string;
  captureId: string;
  proposals: ProposedTask[];
  columnMap: Array<{ id: string; name: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  if (input.proposals.length === 0) {
    return;
  }

  const tasksByColumn = new Map<string, ProposedTask[]>();

  input.proposals.forEach((proposal) => {
    const targetColumn =
      input.columnMap.find((column) => column.name === proposal.suggestedColumn) ??
      input.columnMap.find((column) => column.name === "To Do") ??
      input.columnMap[0];

    if (!targetColumn) return;

    const existing = tasksByColumn.get(targetColumn.id) ?? [];
    existing.push(proposal);
    tasksByColumn.set(targetColumn.id, existing);
  });

  const inserts: Array<Record<string, unknown>> = [];

  for (const [columnId, proposals] of tasksByColumn.entries()) {
    const startPosition = await getNextTaskPosition(input.boardId, columnId);

    proposals.forEach((proposal, index) => {
      inserts.push({
        project_id: input.projectId,
        board_id: input.boardId,
        column_id: columnId,
        title: proposal.title.trim(),
        description: proposal.description.trim() || null,
        priority: proposal.priority ?? null,
        due_date: proposal.dueDate || null,
        position: startPosition + index * 1000,
        created_by: user.id,
        source_voice_capture_id: input.captureId,
      });
    });
  }

  const { error } = await supabase.from("tasks").insert(inserts);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}
