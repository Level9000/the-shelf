"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import type { BoardColumn, ProjectMember, Task } from "@/types";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { TaskChunkingChat } from "@/components/tasks/task-chunking-chat";
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
  const [chunkingOpen, setChunkingOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const btn = fabRef.current;
    if (!btn) return;
    const expandTimer = setTimeout(() => {
      btn.style.width = "220px";
    }, 700);
    const shrinkTimer = setTimeout(() => {
      if (!btn.matches(":hover")) btn.style.width = "3rem";
    }, 4700);
    return () => {
      clearTimeout(expandTimer);
      clearTimeout(shrinkTimer);
    };
  }, [open]);

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
    {open && chunkingOpen && (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/25 px-4 py-6 backdrop-blur-sm sm:items-center">
        <div className="surface-card hairline relative flex h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] p-6">
          <TaskChunkingChat
            task={currentTask}
            projectId={projectId}
            boardId={boardId}
            onComplete={() => {
              setChunkingOpen(false);
              onDeleted();
            }}
            onClose={() => setChunkingOpen(false)}
          />
        </div>
      </div>
    )}

    <Modal
      open={open}
      title="Task detail"
      description="Edit the card, move it between columns, or remove it."
      onClose={onClose}
      className="max-w-3xl h-[calc(100dvh-3rem)]"
    >
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
      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        <div className="flex flex-1 flex-wrap justify-center gap-3">
          <Button variant="ghost" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="mr-2 size-4" />
            Delete task
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
        <button
          ref={fabRef}
          type="button"
          onClick={() => setChunkingOpen(true)}
          style={{ width: "3rem", transition: "width 300ms ease" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "220px"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "3rem"; }}
          className="group flex h-12 shrink-0 items-center overflow-hidden rounded-full bg-[var(--accent)] text-white shadow-md hover:shadow-lg"
        >
          <span className="flex size-12 shrink-0 items-center justify-center">
            <Sparkles className="size-5" />
          </span>
          <span className="whitespace-nowrap pr-5 text-sm font-medium">
            Need to break this up?
          </span>
        </button>
      </div>
    </Modal>
    </>
  );
}
