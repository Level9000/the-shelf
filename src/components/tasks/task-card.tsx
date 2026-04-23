"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, MessageSquareText } from "lucide-react";
import type { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

function priorityTone(priority: Task["priority"]) {
  if (priority === "high") return "bg-rose-100 text-rose-700";
  if (priority === "medium") return "bg-amber-100 text-amber-700";
  if (priority === "low") return "bg-sky-100 text-sky-700";
  return "bg-black/5 text-[var(--muted)]";
}

export function TaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      taskId: task.id,
      columnId: task.columnId,
    },
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "surface-card hairline group rounded-[1.5rem] p-4 transition-shadow",
        isDragging && "rotate-[1.5deg] shadow-2xl shadow-black/10",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 rounded-full p-1 text-[var(--muted)] opacity-40 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Drag task"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          onClick={() => onOpen(task.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold leading-6 text-[var(--ink)]">
              {task.title}
            </h4>
            <Badge className={priorityTone(task.priority)}>
              {task.priority ? task.priority : "No priority"}
            </Badge>
          </div>
          {task.description ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
              {task.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            {task.dueDate ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDate(task.dueDate)}
              </span>
            ) : null}
            {task.sourceVoiceCaptureId ? (
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="size-3.5" />
                Voice capture
              </span>
            ) : null}
          </div>
        </button>
      </div>
    </article>
  );
}
