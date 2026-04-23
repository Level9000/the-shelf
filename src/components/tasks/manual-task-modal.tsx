"use client";

import { useState, useTransition } from "react";
import type { Board, BoardColumn, Task } from "@/types";
import { createTaskAction } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";

type FormState = {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  columnId: string;
};

function getInitialState(columns: BoardColumn[]): FormState {
  return {
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    columnId: columns[0]?.id ?? "",
  };
}

export function ManualTaskModal({
  open,
  onClose,
  projectId,
  board,
  columns,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  board: Board;
  columns: BoardColumn[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => getInitialState(columns));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createTaskAction({
          projectId,
          boardId: board.id,
          columnId: form.columnId,
          title: form.title,
          description: form.description,
          priority: (form.priority || null) as Task["priority"],
          dueDate: form.dueDate || null,
        });
        onCreated();
        onClose();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Failed to create task.",
        );
      }
    });
  }

  return (
    <Modal
      open={open}
      title="New task"
      description="Create a task without using voice capture."
      onClose={onClose}
    >
      <TaskFormFields
        title={form.title}
        description={form.description}
        priority={form.priority as Task["priority"]}
        dueDate={form.dueDate}
        columnId={form.columnId}
        columns={columns}
        onChange={handleChange}
      />
      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={isPending}>
          {isPending ? "Creating..." : "Create task"}
        </Button>
      </div>
    </Modal>
  );
}
