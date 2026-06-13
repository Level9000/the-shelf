"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEFAULT_COLUMNS } from "@/lib/constants";

export async function updateProjectBriefAction(
  projectId: string,
  updates: {
    project_goal?: string;
    north_star?: string;
    project_audience?: string;
    project_success?: string;
    project_biggest_risk?: string;
  },
  newConversationEntry?: { role: string; content: string },
): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();

  // Only update fields that are provided AND the existing value is null/empty
  // First fetch existing values
  const { data: existing } = await supabase
    .from("projects")
    .select("project_goal, north_star, project_audience, project_success, project_biggest_risk, project_kickoff_conversation")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!existing) throw new Error("Project not found.");

  // Build update object — only fill in nulls/empty, never overwrite existing content
  const patch: Record<string, unknown> = {};
  if (updates.project_goal && !existing.project_goal) patch.project_goal = updates.project_goal;
  if (updates.north_star && !existing.north_star) patch.north_star = updates.north_star;
  if (updates.project_audience && !existing.project_audience) patch.project_audience = updates.project_audience;
  if (updates.project_success && !existing.project_success) patch.project_success = updates.project_success;
  if (updates.project_biggest_risk && !existing.project_biggest_risk) patch.project_biggest_risk = updates.project_biggest_risk;

  // Append new conversation entry if provided
  if (newConversationEntry) {
    const existingConvo = (existing.project_kickoff_conversation as Array<{role:string;content:string}> | null) ?? [];
    patch.project_kickoff_conversation = [...existingConvo, newConversationEntry];
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function completeProjectKickoffAction(input: {
  name: string;
  northStar: string;
  projectGoal: string;
  projectAudience: string;
  projectSuccess: string;
  projectBiggestRisk: string;
  conversation: Array<{ role: string; content: string }>;
  proposedChapters: Array<{
    chapterNumber: number;
    title: string;
    goal: string;
    prefill?: {
      goal: string;
      value: string;
      measure: string;
      done: string;
    } | null;
  }>;
  createPreludeChapter?: boolean;
}): Promise<{ projectId: string; chapter1Id: string; preludeChapterId?: string }> {
  const { supabase, user } = await getAuthenticatedUser();
  // Use service-role client for the project insert to avoid JWT/RLS propagation
  // issues in server actions. User identity is already verified above.
  const adminClient = createSupabaseAdminClient();

  const accumulativeStory = input.northStar
    ? `${input.northStar}`
    : null;

  // 1. Create the project with all kickoff fields
  const { data: project, error: projectError } = await adminClient
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      description: input.projectGoal.trim() || null,
      north_star: input.northStar.trim() || null,
      project_goal: input.projectGoal.trim() || null,
      project_audience: input.projectAudience.trim() || null,
      project_success: input.projectSuccess.trim() || null,
      project_biggest_risk: input.projectBiggestRisk.trim() || null,
      project_kickoff_conversation: input.conversation,
      project_kickoff_completed_at: new Date().toISOString(),
      accumulative_story: accumulativeStory,
      story_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Failed to create project.");
  }

  const projectId = String(project.id);

  // 2. Insert proposed chapters
  if (input.proposedChapters.length > 0) {
    const { error: chaptersError } = await supabase
      .from("proposed_chapters")
      .insert(
        input.proposedChapters.map((ch) => ({
          project_id: projectId,
          chapter_number: ch.chapterNumber,
          title: ch.title,
          goal: ch.goal || null,
          accepted: true,
        })),
      );

    if (chaptersError) {
      throw new Error(chaptersError.message);
    }
  }

  // 3. Create Chapter 1 board with pre-filled data
  const chapter1 = input.proposedChapters.find((ch) => ch.chapterNumber === 1);
  const chapter1Name = chapter1?.title ?? "Chapter 1";
  const chapter1Prefill = chapter1?.prefill ?? null;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      project_id: projectId,
      name: chapter1Name,
      position: 1000,
      goal: chapter1Prefill?.goal?.trim() || null,
      why_it_matters: chapter1Prefill?.value?.trim() || null,
      success_looks_like: chapter1Prefill?.measure?.trim() || null,
      done_definition: chapter1Prefill?.done?.trim() || null,
      kickoff_prefilled_at: chapter1Prefill ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (boardError || !board) {
    throw new Error(boardError?.message ?? "Failed to create Chapter 1 board.");
  }

  const chapter1Id = String(board.id);

  // 4. Create board columns for Chapter 1
  const { error: columnsError } = await supabase
    .from("board_columns")
    .insert(
      DEFAULT_COLUMNS.map((name, index) => ({
        board_id: chapter1Id,
        name,
        position: (index + 1) * 1000,
      })),
    );

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  // 5. Optionally create a Chronicle chapter (position 0, before chapter 1)
  let preludeChapterId: string | undefined;
  if (input.createPreludeChapter) {
    const { data: preludeBoard, error: preludeError } = await supabase
      .from("boards")
      .insert({
        project_id: projectId,
        name: "The Prelude",
        position: 0,
        chapter_type: "prelude",
      })
      .select("id")
      .single();

    if (!preludeError && preludeBoard) {
      preludeChapterId = String(preludeBoard.id);
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  return { projectId, chapter1Id, preludeChapterId };
}

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

  revalidatePath("/projects");
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
  revalidatePath("/projects");
}

export async function updateProjectArcFieldAction(input: {
  projectId: string;
  field: "northStar" | "accumulativeStory";
  value: string;
}) {
  const value = input.value.trim();

  if (!value) {
    throw new Error("Arc content cannot be empty.");
  }

  const fieldMap = {
    northStar: "north_star",
    accumulativeStory: "accumulative_story",
  } as const;

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("projects")
    .update({ [fieldMap[input.field]]: value })
    .eq("id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/projects");
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
  role?: "author" | "contributor";
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
    role: input.role ?? "author",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("That user already has access to this project.");
    }
    throw new Error(insertError.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/projects");
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
  revalidatePath("/projects");
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

export async function completeChapterKickoffAction(input: {
  projectId: string;
  boardId: string;
  goal: string;
  whyItMatters: string;
  successLooksLike: string;
  doneDefinition: string;
  openingLine: string;
  conversation: Array<{ role: string; content: string }>;
  tasks: Array<{ title: string }>;
  columns: Array<{ id: string; name: string }>;
  // Enhanced storytelling fields
  kickoffBeats?: {
    context:  { previous_chapter_summary: string; incoming_feeling: string };
    work:     { goal: string; why_it_matters: string; success_definition: string; target_completion: string };
    stakes:   { biggest_risk: string; personal_meaning: string; gut_feeling: string };
    confirmed_thesis: string;
  } | null;
  confirmedThesis?: string;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  // Save the chapter overview fields + kickoff metadata
  const { error: boardError } = await supabase
    .from("boards")
    .update({
      goal:                 input.goal.trim() || null,
      why_it_matters:       input.whyItMatters.trim() || null,
      success_looks_like:   input.successLooksLike.trim() || null,
      done_definition:      input.doneDefinition.trim() || null,
      opening_line:         input.openingLine.trim() || null,
      kickoff_conversation: input.conversation,
      kickoff_completed_at: new Date().toISOString(),
      // Enhanced fields
      kickoff_beats:    input.kickoffBeats ?? null,
      confirmed_thesis: (input.confirmedThesis ?? input.kickoffBeats?.confirmed_thesis ?? "").trim() || null,
    })
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (boardError) {
    throw new Error(boardError.message);
  }

  // Insert proposed tasks into the "Do This Week" column
  if (input.tasks.length > 0) {
    const toDoColumn =
      input.columns.find((col) => col.name === "Do This Week") ?? input.columns[0];

    if (toDoColumn) {
      const { data: existingTasks, error: positionError } = await supabase
        .from("tasks")
        .select("position")
        .eq("board_id", input.boardId)
        .eq("column_id", toDoColumn.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (positionError) {
        throw new Error(positionError.message);
      }

      const startPosition = (existingTasks?.position ?? 0) + 1000;

      const inserts = input.tasks.map((task, index) => ({
        project_id: input.projectId,
        board_id: input.boardId,
        column_id: toDoColumn.id,
        title: task.title.trim(),
        description: null,
        assignee_name: null,
        priority: null,
        due_date: null,
        position: startPosition + index * 1000,
        created_by: user.id,
        source_voice_capture_id: null,
        source_template_id: null,
      }));

      const { error: tasksError } = await supabase.from("tasks").insert(inserts);

      if (tasksError) {
        throw new Error(tasksError.message);
      }
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
}

export async function completeChapterRetroAction(input: {
  projectId: string;
  boardId: string;
  conversation: Array<{ role: string; content: string }>;
  // Legacy fields (kept for backwards compat with older flow)
  chapterStory?: string;
  storyLength?: "short" | "long";
  pullQuote?: string;
  accumulativeParagraph?: string;
  // Enhanced storytelling fields
  retroBeats?: {
    accounting:      { overall_rating: string; most_proud_of: string };
    surprise:        { biggest_surprise: string; easier_than_expected: string; harder_than_expected: string; unplanned_events: string };
    learning:        { new_knowledge: string; thinking_shift: string; would_do_differently: string };
    emotional_close: { gut_feeling_delta: string; road_ahead_feeling: string; weighing_or_energizing: string };
  } | null;
  bridgeSentence?: string;
}): Promise<{ shareSlug: string }> {
  const { supabase } = await getAuthenticatedUser();

  // Generate a unique share slug
  const shareSlug =
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8);

  // Build the update — story fields are optional (set by /api/story/generate later)
  const boardUpdate: Record<string, unknown> = {
    retro_conversation: input.conversation,
    retro_completed_at: new Date().toISOString(),
    share_slug:         shareSlug,
    shared_at:          new Date().toISOString(),
    // Enhanced fields
    retro_beats:     input.retroBeats ?? null,
    bridge_sentence: (input.bridgeSentence ?? "").trim() || null,
  };

  // If legacy story fields are provided (old flow), save them too
  if (input.chapterStory) {
    boardUpdate.chapter_story = input.chapterStory.trim();
    boardUpdate.story_length  = input.storyLength ?? "short";
  }

  const { error: boardError } = await supabase
    .from("boards")
    .update(boardUpdate)
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (boardError) {
    throw new Error(boardError.message);
  }

  // Append accumulative paragraph to the project story (legacy + new flow)
  if (input.accumulativeParagraph) {
    const { data: project, error: projectReadError } = await supabase
      .from("projects")
      .select("accumulative_story")
      .eq("id", input.projectId)
      .maybeSingle();

    if (projectReadError) {
      throw new Error(projectReadError.message);
    }

    const existingStory = (project?.accumulative_story as string | null) ?? "";
    const updatedStory  = existingStory
      ? `${existingStory}\n\n${input.accumulativeParagraph.trim()}`
      : input.accumulativeParagraph.trim();

    const { error: projectError } = await supabase
      .from("projects")
      .update({
        accumulative_story: updatedStory,
        story_updated_at:   new Date().toISOString(),
      })
      .eq("id", input.projectId);

    if (projectError) {
      throw new Error(projectError.message);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/story/${shareSlug}`);

  return { shareSlug };
}

/**
 * Called after /api/story/generate completes to update the project accumulative
 * story with the new chapter body and revalidate paths.
 */
export async function updateChapterStoryAfterGenerationAction(input: {
  projectId: string;
  boardId:   string;
  shareSlug: string;
  chapterBody: string;
}): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  // Append first two sentences of the chapter body as the accumulative paragraph
  const sentences     = input.chapterBody.split(/(?<=[.!?])\s+/);
  const accumulativeParagraph = sentences.slice(0, 2).join(" ").trim();

  const { data: project, error: projectReadError } = await supabase
    .from("projects")
    .select("accumulative_story")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectReadError) {
    throw new Error(projectReadError.message);
  }

  if (accumulativeParagraph) {
    const existingStory = (project?.accumulative_story as string | null) ?? "";
    const updatedStory  = existingStory
      ? `${existingStory}\n\n${accumulativeParagraph}`
      : accumulativeParagraph;

    await supabase
      .from("projects")
      .update({
        accumulative_story: updatedStory,
        story_updated_at:   new Date().toISOString(),
      })
      .eq("id", input.projectId);
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/story/${input.shareSlug}`);
}

export async function endChapterEarlyAction(input: {
  projectId: string;
  boardId: string;
  handleIncompleteTasks: "carry_over" | "delete";
}): Promise<{ nextChapterId: string | null }> {
  const { supabase, user } = await getAuthenticatedUser();

  if (input.handleIncompleteTasks === "delete") {
    // Find the Done column so we can delete everything else
    const { data: columns, error: columnsError } = await supabase
      .from("board_columns")
      .select("id,name")
      .eq("board_id", input.boardId);

    if (columnsError) {
      throw new Error(columnsError.message);
    }

    const doneColumnId = (columns ?? []).find(
      (col) => String(col.name).toLowerCase() === "done",
    )?.id;

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id,column_id")
      .eq("board_id", input.boardId);

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    const incompleteTaskIds = (tasks ?? [])
      .filter((t) => !doneColumnId || String(t.column_id) !== String(doneColumnId))
      .map((t) => String(t.id));

    if (incompleteTaskIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .in("id", incompleteTaskIds);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
    revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);

    return { nextChapterId: null };
  }

  // carry_over: create a new chapter and move incomplete tasks there
  const nextPosition = await getNextBoardPosition(input.projectId);
  const chapterNumber = Math.max(1, Math.round(nextPosition / 1000));

  const { data: newBoard, error: boardError } = await supabase
    .from("boards")
    .insert({
      project_id: input.projectId,
      name: `Chapter ${chapterNumber}`,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (boardError || !newBoard) {
    throw new Error(boardError?.message ?? "Failed to create next chapter.");
  }

  const nextChapterId = String(newBoard.id);

  const { data: newColumns, error: columnsError } = await supabase
    .from("board_columns")
    .insert(
      DEFAULT_COLUMNS.map((name, index) => ({
        board_id: nextChapterId,
        name,
        position: (index + 1) * 1000,
      })),
    )
    .select("id,name");

  if (columnsError || !newColumns) {
    throw new Error(columnsError?.message ?? "Failed to create columns.");
  }

  // Copy incomplete tasks to the new chapter
  const { data: sourceColumns } = await supabase
    .from("board_columns")
    .select("id,name")
    .eq("board_id", input.boardId);

  const { data: sourceTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", input.boardId)
    .order("position", { ascending: true });

  const sourceColumnNameById = new Map(
    (sourceColumns ?? []).map((col) => [String(col.id), String(col.name)]),
  );
  const targetColumnIdByName = new Map(
    newColumns.map((col) => [String(col.name), String(col.id)]),
  );

  const incompleteTasks = (sourceTasks ?? []).filter((task) => {
    const colName = sourceColumnNameById.get(String(task.column_id));
    return colName && colName.toLowerCase() !== "done";
  });

  if (incompleteTasks.length > 0) {
    const inserts = incompleteTasks.map((task, index) => {
      const sourceColName =
        sourceColumnNameById.get(String(task.column_id)) ?? "Do This Week";
      const targetColId =
        targetColumnIdByName.get(sourceColName) ??
        targetColumnIdByName.get("Do This Week");

      return {
        project_id: input.projectId,
        board_id: nextChapterId,
        column_id: targetColId,
        title: String(task.title),
        description: (task.description as string | null) ?? null,
        assignee_name: (task.assignee_name as string | null) ?? null,
        priority: (task.priority as string | null) ?? null,
        due_date: (task.due_date as string | null) ?? null,
        position: (index + 1) * 1000,
        created_by: user.id,
        source_voice_capture_id: (task.source_voice_capture_id as string | null) ?? null,
        source_template_id: (task.source_template_id as string | null) ?? null,
        source_transcript: (task.source_transcript as string | null) ?? null,
      };
    });

    const { error: copyError } = await supabase.from("tasks").insert(inserts);
    if (copyError) {
      throw new Error(copyError.message);
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${nextChapterId}`);

  return { nextChapterId };
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

/**
 * Moves a specific set of tasks out of the current chapter into a new stub
 * chapter (no kickoff required). The current chapter's backlog shrinks to only
 * the tasks the founder committed to finishing.
 */
export async function deferTasksToNextChapterAction(input: {
  projectId: string;
  boardId: string;
  taskIds: string[];
}): Promise<{ nextChapterId: string; nextChapterName: string }> {
  const { supabase, user } = await getAuthenticatedUser();

  if (input.taskIds.length === 0) {
    throw new Error("No tasks to defer.");
  }

  // Verify the tasks actually belong to this board
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("board_id", input.boardId)
    .in("id", input.taskIds);

  if (tasksError) throw new Error(tasksError.message);

  const validIds = (tasks ?? []).map((t) => String(t.id));
  if (validIds.length === 0) throw new Error("None of the specified tasks belong to this chapter.");

  // Create the next stub chapter
  const nextPosition = await getNextBoardPosition(input.projectId);
  const chapterNumber = Math.max(1, Math.round(nextPosition / 1000));

  const { data: newBoard, error: boardError } = await supabase
    .from("boards")
    .insert({
      project_id: input.projectId,
      name: `Chapter ${chapterNumber}`,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (boardError || !newBoard) {
    throw new Error(boardError?.message ?? "Failed to create next chapter.");
  }

  const nextChapterId = String(newBoard.id);
  const nextChapterName = `Chapter ${chapterNumber}`;

  // Create default columns for the new chapter
  const { data: newColumns, error: columnsError } = await supabase
    .from("board_columns")
    .insert(
      DEFAULT_COLUMNS.map((name, index) => ({
        board_id: nextChapterId,
        name,
        position: (index + 1) * 1000,
      })),
    )
    .select("id,name");

  if (columnsError || !newColumns) {
    throw new Error(columnsError?.message ?? "Failed to create columns.");
  }

  const doThisWeekId = newColumns.find((c) => c.name === "Do This Week")?.id;
  if (!doThisWeekId) throw new Error("Could not find 'Do This Week' column.");

  // Move deferred tasks into the new chapter
  const { error: moveError } = await supabase
    .from("tasks")
    .update({
      board_id: nextChapterId,
      column_id: doThisWeekId,
      updated_at: new Date().toISOString(),
    })
    .in("id", validIds);

  if (moveError) throw new Error(moveError.message);

  // Suppress unused variable warning — user is fetched for auth but not used directly
  void user;

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}/board`);
  revalidatePath(`/projects/${input.projectId}/chapters/${nextChapterId}`);

  return { nextChapterId, nextChapterName };
}

export async function createPlannedChaptersAction(input: {
  projectId: string;
  chapters: Array<{ name: string; goal: string }>;
  /** The full planning dialogue to archive alongside the created chapters. */
  conversation?: Array<{ role: string; content: string }>;
}): Promise<{ chapterIds: string[] }> {
  const { supabase } = await getAuthenticatedUser();
  const chapterIds: string[] = [];

  for (const chapter of input.chapters) {
    const nextPosition = await getNextBoardPosition(input.projectId);

    const { data: board, error: boardError } = await supabase
      .from("boards")
      .insert({
        project_id: input.projectId,
        name: chapter.name.trim(),
        position: nextPosition,
        goal: chapter.goal.trim() || null,
        kickoff_prefilled_at: chapter.goal.trim() ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (boardError || !board) {
      throw new Error(boardError?.message ?? "Failed to create chapter.");
    }

    const { error: columnsError } = await supabase
      .from("board_columns")
      .insert(
        DEFAULT_COLUMNS.map((name, index) => ({
          board_id: board.id,
          name,
          position: (index + 1) * 1000,
        })),
      );

    if (columnsError) {
      throw new Error(columnsError.message);
    }

    chapterIds.push(String(board.id));
  }

  // Persist the planning dialogue so it appears in the chronicle chat history.
  if (input.conversation && input.conversation.length > 0) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("planning_conversations")
      .eq("id", input.projectId)
      .single();

    const existing =
      (projectRow?.planning_conversations as Array<{
        completedAt: string;
        messages: Array<{ role: string; content: string }>;
      }>) ?? [];

    const newEntry = {
      completedAt: new Date().toISOString(),
      messages: input.conversation,
    };

    await supabase
      .from("projects")
      .update({ planning_conversations: [...existing, newEntry] })
      .eq("id", input.projectId);
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { chapterIds };
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
          sourceColumnNameById.get(String(task.column_id)) ?? "Do This Week";
        const targetColumnId =
          targetColumnIdByName.get(sourceColumnName) ??
          targetColumnIdByName.get("Do This Week");

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

export async function updateChapterStoryAction(input: {
  projectId: string;
  boardId: string;
  chapterStory: string;
}): Promise<void> {
  const story = input.chapterStory.trim();
  if (!story) throw new Error("Chapter story cannot be empty.");

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("boards")
    .update({ chapter_story: story })
    .eq("id", input.boardId)
    .eq("project_id", input.projectId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/chapters/${input.boardId}`);
}
