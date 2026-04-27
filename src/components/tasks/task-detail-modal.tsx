"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { formatDate } from "@/lib/utils";

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
  open,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task | null;
  projectId: string;
  boardId: string;
  columns: BoardColumn[];
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
    <Modal
      open={open}
      title="Task detail"
      description="Edit the card, move it between columns, or remove it."
      onClose={onClose}
      className="max-w-3xl"
    >
      <TaskFormFields
        title={currentForm.title}
        description={currentForm.description}
        assigneeName={currentForm.assigneeName}
        priority={currentForm.priority as Task["priority"]}
        dueDate={currentForm.dueDate}
        columnId={currentForm.columnId}
        columns={columns}
        onChange={handleChange}
      />
      <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)] sm:grid-cols-2">
        <div>
          <p className="font-medium text-[var(--ink)]">Created</p>
          <p className="mt-1">{formatDate(currentTask.createdAt)}</p>
        </div>
        <div>
          <p className="font-medium text-[var(--ink)]">Source</p>
          <p className="mt-1">
            {currentTask.sourceTranscript
              ? currentTask.sourceTranscript
              : currentTask.sourceVoiceCaptureId
                ? "Generated from a voice capture."
                : "Manual task"}
          </p>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="mr-2 size-4" />
          Delete task
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
