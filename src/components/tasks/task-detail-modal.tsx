"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { BoardColumn, ProjectMember, Task } from "@/types";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { CassRecorder } from "@/components/cass/CassRecorder";
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
  onOpenCass,
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
  onOpenCass?: () => void;
}) {
  const [form, setForm] = useState<FormState | null>(task ? toFormState(task) : null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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
        {onOpenCass && (
          <button
            ref={fabRef}
            type="button"
            onClick={onOpenCass}
            style={{
              width: "3rem",
              height: "3rem",
              transition: "width 300ms ease, box-shadow 200ms ease",
              background: "#1f1a10",
              boxShadow: "0 0 0 2px rgba(200,168,107,0.75), 0 0 14px rgba(200,168,107,0.2), 0 4px 16px rgba(0,0,0,0.4)",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.width = "220px";
              e.currentTarget.style.boxShadow = "0 0 0 2.5px rgba(200,168,107,0.95), 0 0 20px rgba(200,168,107,0.3), 0 6px 20px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.width = "3rem";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(200,168,107,0.75), 0 0 14px rgba(200,168,107,0.2), 0 4px 16px rgba(0,0,0,0.4)";
            }}
          >
            {/* Cass recorder circle */}
            <span style={{ width: "3rem", height: "3rem", flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: "scale(0.4) translateY(-6.5px)", filter: "brightness(1.8) contrast(1.1)" }}>
                <CassRecorder animState="idle" size="sm" />
              </div>
            </span>
            {/* Hover label */}
            <span style={{ whiteSpace: "nowrap", paddingRight: "18px", fontFamily: "var(--font-cass)", fontSize: "11px", letterSpacing: "0.5px", color: "#c8a86b" }}>
              Need to break this up?
            </span>
          </button>
        )}
      </div>
    </Modal>
    </>
  );
}
