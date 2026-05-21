"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import type { BoardConversationEntry, Priority, ProposedTask } from "@/types";

type TaskMutationInput = {
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeName?: string | null;
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
    assignee_name: input.assigneeName?.trim() || null,
    priority: input.priority ?? null,
    due_date: input.dueDate || null,
    position,
    created_by: user.id,
    source_voice_capture_id: input.sourceVoiceCaptureId ?? null,
    source_template_id: null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function updateTaskAction(input: {
  taskId: string;
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeName?: string | null;
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
      assignee_name: input.assigneeName?.trim() || null,
      priority: input.priority ?? null,
      due_date: input.dueDate || null,
    })
    .eq("id", input.taskId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
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
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
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
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function moveTasksToColumnAction(input: {
  projectId: string;
  boardId: string;
  taskIds: string[];
  targetColumnId: string;
}) {
  if (input.taskIds.length === 0) {
    return;
  }

  const { supabase } = await getAuthenticatedUser();
  const startPosition = await getNextTaskPosition(input.boardId, input.targetColumnId);
  for (const [index, taskId] of input.taskIds.entries()) {
    const { error } = await supabase
      .from("tasks")
      .update({
        column_id: input.targetColumnId,
        position: startPosition + index * 1000,
      })
      .eq("id", taskId)
      .eq("project_id", input.projectId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
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

  for (const update of input.updates) {
    const { error } = await supabase
      .from("tasks")
      .update({
        column_id: update.columnId,
        position: update.position,
      })
      .eq("id", update.id)
      .eq("project_id", input.projectId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function acceptProposedTasksAction(input: {
  projectId: string;
  boardId: string;
  captureId: string;
  templateId?: string | null;
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
      input.columnMap.find((column) => column.name === "Do This Week") ??
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
        assignee_name: proposal.assigneeName?.trim() || null,
        priority: proposal.priority ?? null,
        due_date: proposal.dueDate || null,
        position: startPosition + index * 1000,
        created_by: user.id,
        source_voice_capture_id: input.captureId,
        source_template_id: input.templateId ?? null,
      });
    });
  }

  const { error } = await supabase.from("tasks").insert(inserts);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function createTasksFromTemplateAction(input: {
  projectId: string;
  boardId: string;
  templateId: string;
  columnMap: Array<{ id: string; name: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: templateRow, error: templateError } = await supabase
    .from("workflow_templates")
    .select("*, workflow_template_steps(*)")
    .eq("id", input.templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError || !templateRow) {
    throw new Error(templateError?.message ?? "Template not found.");
  }

  const steps = (
    (templateRow as Record<string, unknown>).workflow_template_steps as
      | Array<Record<string, unknown>>
      | undefined
  ?? [])
    .map((step) => ({
      id: String(step.id ?? randomUUID()),
      title: String(step.title ?? "").trim(),
      description: String(step.description ?? "").trim(),
      suggestedColumn: String(step.suggested_column ?? "Do This Week"),
      priority: (step.priority as Priority) ?? null,
      dueDate: (step.due_date as string | null) ?? null,
      position: Number(step.position ?? 0),
    }))
    .filter((step) => step.title.length > 0)
    .sort((left, right) => left.position - right.position);

  if (steps.length === 0) {
    throw new Error("This template does not have any steps yet.");
  }

  const tasksByColumn = new Map<
    string,
    Array<(typeof steps)[number]>
  >();

  steps.forEach((step) => {
    const targetColumn =
      input.columnMap.find((column) => column.name === step.suggestedColumn) ??
      input.columnMap.find((column) => column.name === "Do This Week") ??
      input.columnMap[0];

    if (!targetColumn) return;

    const existing = tasksByColumn.get(targetColumn.id) ?? [];
    existing.push(step);
    tasksByColumn.set(targetColumn.id, existing);
  });

  const inserts: Array<Record<string, unknown>> = [];

  for (const [columnId, columnSteps] of tasksByColumn.entries()) {
    const startPosition = await getNextTaskPosition(input.boardId, columnId);

    columnSteps.forEach((step, index) => {
      inserts.push({
        project_id: input.projectId,
        board_id: input.boardId,
        column_id: columnId,
        title: step.title,
        description: step.description || null,
        assignee_name: null,
        priority: step.priority ?? null,
        due_date: step.dueDate || null,
        position: startPosition + index * 1000,
        created_by: user.id,
        source_voice_capture_id: null,
        source_template_id: input.templateId,
      });
    });
  }

  const { error } = await supabase.from("tasks").insert(inserts);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function createBrainDumpCardsAction(input: {
  projectId: string;
  boardId: string;
  conversationId: string | null;
  columnMap: Array<{ id: string; name: string }>;
  cards: Array<{
    title: string;
    column: string;
    priority: "low" | "medium" | "high";
    context: string;
    rawQuote: string;
    templateId?: string | null;
  }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  if (input.cards.length === 0) return;

  const tasksByColumn = new Map<string, typeof input.cards>();

  for (const card of input.cards) {
    const targetColumn =
      input.columnMap.find((c) => c.name.toLowerCase() === card.column.toLowerCase()) ??
      input.columnMap.find((c) => c.name === "Do This Week") ??
      input.columnMap[0];

    if (!targetColumn) continue;

    const existing = tasksByColumn.get(targetColumn.id) ?? [];
    existing.push(card);
    tasksByColumn.set(targetColumn.id, existing);
  }

  const inserts: Array<Record<string, unknown>> = [];

  for (const [columnId, cards] of tasksByColumn.entries()) {
    const startPosition = await getNextTaskPosition(input.boardId, columnId);
    cards.forEach((card, index) => {
      inserts.push({
        project_id: input.projectId,
        board_id: input.boardId,
        column_id: columnId,
        title: card.title.trim(),
        description: null,
        assignee_name: null,
        priority: card.priority,
        due_date: null,
        position: startPosition + index * 1000,
        created_by: user.id,
        source_voice_capture_id: null,
        source_template_id: card.templateId ?? null,
        context: card.context.trim() || null,
        raw_quote: card.rawQuote.trim() || null,
        created_via: "brain_dump",
      });
    });
  }

  const { error: insertError } = await supabase.from("tasks").insert(inserts);
  if (insertError) throw new Error(insertError.message);

  // Update conversation's captured card count
  if (input.conversationId) {
    const { data: conv } = await supabase
      .from("brain_dump_conversations")
      .select("cards_captured")
      .eq("id", input.conversationId)
      .maybeSingle();
    if (conv) {
      await supabase
        .from("brain_dump_conversations")
        .update({
          cards_captured: ((conv.cards_captured as number) ?? 0) + input.cards.length,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", input.conversationId);
    }
  }

  // Increment usage_count for any template used
  const usedTemplateIds = [...new Set(input.cards.map((c) => c.templateId).filter(Boolean))];
  for (const templateId of usedTemplateIds) {
    const { data: tmpl } = await supabase
      .from("workflow_templates")
      .select("usage_count")
      .eq("id", templateId!)
      .maybeSingle();
    if (tmpl) {
      await supabase
        .from("workflow_templates")
        .update({ usage_count: ((tmpl.usage_count as number) ?? 0) + 1 })
        .eq("id", templateId!);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function saveWorkflowTemplateAction(input: {
  name: string;
  triggerPhrase: string;
  description: string;
  steps: Array<{
    title: string;
    description: string;
    suggestedColumn: string;
    priority: Priority;
    position: number;
  }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  const name = input.name.trim();
  const triggerPhrase = input.triggerPhrase.trim();
  if (!name || !triggerPhrase) throw new Error("Template name and trigger phrase are required.");

  // Upsert template (update if same name already exists for this user)
  const { data: template, error: templateError } = await supabase
    .from("workflow_templates")
    .upsert(
      { user_id: user.id, name, trigger_phrase: triggerPhrase, description: input.description.trim() || null },
      { onConflict: "user_id,name", ignoreDuplicates: false },
    )
    .select("id")
    .maybeSingle();

  if (templateError || !template) {
    throw new Error(templateError?.message ?? "Failed to save template.");
  }

  // Delete old steps then re-insert fresh ones
  await supabase.from("workflow_template_steps").delete().eq("template_id", template.id);

  const stepInserts = input.steps
    .filter((s) => s.title.trim())
    .map((s, i) => ({
      template_id: template.id,
      position: s.position ?? i,
      title: s.title.trim(),
      description: s.description.trim() || null,
      suggested_column: s.suggestedColumn || "Do This Week",
      priority: s.priority ?? null,
      due_date: null,
    }));

  if (stepInserts.length > 0) {
    const { error: stepsError } = await supabase.from("workflow_template_steps").insert(stepInserts);
    if (stepsError) throw new Error(stepsError.message);
  }

  return { id: template.id, name };
}

export async function moveTasksToChapterAction(input: {
  projectId: string;
  taskIds: string[];
  targetBoardId: string;
  deleteInstead?: boolean;
}) {
  const { supabase } = await getAuthenticatedUser();

  if (input.deleteInstead) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", input.taskIds)
      .eq("project_id", input.projectId);
    if (error) throw new Error(error.message);
  } else {
    // Find the best landing column in the target board (Backlog > Do This Week > first column)
    const { data: cols } = await supabase
      .from("board_columns")
      .select("id, name, position")
      .eq("board_id", input.targetBoardId)
      .order("position", { ascending: true });

    const targetColumnId =
      cols?.find((c) => c.name === "Backlog")?.id ??
      cols?.find((c) => c.name === "Do This Week")?.id ??
      cols?.[0]?.id;

    if (!targetColumnId) throw new Error("Target chapter has no columns.");

    // Get the highest position in that column so moved tasks land at the end
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("board_id", input.targetBoardId)
      .eq("column_id", targetColumnId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const basePosition = ((lastTask?.position as number) ?? 0) + 1000;

    for (let i = 0; i < input.taskIds.length; i++) {
      const { error } = await supabase
        .from("tasks")
        .update({
          board_id: input.targetBoardId,
          column_id: targetColumnId,
          position: basePosition + i * 1000,
        })
        .eq("id", input.taskIds[i])
        .eq("project_id", input.projectId);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
}

export async function createNextChapterForDeferAction(input: {
  projectId: string;
  currentChapterCount: number;
}) {
  const { supabase } = await getAuthenticatedUser();
  const chapterName = `Chapter ${input.currentChapterCount + 1}`;

  // Get next position
  const { data: posData } = await supabase
    .from("boards")
    .select("position")
    .eq("project_id", input.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = ((posData?.position as number) ?? 0) + 1000;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({ project_id: input.projectId, name: chapterName, position: nextPosition })
    .select("id, name")
    .single();

  if (boardError || !board) throw new Error(boardError?.message ?? "Failed to create chapter.");

  const DEFAULT_COLUMNS = ["Do This Week", "Do Today", "Blocked", "Done"];
  const { error: colsError } = await supabase.from("board_columns").insert(
    DEFAULT_COLUMNS.map((name, i) => ({ board_id: board.id, name, position: (i + 1) * 1000 })),
  );
  if (colsError) throw new Error(colsError.message);

  revalidatePath(`/projects/${input.projectId}`);
  return { id: String(board.id), name: String(board.name) };
}

export async function createChunkedTasksAction(input: {
  projectId: string;
  boardId: string;
  columnId: string;
  originalTaskId: string;
  tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | null;
  }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: existing } = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", input.boardId)
    .eq("column_id", input.columnId)
    .order("position", { ascending: false })
    .limit(1);

  const basePosition = ((existing?.[0]?.position as number) ?? 0) + 1000;

  const inserts = input.tasks.map((task, index) => ({
    project_id: input.projectId,
    board_id: input.boardId,
    column_id: input.columnId,
    title: task.title.trim(),
    description: task.description?.trim() || null,
    priority: task.priority ?? null,
    position: basePosition + index * 1000,
    created_by: user.id,
    source_template_id: null,
    source_voice_capture_id: null,
    assignee_name: null,
    due_date: null,
  }));

  const { error: insertError } = await supabase.from("tasks").insert(inserts);
  if (insertError) throw new Error(insertError.message);

  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", input.originalTaskId)
    .eq("project_id", input.projectId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

// ── Board conversation history ────────────────────────────────────────────────

export async function saveBoardConversationAction(input: {
  boardId: string;
  projectId: string;
  entry: BoardConversationEntry;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  // Verify the user has access to this board via project ownership or membership
  const { data: board, error: fetchError } = await supabase
    .from("boards")
    .select("id, board_conversations, project_id")
    .eq("id", input.boardId)
    .maybeSingle();

  if (fetchError || !board) return; // Non-critical — silently skip

  const [{ data: project }, { data: membership }] = await Promise.all([
    supabase.from("projects").select("id").eq("id", board.project_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("project_members").select("id").eq("project_id", board.project_id).eq("user_id", user.id).maybeSingle(),
  ]);

  if (!project && !membership) return; // Not authorized

  const existing = (board.board_conversations as BoardConversationEntry[]) ?? [];

  const { error: updateError } = await supabase
    .from("boards")
    .update({ board_conversations: [...existing, input.entry] })
    .eq("id", input.boardId);

  if (updateError) {
    console.error("saveBoardConversationAction: failed to persist", updateError.message);
  }
}
