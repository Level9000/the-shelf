"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
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
      {/* Mobile: column title above the card */}
      <div className="mb-3 flex items-center justify-between px-1 lg:hidden">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            fontFamily: "'Caveat', cursive",
            fontSize: "18px",
            fontWeight: 700,
            padding: "4px 14px 5px",
            background: TAPE_COLORS[column.name] ?? "#e8dfc0",
            clipPath: TAPE_CLIP,
            boxShadow: "2px 1px 4px rgba(0,0,0,0.12)",
            color: "#1a0e00",
            display: "inline-block",
          }}>
            {column.name}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(0,0,0,0.35)" }}>
            {tasks.length} card{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
        {onOpenCass && (
          <button
            type="button"
            onClick={onOpenCass}
            aria-label={`Add task to ${column.name}`}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm transition hover:opacity-80 active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <section
        ref={setNodeRef}
        className={cn(
          "surface flex min-h-[420px] min-w-0 flex-col border-b border-black/6 p-4 transition last:border-b-0 lg:border-b-0 lg:border-l-0 lg:border-t-0 lg:border-r lg:last:border-r-0",
          showDropHere && "ring-2 ring-[var(--accent)]/40",
        )}
      >
        {/* Desktop: tape header with title */}
        <div className="hidden items-center justify-between px-4 pb-2 pt-4 lg:flex">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "18px",
              fontWeight: 700,
              padding: "4px 14px 5px",
              background: TAPE_COLORS[column.name] ?? "#e8dfc0",
              clipPath: TAPE_CLIP,
              boxShadow: "2px 1px 4px rgba(0,0,0,0.12)",
              color: "#1a0e00",
              display: "inline-block",
              textTransform: "uppercase",
            }}>
              {column.name}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(0,0,0,0.35)" }}>
              {tasks.length} card{tasks.length === 1 ? "" : "s"}
            </span>
          </div>
          {onOpenCass && (
            <button
              type="button"
              onClick={onOpenCass}
              aria-label={`Add task to ${column.name}`}
              className="flex size-6 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm transition hover:opacity-80 active:scale-95"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        {/* Mobile: full-width add button */}
        {showAddButton && (
          <Button
            className="w-full lg:hidden"
            onClick={() => onCreateTask(column.id)}
          >
            <Plus className="mr-1.5 size-4" />
            Add
          </Button>
        )}

        {onPlanWeek && (
          <button
            onClick={onPlanWeek}
            className="mt-3 w-full rounded-full border border-black/10 bg-white/60 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white/90"
          >
            Plan my week
          </button>
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
            {tasks.length === 0 && !showDropHere && (
              <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-black/10 bg-white/40 p-6 text-center text-sm text-[var(--muted)]">
                No tasks here yet
              </div>
            )}
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
