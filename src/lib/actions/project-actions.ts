"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { DEFAULT_COLUMNS } from "@/lib/constants";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  const { supabase, user } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create project.");
  }

  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

async function getNextBoardPosition(projectId: string) {
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("boards")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.position ?? 0) + 1000;
}

export async function createChapterAction(input: {
  projectId: string;
  sourceBoardId?: string | null;
  carryIncomplete?: boolean;
  name?: string;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const nextPosition = await getNextBoardPosition(input.projectId);
  const chapterNumber = Math.max(1, Math.round(nextPosition / 1000));
  const chapterName = input.name?.trim() || `Chapter ${chapterNumber}`;

  const { data: newBoard, error: boardError } = await supabase
    .from("boards")
    .insert({
      project_id: input.projectId,
      name: chapterName,
      position: nextPosition,
    })
    .select("*")
    .single();

  if (boardError || !newBoard) {
    throw new Error(boardError?.message ?? "Failed to create chapter.");
  }

  const { data: newColumns, error: columnError } = await supabase
    .from("board_columns")
    .insert(
      DEFAULT_COLUMNS.map((name, index) => ({
        board_id: newBoard.id,
        name,
        position: (index + 1) * 1000,
      })),
    )
    .select("*");

  if (columnError || !newColumns) {
    throw new Error(columnError?.message ?? "Failed to create chapter columns.");
  }

  if (input.carryIncomplete && input.sourceBoardId) {
    const [{ data: sourceColumns, error: sourceColumnError }, { data: sourceTasks, error: sourceTaskError }] =
      await Promise.all([
        supabase.from("board_columns").select("*").eq("board_id", input.sourceBoardId),
        supabase
          .from("tasks")
          .select("*")
          .eq("board_id", input.sourceBoardId)
          .order("position", { ascending: true }),
      ]);

    if (sourceColumnError || sourceTaskError) {
      throw new Error(sourceColumnError?.message ?? sourceTaskError?.message);
    }

    const sourceColumnNameById = new Map(
      (sourceColumns ?? []).map((column) => [String(column.id), String(column.name)]),
    );
    const targetColumnIdByName = new Map(
      newColumns.map((column) => [String(column.name), String(column.id)]),
    );

    const incompleteTasks = (sourceTasks ?? []).filter((task) => {
      const sourceColumnName = sourceColumnNameById.get(String(task.column_id));
      return sourceColumnName && sourceColumnName !== "Done";
    });

    if (incompleteTasks.length > 0) {
      const inserts = incompleteTasks.map((task, index) => {
        const sourceColumnName =
          sourceColumnNameById.get(String(task.column_id)) ?? "To Do";
        const targetColumnId =
          targetColumnIdByName.get(sourceColumnName) ??
          targetColumnIdByName.get("To Do");

        return {
          project_id: input.projectId,
          board_id: String(newBoard.id),
          column_id: targetColumnId,
          title: String(task.title),
          description: (task.description as string | null) ?? null,
          priority: (task.priority as string | null) ?? null,
          due_date: (task.due_date as string | null) ?? null,
          position: (index + 1) * 1000,
          created_by: user.id,
          source_voice_capture_id:
            (task.source_voice_capture_id as string | null) ?? null,
          source_transcript: (task.source_transcript as string | null) ?? null,
        };
      });

      const { error: copyError } = await supabase.from("tasks").insert(inserts);
      if (copyError) {
        throw new Error(copyError.message);
      }
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${newBoard.id}`);

  return {
    chapterId: String(newBoard.id),
  };
}
