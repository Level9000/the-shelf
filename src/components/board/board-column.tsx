"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { TapeButton } from "@/components/ui/tape-button";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

// Warm cream base (#faf9f4) tinted with each column's accent at ~10%
const COLUMN_BG_LIGHT: Record<string, string> = {
  "Do This Week": "#faf7ec",
  "Do Today":     "#f3f7fe",
  "Blocked":      "#fdf3f8",
  "Done":         "#f3faf6",
};

// Lighter gray base tinted with each column's accent so the hue reads clearly
// against the near-black app background, instead of disappearing into it.
const COLUMN_BG_DARK: Record<string, string> = {
  "Do This Week": "#2e291f",
  "Do Today":     "#232b39",
  "Blocked":      "#32232b",
  "Done":         "#22332a",
};

const EMPTY_STATE_MESSAGES: Record<string, string> = {
  "Do This Week": "nothing planned yet",
  "Do Today":     "nothing for today",
  "Blocked":      "nothing blocked",
  "Done":         "nothing finished yet",
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
  onCreateTask?: (columnId: string) => void;
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

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const showDropHere = dragInProgress && isOver;
  const colBg = isDark
    ? (COLUMN_BG_DARK[column.name] ?? "#1a1a1a")
    : (COLUMN_BG_LIGHT[column.name] ?? "#faf9f4");


  return (
    <>
      {/* Mobile: editorial column header */}
      <div className="mb-3 lg:hidden" style={{ padding: "4px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
            }}>
              {column.name}
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px", fontWeight: 400, letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.22)",
              marginLeft: "10px",
            }}>
              {tasks.length} {tasks.length === 1 ? "card" : "cards"}
            </span>
          </div>
          {onOpenCass && (
            <button
              type="button"
              onClick={onOpenCass}
              aria-label={`Add task to ${column.name}`}
              style={{
                width: "26px", height: "26px",
                borderRadius: "50%",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                flexShrink: 0,
              }}
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>

      <section
        ref={setNodeRef}
        className={cn(
          "flex min-h-[calc(100dvh-56px)] min-w-0 flex-col border-b border-black/6 p-4 transition last:border-b-0 lg:border-b-0 lg:border-l-0 lg:border-t-0 lg:border-r lg:last:border-r-0 lg:pt-0",
          showDropHere && "ring-2 ring-[var(--accent)]/40",
        )}
        style={{
          background: colBg,
          boxShadow: "0 24px 80px rgba(28,24,20,0.06)",
        }}
      >
        {/* Desktop: editorial column header */}
        <div className="hidden lg:flex mb-4" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 0 0" }}>
          <div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
            }}>
              {column.name}
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px", fontWeight: 400, letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.22)",
              marginLeft: "10px",
            }}>
              {tasks.length} {tasks.length === 1 ? "card" : "cards"}
            </span>
          </div>
          {onOpenCass && (
            <button
              type="button"
              onClick={onOpenCass}
              aria-label={`Add task to ${column.name}`}
              style={{
                width: "26px", height: "26px",
                borderRadius: "50%",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                flexShrink: 0,
              }}
            >
              <Plus size={12} />
            </button>
          )}
        </div>

        {/* Mobile: full-width add button */}
        {showAddButton && (
          <TapeButton variant="primary" size="sm" onClick={() => onCreateTask?.(column.id)} className="w-full lg:hidden">
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

        {/* Empty state */}
        {tasks.length === 0 && !showDropHere && (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "48px",
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)",
            }}>
              {EMPTY_STATE_MESSAGES[column.name] ?? "nothing here yet"}
            </span>
          </div>
        )}
      </section>
    </>
  );
}
