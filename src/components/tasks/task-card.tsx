"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  CheckCircle2,
  GripVertical,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

const POSTIT_PALETTE: Record<string, { body: string; tab: string }> = {
  "Do This Week": { body: "bg-yellow-100", tab: "bg-yellow-200" },
  "Do Today":     { body: "bg-blue-100",   tab: "bg-blue-200"   },
  "Blocked":      { body: "bg-pink-100",   tab: "bg-pink-200"   },
  "Done":         { body: "bg-green-100",  tab: "bg-green-200"  },
};

const DEFAULT_POSTIT = { body: "bg-yellow-100", tab: "bg-yellow-200" };


function NoteBody({ task, columnName }: { task: Task; columnName?: string }) {
  const colors = POSTIT_PALETTE[columnName ?? ""] ?? DEFAULT_POSTIT;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Sticky notes always have light pastel backgrounds — keep text dark.
  // In dark mode soften from pure black to slate so it feels less harsh.
  const titleColor  = isDark ? "#334155" : "rgba(0,0,0,0.80)"; // slate-700 / black-80
  const descColor   = isDark ? "#475569" : "rgba(0,0,0,0.50)"; // slate-600 / black-50
  const metaColor   = isDark ? "#64748b" : "rgba(0,0,0,0.45)"; // slate-500 / black-45

  return (
    <>
      {/* Adhesive tab */}
      <div className={cn("flex h-6 shrink-0 items-center justify-end px-2.5", colors.tab)}>
        <GripVertical className="size-3.5 text-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Note body */}
      <div className="flex-1 px-3.5 pb-3 pt-2.5">
        <div className="flex items-start gap-2">
          <h4 className="text-[13px] font-semibold leading-5" style={{ color: titleColor, fontFamily: "'Lora', Georgia, serif" }}>
            {task.title}
          </h4>
        </div>

        {task.description ? (
          <p className="mt-2 line-clamp-3 text-[13px] leading-5" style={{ color: descColor, fontFamily: "'Lora', Georgia, serif" }}>
            {task.description}
          </p>
        ) : null}

        {(task.isUrgent || task.size || task.dueDate || task.assigneeName || task.sourceVoiceCaptureId) ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]" style={{ color: metaColor }}>
            {task.isUrgent && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                background: "rgba(248,113,113,0.15)", color: "#ef4444",
                border: "1px solid rgba(248,113,113,0.35)",
                borderRadius: "999px", padding: "1px 7px",
              }}>
                !
              </span>
            )}
            {task.size && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                background: "rgba(110,156,231,0.12)", color: "#3b82f6",
                border: "1px solid rgba(110,156,231,0.3)",
                borderRadius: "999px", padding: "1px 7px",
              }}>
                {task.size} effort
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.assigneeName && (
              <span className="inline-flex items-center gap-1" style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                background: "rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "999px", padding: "1px 7px",
              }}>
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
    </>
  );
}

export function TaskCard({
  task,
  columnName,
  onOpen,
  dragInProgress,
  allColumns,
  onMoveToColumn,
  boardCompleted,
}: {
  task: Task;
  columnName?: string;
  onOpen: (taskId: string) => void;
  dragInProgress?: boolean;
  allColumns?: BoardColumn[];
  onMoveToColumn?: (taskId: string, columnId: string) => void;
  boardCompleted?: boolean;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const colors = POSTIT_PALETTE[columnName ?? ""] ?? DEFAULT_POSTIT;

  function handleMoveTo(taskId: string, columnId: string) {
    if (!onMoveToColumn) return;
    if (boardCompleted) {
      // Skip the success animation and call immediately — parent will show the completed modal
      onMoveToColumn(taskId, columnId);
      return;
    }
    setMoved(true);
    setTimeout(() => onMoveToColumn(taskId, columnId), 500);
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", taskId: task.id, columnId: task.columnId },
      disabled: boardCompleted,
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
        isDragging
          ? "rotate-[2.5deg] scale-[1.04] shadow-[5px_12px_32px_rgba(0,0,0,0.22)] z-50 relative"
          : dragInProgress && "opacity-40 grayscale transition-[opacity,filter] duration-150",
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <NoteBody task={task} columnName={columnName} />

      {/* Mobile-only: quick-tap column move buttons */}
      {!boardCompleted && allColumns && onMoveToColumn && (
        <div className="lg:hidden">
          <p className="px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-black/30">
            Move to
          </p>
          <div className="flex divide-x divide-black/8 border-t border-black/8">
            {allColumns
              .filter((col) => col.id !== task.columnId)
              .map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveTo(task.id, col.id);
                  }}
                  className="flex-1 py-2 text-center text-[11px] font-medium text-black/50 transition-colors active:bg-black/8"
                >
                  {col.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Success overlay — fades in on move, card disappears shortly after */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[3px] bg-green-100/90 transition-opacity duration-200",
          moved ? "opacity-100" : "opacity-0",
        )}
      >
        <CheckCircle2 className="size-8 text-green-600 drop-shadow-sm" strokeWidth={1.5} />
      </div>
    </article>
  );
}
