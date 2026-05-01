"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

const POSTIT_PALETTE: Record<string, { body: string; tab: string }> = {
  "To Do":         { body: "bg-yellow-100",  tab: "bg-yellow-200"  },
  "Do This Week":  { body: "bg-sky-100",     tab: "bg-sky-200"     },
  "In Progress":   { body: "bg-orange-50",   tab: "bg-orange-200"  },
  "Done":          { body: "bg-green-50",    tab: "bg-green-200"   },
};

const DEFAULT_POSTIT = { body: "bg-yellow-100", tab: "bg-yellow-200" };

function priorityDot(priority: Task["priority"]) {
  if (priority === "high")   return "bg-rose-500";
  if (priority === "medium") return "bg-amber-500";
  if (priority === "low")    return "bg-sky-400";
  return null;
}

export function TaskCard({
  task,
  columnName,
  onOpen,
  moveTargets,
  onMove,
  isMoving,
}: {
  task: Task;
  columnName?: string;
  onOpen: (taskId: string) => void;
  moveTargets: Array<{ id: string; name: string }>;
  onMove: (taskId: string, targetColumnId: string) => void;
  isMoving?: boolean;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const colors = POSTIT_PALETTE[columnName ?? ""] ?? DEFAULT_POSTIT;
  const dot = priorityDot(task.priority);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", taskId: task.id, columnId: task.columnId },
    });

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    if (!pointerStartRef.current) { onOpen(task.id); return; }
    const dx = Math.abs(event.clientX - pointerStartRef.current.x);
    const dy = Math.abs(event.clientY - pointerStartRef.current.y);
    if (dx < 6 && dy < 6) onOpen(task.id);
    pointerStartRef.current = null;
  }

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "surface-card hairline group rounded-[1.5rem] p-4 transition-shadow",
        isDragging && "scale-[0.98] opacity-35 shadow-none",
        isMoving && "opacity-70",
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent task={task} />
      <div
        className="border-t border-black/8 px-2.5 py-1.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          className="h-7 w-full justify-between rounded-sm px-1.5 text-[11px] text-black/45 hover:bg-black/8 hover:text-black/70"
          onClick={() => setMoveMenuOpen((v) => !v)}
          disabled={isMoving || moveTargets.length === 0}
        >
          Move to
          {moveMenuOpen
            ? <ChevronUp className="size-3.5" />
            : <ChevronDown className="size-3.5" />}
        </Button>
        {moveMenuOpen && (
          <div className="mt-1 flex flex-col gap-0.5">
            {moveTargets.map((target) => (
              <Button
                key={target.id}
                variant="ghost"
                className="h-7 w-full justify-center rounded-sm px-1.5 text-[11px] text-black/55 hover:bg-black/8"
                onClick={() => { onMove(task.id, target.id); setMoveMenuOpen(false); }}
                disabled={isMoving}
              >
                {target.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function TaskCardPreview({ task }: { task: Task }) {
  return (
    <article className="surface-card hairline w-[min(360px,calc(100vw-3rem))] rounded-[1.5rem] p-4 shadow-2xl shadow-black/15 ring-1 ring-black/8">
      <TaskCardContent task={task} />
    </article>
  );
}

function TaskCardContent({ task }: { task: Task }) {
  return (
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
  );
}
