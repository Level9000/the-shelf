"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COLUMN_TINTS } from "@/lib/constants";

export function BoardColumnView({
  column,
  columns,
  tasks,
  onOpenTask,
  onCreateTask,
  onMoveTask,
  movingTaskId,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onCreateTask: (columnId: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  movingTaskId?: string | null;
}) {
  return (
    <section
      className="surface hairline flex min-h-[420px] min-w-0 flex-col rounded-[2rem] p-4 transition lg:h-full lg:min-h-0"
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
            <Button
              className="h-9 px-3 py-0 text-xs"
              onClick={() => onCreateTask(column.id)}
            >
              <Plus className="mr-1.5 size-3.5" />
              New task
            </Button>
          </div>
        </div>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-4 flex flex-1 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              moveTargets={columns
                .filter((candidate) => candidate.id !== task.columnId)
                .map((candidate) => ({ id: candidate.id, name: candidate.name }))}
              onMove={onMoveTask}
              isMoving={movingTaskId === task.id}
            />
          ))}
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-black/10 bg-white/40 p-6 text-center text-sm text-[var(--muted)]">
              No tasks here yet
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
