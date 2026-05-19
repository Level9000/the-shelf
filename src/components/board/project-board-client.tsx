"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  type CollisionDetection,
  type Modifier,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BoardColumn, BoardSnapshot, ProposedTask, Task } from "@/types";
import {
  deleteTaskAction,
  moveTaskAction,
  persistTaskArrangementAction,
} from "@/lib/actions/task-actions";
import { normalizeTaskOrder } from "@/lib/board-utils";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Chapter } from "@/types";
import { BoardColumnView } from "@/components/board/board-column";
import { CassBoardDrawer, CassBoardFab } from "@/components/board/cass-board-drawer";
import { ManualTaskModal } from "@/components/tasks/manual-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { VoiceProcessingResult } from "@/components/voice/voice-capture-panel";
import { ReviewTasksModal } from "@/components/voice/review-tasks-modal";
import { EndChapterModal } from "@/components/board/end-chapter-modal";
import { ChapterProgressBanner } from "@/components/board/chapter-progress-banner";
import { ChapterRefocusChat } from "@/components/board/chapter-refocus-chat";

type ReviewState = {
  captureId: string | null;
  templateId: string | null;
  transcript: string;
  proposals: ProposedTask[];
};

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => left.position - right.position);
}

function getColumnTasks(tasks: Task[], columnId: string) {
  return tasks
    .filter((task) => task.columnId === columnId)
    .sort((left, right) => left.position - right.position);
}

const boardCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args).filter(
    (collision) => collision.id !== args.active.id,
  );

  // Canvas droppables (delete zone, dock column zones) always win when present —
  // they only exist in the DOM while a drag is active.
  const canvasCollision = pointerCollisions.find((collision) => {
    const droppable = args.droppableContainers.find(
      (container) => container.id === collision.id,
    );
    const type = droppable?.data.current?.type as string | undefined;
    return type === "delete-zone" || type === "dock-column";
  });
  if (canvasCollision) return [canvasCollision];

  if (pointerCollisions.length > 0) {
    const columnCollision = pointerCollisions.find((collision) => {
      const droppable = args.droppableContainers.find(
        (container) => container.id === collision.id,
      );
      return droppable?.data.current?.type === "column";
    });

    // Only prefer a column collision when dragging to a *different* column.
    // For same-column drags, fall through to card collisions so the
    // sortable strategy can compute the precise insertion index.
    if (columnCollision && columnCollision.id !== args.active.data.current?.columnId) {
      return [columnCollision];
    }

    return pointerCollisions;
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.id !== args.active.id,
    ),
  });
};


// When dragging within the same column, lock horizontal movement to zero
// so cards only slide up/down and don't drift left/right.
const restrictSameColumnToVertical: Modifier = ({ active, over, transform }) => {
  const sourceColumnId = active?.data.current?.columnId;
  const overColumnId = over?.data.current?.columnId;
  if (sourceColumnId && (!overColumnId || sourceColumnId === overColumnId)) {
    return { ...transform, x: 0 };
  }
  return transform;
};

const DELETE_ZONE_ID = "delete-zone";
const DOCK_PREFIX = "dock-";

const DOCK_HOVER_TINTS: Record<string, string> = {
  "Do This Week": "rgba(254,249,195,0.85)",
  "Do Today":     "rgba(219,234,254,0.85)",
  "Blocked":      "rgba(252,231,243,0.85)",
  "Done":         "rgba(220,252,231,0.85)",
};

function DragDeleteZone() {
  const { setNodeRef, isOver } = useDroppable({ id: DELETE_ZONE_ID, data: { type: "delete-zone" } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center gap-2.5 border-t-2 border-dashed transition-colors duration-150",
        isOver ? "bg-red-50/90 border-red-400" : "bg-black/[0.015] border-black/10",
      )}
      style={{ height: "15%" }}
    >
      <Trash2
        className={cn("size-4 transition-colors duration-150", isOver ? "text-red-500" : "text-black/25")}
        strokeWidth={1.5}
      />
      <span className={cn("text-xs font-medium tracking-wide transition-colors duration-150", isOver ? "text-red-500" : "text-black/30")}>
        {isOver ? "Release to delete" : "Drag here to delete"}
      </span>
    </div>
  );
}

function DockColumnZone({ column, taskCount }: { column: BoardColumn; taskCount: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${DOCK_PREFIX}${column.id}`,
    data: { type: "dock-column", columnId: column.id },
  });
  return (
    <div
      ref={setNodeRef}
      className="flex flex-1 flex-col items-center justify-center gap-1.5 border-r border-black/6 last:border-r-0 transition-colors duration-150"
      style={{ background: isOver ? (DOCK_HOVER_TINTS[column.name] ?? "rgba(200,168,107,0.15)") : "transparent" }}
    >
      <p className="text-sm font-semibold text-[var(--ink)]" style={{ fontFamily: "'Special Elite', cursive" }}>
        {column.name}
      </p>
      <p className="text-xs text-[var(--muted)]">
        {taskCount} card{taskCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function DragCanvas({ active, columns, tasks }: { active: boolean; columns: BoardColumn[]; tasks: Task[] }) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-40 hidden lg:flex flex-col"
      style={{ background: "rgba(248,245,240,0.92)", backdropFilter: "blur(6px)" }}
    >
      <div className="flex flex-1">
        {columns.map((col) => (
          <DockColumnZone
            key={col.id}
            column={col}
            taskCount={tasks.filter((t) => t.columnId === col.id).length}
          />
        ))}
      </div>
      <DragDeleteZone />
    </div>
  );
}

export function ProjectBoardClient({
  snapshot,
  chapterProjectId,
  chapterId,
  endChapterOpen = false,
  onEndChapterClose,
  onEndChapterConfirmed,
  activeChapterUrl = null,
  futureChapters = [],
  allChaptersCount = 0,
  onNavigateToStory,
}: {
  snapshot: BoardSnapshot;
  chapterProjectId: string;
  chapterId: string;
  endChapterOpen?: boolean;
  onEndChapterClose?: () => void;
  onEndChapterConfirmed?: (nextChapterId: string | null) => void;
  activeChapterUrl?: string | null;
  futureChapters?: Chapter[];
  allChaptersCount?: number;
  onNavigateToStory?: () => void;
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      // Delay gives a clear tap-and-hold feel on mobile and avoids
      // intercepting normal scroll gestures.
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(snapshot.tasks));

  // Sync local task state when the server sends a fresh snapshot (after router.refresh())
  useEffect(() => {
    if (!dragTaskId) {
      setTasks(sortTasks(snapshot.tasks));
    }
  }, [snapshot.tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [cassOpen, setCassOpen] = useState(false);
  const [cassBreakupTaskId, setCassBreakupTaskId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualColumnId, setManualColumnId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>({
    captureId: null,
    templateId: null,
    transcript: "",
    proposals: [],
  });
  const [refocusOpen, setRefocusOpen] = useState(false);
  const [completedAlertOpen, setCompletedAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Mobile swiper
  const swiperRef = useRef<HTMLDivElement>(null);
  const swiperTouchStart = useRef<{ x: number; y: number } | null>(null);
  const [activePage, setActivePage] = useState(() => {
    if (snapshot.board.retroCompletedAt) {
      const doneIndex = snapshot.columns.findIndex(
        (c) => c.name.toLowerCase() === "done",
      );
      return doneIndex >= 0 ? doneIndex : 0;
    }
    return 0;
  });

  // On mount, jump the swiper to the initial page without animation
  useEffect(() => {
    if (activePage > 0 && swiperRef.current) {
      const raf = requestAnimationFrame(() => {
        if (swiperRef.current) {
          swiperRef.current.scrollLeft =
            activePage * swiperRef.current.offsetWidth;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  function scrollToPage(index: number) {
    if (!swiperRef.current) return;
    swiperRef.current.scrollTo({
      left: index * swiperRef.current.offsetWidth,
      behavior: "smooth",
    });
    setActivePage(index);
  }

  function handleSwiperScroll() {
    if (!swiperRef.current) return;
    const { scrollLeft, offsetWidth } = swiperRef.current;
    setActivePage(Math.round(scrollLeft / offsetWidth));
  }

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  function refreshData() {
    router.refresh();
  }

  function openManualTask(columnId: string) {
    if (snapshot.board.retroCompletedAt) {
      setCompletedAlertOpen(true);
      return;
    }
    setManualColumnId(columnId);
    setManualOpen(true);
  }

  function openReview(result: VoiceProcessingResult) {
    setReviewState({
      captureId: result.captureId,
      templateId: result.templateId ?? null,
      transcript: result.transcript,
      proposals: result.proposals,
    });
    setReviewOpen(true);
  }

  function handleDragStart(event: DragStartEvent) {
    if (snapshot.board.retroCompletedAt) {
      setCompletedAlertOpen(true);
      return;
    }
    setDragTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragTaskId(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    // Dock column drop — move to end of that column
    if (overId?.startsWith(DOCK_PREFIX)) {
      const targetColumnId = overId.slice(DOCK_PREFIX.length);
      const activeTask = tasks.find((t) => t.id === activeId);
      if (activeTask && targetColumnId !== activeTask.columnId) {
        handleMoveToColumn(activeId, targetColumnId);
      }
      return;
    }

    // Delete zone drop
    if (overId === DELETE_ZONE_ID) {
      const taskToDelete = tasks.find((t) => t.id === activeId);
      if (!taskToDelete) return;
      setTasks((prev) => prev.filter((t) => t.id !== activeId));
      startTransition(async () => {
        try {
          await deleteTaskAction({ taskId: activeId, projectId: snapshot.project.id, boardId: snapshot.board.id });
          refreshData();
        } catch {
          setTasks((prev) => [...prev, taskToDelete]);
        }
      });
      return;
    }

    if (!overId || activeId === overId) return;

    const activeTask = tasks.find((task) => task.id === activeId);
    const sourceColumnId = activeTask?.columnId;
    const overTask = tasks.find((task) => task.id === overId);
    const destinationColumnId =
      overTask?.columnId ??
      snapshot.columns.find((column) => column.id === overId)?.id ??
      null;

    if (!activeTask || !sourceColumnId || !destinationColumnId) return;

    let merged: Task[];

    if (sourceColumnId === destinationColumnId) {
      const columnTasks = tasks.filter((task) => task.columnId === sourceColumnId);
      const sourceIndex = columnTasks.findIndex((task) => task.id === activeId);
      const overIndex =
        overTask && overTask.columnId === sourceColumnId
          ? columnTasks.findIndex((task) => task.id === overId)
          : columnTasks.length - 1;

      if (sourceIndex === -1 || overIndex === -1) return;

      const reorderedColumnTasks = arrayMove(columnTasks, sourceIndex, overIndex);
      const nonColumnTasks = tasks.filter((task) => task.columnId !== sourceColumnId);
      merged = [...nonColumnTasks, ...reorderedColumnTasks].map((task) => ({ ...task }));
    } else {
      const sourceTasks = tasks.filter(
        (task) => task.columnId === sourceColumnId && task.id !== activeId,
      );
      const destinationTasks = tasks.filter(
        (task) => task.columnId === destinationColumnId,
      );
      const insertIndex =
        overTask && overTask.columnId === destinationColumnId
          ? destinationTasks.findIndex((task) => task.id === overId)
          : destinationTasks.length;

      const nextDestinationTasks = [...destinationTasks];
      nextDestinationTasks.splice(
        insertIndex < 0 ? destinationTasks.length : insertIndex,
        0,
        {
          ...activeTask,
          columnId: destinationColumnId,
        },
      );

      merged = snapshot.columns.flatMap((column) => {
        if (column.id === sourceColumnId) {
          return sourceTasks.map((task) => ({ ...task }));
        }

        if (column.id === destinationColumnId) {
          return nextDestinationTasks.map((task) => ({ ...task }));
        }

        return tasks
          .filter((task) => task.columnId === column.id)
          .map((task) => ({ ...task }));
      });
    }

    const normalized = normalizeTaskOrder(snapshot.columns, merged);
    const normalizedTasks = merged.map((task) => {
      const update = normalized.find((item) => item.id === task.id);
      return update ? { ...task, columnId: update.columnId, position: update.position } : task;
    });

    setTasks(sortTasks(normalizedTasks));
    persistArrangement(normalized);
  }


  function handleMoveToColumn(taskId: string, destinationColumnId: string) {
    if (snapshot.board.retroCompletedAt) {
      setCompletedAlertOpen(true);
      return;
    }
    const activeTask = tasks.find((t) => t.id === taskId);
    if (!activeTask || activeTask.columnId === destinationColumnId) return;

    const sourceColumnId = activeTask.columnId;
    const sourceTasks = tasks.filter(
      (t) => t.columnId === sourceColumnId && t.id !== taskId,
    );
    const destinationTasks = tasks.filter((t) => t.columnId === destinationColumnId);
    const nextDestinationTasks = [
      ...destinationTasks,
      { ...activeTask, columnId: destinationColumnId },
    ];

    const merged = snapshot.columns.flatMap((column) => {
      if (column.id === sourceColumnId) return sourceTasks.map((t) => ({ ...t }));
      if (column.id === destinationColumnId) return nextDestinationTasks.map((t) => ({ ...t }));
      return tasks.filter((t) => t.columnId === column.id).map((t) => ({ ...t }));
    });

    const normalized = normalizeTaskOrder(snapshot.columns, merged);
    const normalizedTasks = merged.map((task) => {
      const update = normalized.find((item) => item.id === task.id);
      return update ? { ...task, columnId: update.columnId, position: update.position } : task;
    });

    setTasks(sortTasks(normalizedTasks));
    persistArrangement(normalized);
  }

  function persistArrangement(
    updates: Array<{ id: string; columnId: string; position: number }>,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await persistTaskArrangementAction({
          projectId: snapshot.project.id,
          boardId: snapshot.board.id,
          updates,
        });
        refreshData();
      } catch (persistError) {
        setError(
          persistError instanceof Error
            ? persistError.message
            : "Failed to save order.",
        );
        refreshData();
      }
    });
  }

  return (
    <>
      <div className="space-y-6">
        <ChapterProgressBanner
          board={snapshot.board}
          tasks={tasks}
          columns={snapshot.columns}
          onRefocus={() => setRefocusOpen(true)}
          activeChapterUrl={activeChapterUrl}
        />
        <section className="flex flex-col p-4 sm:p-5">
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {isPending ? <Badge className="mb-4">Saving changes...</Badge> : null}
          <div>
            <DndContext
              id="board-dnd-context"
              sensors={sensors}
              collisionDetection={boardCollisionDetection}
              modifiers={[restrictSameColumnToVertical]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Mobile: one column at a time with swipe pagination */}
              <div className="lg:hidden">
                {/* Pagination dots — above the column header */}
                <div className="flex justify-center gap-2.5 pb-4">
                  {snapshot.columns.map((column, i) => (
                    <button
                      key={column.id}
                      onClick={() => scrollToPage(i)}
                      aria-label={`Go to ${column.name}`}
                      className={cn(
                        "h-2 rounded-full transition-all duration-200",
                        i === activePage
                          ? "w-6 bg-[var(--accent)]"
                          : "w-2 bg-black/20",
                      )}
                    />
                  ))}
                </div>
                <div
                  ref={swiperRef}
                  className="flex snap-x snap-mandatory overflow-x-scroll [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                  onScroll={handleSwiperScroll}
                  onTouchStart={(e) => {
                    swiperTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                  }}
                  onTouchEnd={(e) => {
                    if (!swiperTouchStart.current) return;
                    const dx = e.changedTouches[0].clientX - swiperTouchStart.current.x;
                    const dy = e.changedTouches[0].clientY - swiperTouchStart.current.y;
                    swiperTouchStart.current = null;
                    // Only act on clear horizontal swipes
                    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                    // Swipe left at the last column → Story tab
                    if (dx < 0 && activePage === snapshot.columns.length - 1) {
                      onNavigateToStory?.();
                    }
                  }}
                >
                  {snapshot.columns.map((column) => (
                    <div key={column.id} className="w-full shrink-0 snap-start">
                      <BoardColumnView
                        column={column}
                        tasks={getColumnTasks(tasks, column.id)}
                        onOpenTask={setSelectedTaskId}
                        onCreateTask={openManualTask}
                        dragInProgress={!!dragTaskId}
                        allColumns={snapshot.columns}
                        onMoveToColumn={handleMoveToColumn}
                        boardCompleted={!!snapshot.board.retroCompletedAt}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: 4-column grid */}
              <div className="hidden lg:block overflow-x-auto pb-2">
                <div className="grid gap-4 lg:grid-cols-4">
                  {snapshot.columns.map((column) => (
                    <BoardColumnView
                      key={column.id}
                      column={column}
                      tasks={getColumnTasks(tasks, column.id)}
                      onOpenTask={setSelectedTaskId}
                      onCreateTask={openManualTask}
                      dragInProgress={!!dragTaskId}
                      allColumns={snapshot.columns}
                      onMoveToColumn={handleMoveToColumn}
                    />
                  ))}
                </div>
              </div>

              {/* Full-viewport drag canvas — column zones (top 85%) + delete strip (bottom 15%) */}
              <DragCanvas
                active={!!dragTaskId}
                columns={snapshot.columns}
                tasks={tasks}
              />
            </DndContext>
          </div>
        </section>

      </div>

      <TaskDetailModal
        key={selectedTask?.id ?? "task-detail"}
        task={selectedTask}
        projectId={snapshot.project.id}
        boardId={snapshot.board.id}
        columns={snapshot.columns}
        assignableMembers={snapshot.projectMembers}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        onSaved={refreshData}
        onDeleted={refreshData}
        onOpenCass={() => {
          const taskId = selectedTaskId;
          setSelectedTaskId(null);
          setCassBreakupTaskId(taskId);
          setCassOpen(true);
        }}
      />

      <ManualTaskModal
        key={`manual-${manualOpen ? "open" : "closed"}-${snapshot.project.id}-${manualColumnId ?? "default"}`}
        open={manualOpen}
        onClose={() => {
          setManualOpen(false);
          setManualColumnId(null);
        }}
        project={snapshot.project}
        board={snapshot.board}
        columns={snapshot.columns}
        assignableMembers={snapshot.projectMembers}
        templates={snapshot.workflowTemplates}
        initialColumnId={manualColumnId}
        onCreated={refreshData}
        onProcessed={openReview}
      />

      <ReviewTasksModal
        key={reviewState.captureId ?? "review-empty"}
        open={reviewOpen}
        projectId={snapshot.project.id}
        board={snapshot.board}
        columns={snapshot.columns}
        assignableMembers={snapshot.projectMembers}
        captureId={reviewState.captureId}
        templateId={reviewState.templateId}
        transcript={reviewState.transcript}
        proposals={reviewState.proposals}
        onClose={() => setReviewOpen(false)}
        onAccepted={refreshData}
      />

      {refocusOpen ? (
        (() => {
          const doneCol = snapshot.columns.find((c) => c.name.toLowerCase() === "done");
          const incompleteTasks = tasks.filter(
            (t) => !doneCol || t.columnId !== doneCol.id,
          );
          return (
            <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--surface)] p-4 sm:p-6">
              <ChapterRefocusChat
                project={snapshot.project}
                board={snapshot.board}
                incompleteTasks={incompleteTasks}
                columns={snapshot.columns}
                onComplete={() => {
                  setRefocusOpen(false);
                  refreshData();
                }}
                onClose={() => setRefocusOpen(false)}
              />
            </div>
          );
        })()
      ) : null}

      <Modal
        open={completedAlertOpen}
        title="Chapter complete"
        onClose={() => setCompletedAlertOpen(false)}
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          This chapter was completed on{" "}
          <span className="font-medium text-[var(--ink)]">
            {formatDate(snapshot.board.retroCompletedAt)}
          </span>
          . Head over to your current chapter if you need to add new tasks.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => setCompletedAlertOpen(false)}>
            Dismiss
          </Button>
          {activeChapterUrl && (
            <Button onClick={() => router.push(activeChapterUrl)}>
              Go to current chapter
            </Button>
          )}
        </div>
      </Modal>

      <EndChapterModal
        open={endChapterOpen}
        onClose={() => onEndChapterClose?.()}
        onConfirm={(nextChapterId) => {
          onEndChapterClose?.();
          onEndChapterConfirmed?.(nextChapterId);
          refreshData();
        }}
        projectId={snapshot.project.id}
        boardId={snapshot.board.id}
        incompleteTasks={{
          count: tasks.filter((t) => {
            const doneCol = snapshot.columns.find((c) => c.name.toLowerCase() === "done");
            return !doneCol || t.columnId !== doneCol.id;
          }).length,
          titles: tasks
            .filter((t) => {
              const doneCol = snapshot.columns.find((c) => c.name.toLowerCase() === "done");
              return !doneCol || t.columnId !== doneCol.id;
            })
            .map((t) => t.title),
        }}
      />

      {/* Cass FAB — only when chapter is active */}
      {!snapshot.board.retroCompletedAt && (
        <CassBoardFab onClick={() => { setCassBreakupTaskId(null); setCassOpen(true); }} hoverText="What needs to get done?" />
      )}

      <CassBoardDrawer
        open={cassOpen}
        project={snapshot.project}
        board={snapshot.board}
        columns={snapshot.columns}
        tasks={tasks}
        templates={snapshot.workflowTemplates}
        futureChapters={futureChapters}
        allChaptersCount={allChaptersCount}
        breakupTask={cassBreakupTaskId ? (tasks.find((t) => t.id === cassBreakupTaskId) ?? null) : null}
        onClose={() => { setCassOpen(false); setCassBreakupTaskId(null); }}
        onTasksAdded={refreshData}
        onTaskDeleted={refreshData}
      />
    </>
  );
}
