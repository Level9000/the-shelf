"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { BoardColumn, ProjectMember, Task } from "@/types";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions/task-actions";
import { TapeButton } from "@/components/ui/tape-button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";

type FormState = {
  title: string;
  description: string;
  assigneeName: string;
  priority: string;
  dueDate: string;
  columnId: string;
};

function toFormState(task: Task): FormState {
  return {
    title: task.title,
    description: task.description ?? "",
    assigneeName: task.assigneeName ?? "",
    priority: task.priority ?? "",
    dueDate: task.dueDate ?? "",
    columnId: task.columnId,
  };
}

export function TaskDetailModal({
  task,
  projectId,
  boardId,
  columns,
  assignableMembers,
  open,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task | null;
  projectId: string;
  boardId: string;
  columns: BoardColumn[];
  assignableMembers: ProjectMember[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<FormState | null>(task ? toFormState(task) : null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!task || !form) {
    return null;
  }

  const currentTask = task;
  const currentForm = form;

  function handleChange(field: string, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateTaskAction({
          taskId: currentTask.id,
          projectId,
          boardId,
          columnId: currentForm.columnId,
          title: currentForm.title,
          description: currentForm.description,
          assigneeName: currentForm.assigneeName || null,
          priority: (currentForm.priority || null) as Task["priority"],
          dueDate: currentForm.dueDate || null,
        });
        onSaved();
        onClose();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save task.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTaskAction({
          taskId: currentTask.id,
          projectId,
          boardId,
        });
        onDeleted();
        onClose();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete task.",
        );
      }
    });
  }

  return (
    <>
    <Modal
      open={open}
      title=""
      onClose={onClose}
      hideHeader
      growWithContent
      className="max-w-lg"
    >
      {/* Gray header — full width, no padding on modal panel */}
      <div className="relative rounded-t-[2rem] bg-[var(--accent-soft)] px-7 pt-8 pb-6 text-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="absolute left-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-black/5 text-[var(--muted)] transition hover:bg-rose-100 hover:text-rose-600"
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </button>
        <h2 className="text-2xl font-bold text-[var(--ink)] font-literata">Edit Task</h2>
      </div>

      {/* Body */}
      <div className="px-6 pt-6 pb-4 space-y-4">
        <TaskFormFields
          title={currentForm.title}
          description={currentForm.description}
          assigneeName={currentForm.assigneeName}
          priority={currentForm.priority as Task["priority"]}
          dueDate={currentForm.dueDate}
          columnId={currentForm.columnId}
          columns={columns}
          assignableMembers={assignableMembers}
          onChange={handleChange}
        />
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex items-center justify-center border-t border-black/6 bg-[var(--surface)] px-6 py-4">
        <TapeButton variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </TapeButton>
      </div>
    </Modal>
    </>
  );
}
