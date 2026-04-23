"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";
import { COLUMN_TINTS } from "@/lib/constants";

export function BoardColumnView({
  column,
  tasks,
  onOpenTask,
}: {
  column: BoardColumn;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "surface hairline flex min-h-[420px] min-w-[280px] flex-col rounded-[2rem] p-4 transition md:min-w-[300px]",
        isOver && "ring-2 ring-[var(--accent)]/25",
      )}
    >
      <div className={cn("rounded-[1.5rem] bg-gradient-to-b p-4", COLUMN_TINTS[column.name])}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{column.name}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {tasks.length} card{tasks.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[var(--muted)]">
            {tasks.length}
          </div>
        </div>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-4 flex flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-black/10 bg-white/40 p-6 text-center text-sm text-[var(--muted)]">
              Drop a task here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
