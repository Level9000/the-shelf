"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { TapeButton } from "@/components/ui/tape-button";
import { cn } from "@/lib/utils";

const TAPE_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

// Tape colour matches the post-it body colour for each column
const TAPE_COLORS: Record<string, string> = {
  "Do This Week": "#fde68a",
  "Do Today":     "#bfdbfe",
  "Blocked":      "#fbcfe8",
  "Done":         "#bbf7d0",
};

export function BoardColumnView({
  column,
  tasks,
  onOpenTask,
  onCreateTask,
  showAddButton,
  onPlanWeek,
  onOpenCass,
  dragInProgress,
  allColumns,
  onMoveToColumn,
  boardCompleted,
}: {
  column: BoardColumn;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onCreateTask: (columnId: string) => void;
  showAddButton?: boolean;
  onPlanWeek?: () => void;
  onOpenCass?: () => void;
  dragInProgress?: boolean;
  allColumns?: BoardColumn[];
  onMoveToColumn?: (taskId: string, columnId: string) => void;
  boardCompleted?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const showDropHere = dragInProgress && isOver;

  return (
    <>
      {/* Mobile: full-width tape header */}
      <div className="mb-3 lg:hidden">
        {/* Full-width tape strip — + button lives inside the tape */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Caveat', cursive",
          fontSize: "24px",
          fontWeight: 700,
          padding: "7px 16px 9px",
          background: TAPE_COLORS[column.name] ?? "#e8dfc0",
          clipPath: TAPE_CLIP,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          color: "#1a0e00",
          textTransform: "uppercase",
          width: "100%",
          boxSizing: "border-box",
        }}>
          {column.name}
          {onOpenCass && (
            <button
              type="button"
              onClick={onOpenCass}
              aria-label={`Add task to ${column.name}`}
              style={{
                position: "absolute",
                right: "14px",
                width: "28px", height: "28px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.15)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a0e00",
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {/* Card count */}
        <div style={{ padding: "6px 4px 0" }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(0,0,0,0.35)" }}>
            {tasks.length} card{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <section
        ref={setNodeRef}
        className={cn(
          "surface flex min-h-[420px] min-w-0 flex-col border-b border-black/6 p-4 transition last:border-b-0 lg:border-b-0 lg:border-l-0 lg:border-t-0 lg:border-r lg:last:border-r-0 lg:pt-0",
          showDropHere && "ring-2 ring-[var(--accent)]/40",
        )}
      >
        {/* Desktop: full-width tape header */}
        <div className="hidden flex-col lg:flex -mx-4 mb-2">
          {/* Full-width tape strip — + button lives inside the tape */}
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Caveat', cursive",
            fontSize: "24px",
            fontWeight: 700,
            padding: "10px 16px 12px",
            background: TAPE_COLORS[column.name] ?? "#e8dfc0",
            clipPath: TAPE_CLIP,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            color: "#1a0e00",
            textTransform: "uppercase",
          }}>
            {column.name}
            {onOpenCass && (
              <button
                type="button"
                onClick={onOpenCass}
                aria-label={`Add task to ${column.name}`}
                style={{
                  position: "absolute",
                  right: "14px",
                  width: "28px", height: "28px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.15)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1a0e00",
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {/* Card count */}
          <div style={{ padding: "6px 4px 0" }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(0,0,0,0.35)" }}>
              {tasks.length} card{tasks.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Mobile: full-width add button */}
        {showAddButton && (
          <TapeButton variant="primary" size="sm" onClick={() => onCreateTask(column.id)} className="w-full lg:hidden">
            Add task
          </TapeButton>
        )}

        {onPlanWeek && (
          <div style={{ marginTop: "12px" }}>
            <TapeButton variant="secondary" size="sm" onClick={onPlanWeek}>Plan my week</TapeButton>
          </div>
        )}

        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="relative mt-4 flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                columnName={column.name}
                onOpen={onOpenTask}
                dragInProgress={dragInProgress}
                allColumns={allColumns}
                onMoveToColumn={onMoveToColumn}
                boardCompleted={boardCompleted}
              />
            ))}

            {showDropHere && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-[var(--accent)]/60 bg-[var(--accent)]/8">
                <span className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
                  Drop here
                </span>
              </div>
            )}
          </div>
        </SortableContext>
      </section>
    </>
  );
}
