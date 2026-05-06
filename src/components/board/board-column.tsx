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
  dragInProgress,
  allColumns,
  onMoveToColumn,
}: {
  column: BoardColumn;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onCreateTask: (columnId: string) => void;
  showAddButton?: boolean;
  onPlanWeek?: () => void;
  dragInProgress?: boolean;
  allColumns?: BoardColumn[];
  onMoveToColumn?: (taskId: string, columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const showDropHere = dragInProgress && isOver;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "surface hairline flex min-h-[420px] min-w-0 flex-col rounded-[2rem] p-4 transition lg:h-full lg:min-h-0",
        showDropHere && "ring-2 ring-[var(--accent)]/40 ring-offset-2 ring-offset-transparent",
      )}
    >
      <div className={cn("rounded-[1.5rem] bg-gradient-to-b p-4", COLUMN_TINTS[column.name])}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{column.name}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {tasks.length} card{tasks.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {showAddButton && (
              <Button
                className="h-9 px-3 py-0 text-xs"
                onClick={() => onCreateTask(column.id)}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
      {onPlanWeek && tasks.length === 0 && (
        <button
          onClick={onPlanWeek}
          className="mt-3 w-full rounded-full border border-black/10 bg-white/60 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white/90"
        >
          Plan my week
        </button>
      )}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="relative mt-4 flex flex-1 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnName={column.name}
              onOpen={onOpenTask}
              dragInProgress={dragInProgress}
              allColumns={allColumns}
              onMoveToColumn={onMoveToColumn}
            />
          ))}
          {tasks.length === 0 && !showDropHere ? (
            <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-black/10 bg-white/40 p-6 text-center text-sm text-[var(--muted)]">
              No tasks here yet
            </div>
          ) : null}
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
  );
}
