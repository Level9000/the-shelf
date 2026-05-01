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
        "group relative flex flex-col overflow-hidden rounded-[3px]",
        "shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]",
        "transition-all duration-150",
        colors.body,
        isDragging &&
          "rotate-[2.5deg] scale-[1.04] shadow-[5px_12px_32px_rgba(0,0,0,0.22)]",
        isMoving && "opacity-60",
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {/* Adhesive tab */}
      <div className={cn("flex h-6 shrink-0 items-center justify-end px-2.5", colors.tab)}>
        <GripVertical className="size-3.5 text-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Note body */}
      <div className="flex-1 px-3.5 pb-3 pt-2.5">
        <div className="flex items-start gap-2">
          {dot && (
            <span
              className={cn("mt-[5px] size-2 shrink-0 rounded-full", dot)}
              title={task.priority ?? undefined}
            />
          )}
          <h4 className="text-[13px] font-semibold leading-5 text-[var(--ink)]">
            {task.title}
          </h4>
        </div>

        {task.description ? (
          <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-black/50">
            {task.description}
          </p>
        ) : null}

        {(task.dueDate || task.assigneeName || task.sourceVoiceCaptureId) ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-black/45">
            {task.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.assigneeName && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3" />
                {task.assigneeName}
              </span>
            )}
            {task.sourceVoiceCaptureId && (
              <span className="inline-flex items-center gap-1">
                <MessageSquareText className="size-3" />
                Voice
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Move controls */}
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
