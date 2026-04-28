"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, MessageSquareText, UserRound } from "lucide-react";
import type { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  moveTargets,
  onMove,
  isMoving,
}: {
  task: Task;
  onOpen: (taskId: string) => void;
  moveTargets: Array<{ id: string; name: string }>;
  onMove: (taskId: string, targetColumnId: string) => void;
  isMoving?: boolean;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
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

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    if (!pointerStartRef.current) {
      onOpen(task.id);
      return;
    }

    const movedX = Math.abs(event.clientX - pointerStartRef.current.x);
    const movedY = Math.abs(event.clientY - pointerStartRef.current.y);

    if (movedX < 6 && movedY < 6) {
      onOpen(task.id);
    }

    pointerStartRef.current = null;
  }

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
        isMoving && "opacity-70",
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="min-w-0 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="rounded-full p-1 text-[var(--muted)] opacity-40 transition group-hover:bg-black/5 group-hover:opacity-100"
            aria-hidden="true"
          >
            <GripVertical className="size-4" />
          </div>
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
          {task.assigneeName ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {task.assigneeName}
            </span>
          ) : null}
          {task.sourceVoiceCaptureId ? (
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="size-3.5" />
              Voice capture
            </span>
          ) : null}
        </div>
      </div>
      <div
        className="mt-4"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Move to:
        </p>
        <div className="flex flex-col gap-2">
          {moveTargets.map((target) => (
            <Button
              key={target.id}
              variant="secondary"
              className="h-10 w-full justify-center rounded-2xl px-3 text-xs"
              onClick={() => onMove(task.id, target.id)}
              disabled={isMoving}
            >
              {target.name}
            </Button>
          ))}
        </div>
      </div>
    </article>
  );
}
