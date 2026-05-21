"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COLUMN_TINTS } from "@/lib/constants";

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
        <p className="text-base font-semibold" style={{ fontFamily: "'Special Elite', cursive" }}>
          {column.name}
          <span className="ml-2 text-sm font-normal text-[var(--muted)]" style={{ fontFamily: "inherit" }}>
            {tasks.length} card{tasks.length === 1 ? "" : "s"}
          </span>
        </p>
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
        {/* Desktop: tinted header with title */}
        <div className={cn("hidden items-center justify-between bg-gradient-to-b p-4 lg:flex", COLUMN_TINTS[column.name])}>
          <p className="text-sm font-semibold" style={{ fontFamily: "'Special Elite', cursive" }}>
            {column.name}
            <span className="ml-2 text-xs font-normal text-[var(--muted)]" style={{ fontFamily: "inherit" }}>
              {tasks.length} card{tasks.length === 1 ? "" : "s"}
            </span>
          </p>
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
