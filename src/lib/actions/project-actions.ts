"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { DEFAULT_COLUMNS } from "@/lib/constants";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const whyItMatters = String(formData.get("whyItMatters") ?? "").trim();
  const successLooksLike = String(formData.get("successLooksLike") ?? "").trim();
  const doneDefinition = String(formData.get("doneDefinition") ?? "").trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  if (!description) {
    throw new Error("Project description is required.");
  }

  const { supabase, user } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description,
      goal: goal || null,
      why_it_matters: whyItMatters || null,
      success_looks_like: successLooksLike || null,
      done_definition: doneDefinition || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create project.");
  }

  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectOverviewFieldAction(input: {
  projectId: string;
  field: "goal" | "whyItMatters" | "successLooksLike" | "doneDefinition";
  value: string;
}) {
  const value = input.value.trim();

  if (!value) {
    throw new Error("Overview content cannot be empty.");
  }

  const fieldMap = {
    goal: "goal",
    whyItMatters: "why_it_matters",
    successLooksLike: "success_looks_like",
    doneDefinition: "done_definition",
  } as const;

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("projects")
    .update({
      [fieldMap[input.field]]: value,
    })
    .eq("id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

export async function updateProjectOverviewAction(input: {
  projectId: string;
  name: string;
  description: string;
  goal: string;
  whyItMatters: string;
  successLooksLike: string;
  doneDefinition: string;
}) {
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name) {
    throw new Error("Project title is required.");
  }

  if (!description) {
    throw new Error("Project description is required.");
  }

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("projects")
    .update({
      name,
      description,
      goal: input.goal.trim() || null,
      why_it_matters: input.whyItMatters.trim() || null,
      success_looks_like: input.successLooksLike.trim() || null,
      done_definition: input.doneDefinition.trim() || null,
    })
    .eq("id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

export async function updateBoardOverviewFieldAction(input: {
  projectId: string;
  boardId: string;
  field: "goal" | "whyItMatters" | "successLooksLike" | "doneDefinition";
  value: string;
}) {
  const value = input.value.trim();

  if (!value) {
    throw new Error("Overview content cannot be empty.");
  }

  const fieldMap = {
    goal: "goal",
    whyItMatters: "why_it_matters",
    successLooksLike: "success_looks_like",
    doneDefinition: "done_definition",
  } as const;

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("boards")
    .update({
      [fieldMap[input.field]]: value,
    })
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}

export async function updateBoardOverviewAction(input: {
  projectId: string;
  boardId: string;
  name: string;
  goal: string;
  whyItMatters: string;
  successLooksLike: string;
  doneDefinition: string;
}) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Chapter title is required.");
  }

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("boards")
    .update({
      name,
      goal: input.goal.trim() || null,
      why_it_matters: input.whyItMatters.trim() || null,
      success_looks_like: input.successLooksLike.trim() || null,
      done_definition: input.doneDefinition.trim() || null,
    })
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function inviteProjectMemberAction(input: {
  projectId: string;
  email: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Email is required.");
  }

  const { supabase, user } = await getAuthenticatedUser();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found.");
  }

  if (String(project.user_id) !== user.id) {
    throw new Error("Only the project owner can grant access.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    throw new Error("That email does not belong to an authenticated Shelf user yet.");
  }

  if (String(profile.id) === user.id) {
    throw new Error("You already own this project.");
  }

  const { error: insertError } = await supabase.from("project_members").insert({
    project_id: input.projectId,
    user_id: profile.id,
    invited_by: user.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("That user already has access to this project.");
    }
    throw new Error(insertError.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

export async function revokeProjectMemberAction(input: {
  projectId: string;
  userId: string;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found.");
  }

  if (String(project.user_id) !== user.id) {
    throw new Error("Only the project owner can revoke access.");
  }

  if (input.userId === user.id) {
    throw new Error("The project owner cannot remove themselves.");
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(input: { projectId: string }) {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found.");
  }

  if (String(project.user_id) !== user.id) {
    throw new Error("Only the project owner can delete the project.");
  }

  const { data: boards, error: boardsError } = await supabase
    .from("boards")
    .select("id")
    .eq("project_id", input.projectId);

  if (boardsError) {
    throw new Error(boardsError.message);
  }

  const boardIds = (boards ?? []).map((board) => String(board.id));

  if (boardIds.length > 0) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .in("board_id", boardIds);

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    const { error: columnsError } = await supabase
      .from("board_columns")
      .delete()
      .in("board_id", boardIds);

    if (columnsError) {
      throw new Error(columnsError.message);
    }

    const { error: boardDeleteError } = await supabase
      .from("boards")
      .delete()
      .in("id", boardIds);

    if (boardDeleteError) {
      throw new Error(boardDeleteError.message);
    }
  }

  const { error: captureError } = await supabase
    .from("voice_captures")
    .delete()
    .eq("project_id", input.projectId);

  if (captureError) {
    throw new Error(captureError.message);
  }

  const { error: memberError } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", input.projectId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", input.projectId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/dashboard");
}

export async function deleteChapterAction(input: {
  projectId: string;
  boardId: string;
}) {
  const { supabase } = await getAuthenticatedUser();
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id,project_id")
    .eq("id", input.boardId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (boardError || !board) {
    throw new Error(boardError?.message ?? "Chapter not found.");
  }

  const { error: tasksError } = await supabase
    .from("tasks")
    .delete()
    .eq("board_id", input.boardId);

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const { error: columnsError } = await supabase
    .from("board_columns")
    .delete()
    .eq("board_id", input.boardId);

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const { error: deleteError } = await supabase
    .from("boards")
    .delete()
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
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
          assignee_name: (task.assignee_name as string | null) ?? null,
          priority: (task.priority as string | null) ?? null,
          due_date: (task.due_date as string | null) ?? null,
          position: (index + 1) * 1000,
          created_by: user.id,
          source_voice_capture_id:
            (task.source_voice_capture_id as string | null) ?? null,
          source_template_id:
            (task.source_template_id as string | null) ?? null,
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
