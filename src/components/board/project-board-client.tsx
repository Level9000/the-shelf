"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProposedTask, Task } from "@/types";
import {
  moveTaskAction,
  persistTaskArrangementAction,
} from "@/lib/actions/task-actions";
import { normalizeTaskOrder } from "@/lib/board-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BoardColumnView } from "@/components/board/board-column";
import { ManualTaskModal } from "@/components/tasks/manual-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { VoiceProcessingResult } from "@/components/voice/voice-capture-panel";
import { ReviewTasksModal } from "@/components/voice/review-tasks-modal";
import { EndChapterModal } from "@/components/board/end-chapter-modal";

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

export function ProjectBoardClient({
  snapshot,
  chapterProjectId,
  chapterId,
  endChapterOpen = false,
  onEndChapterClose,
}: {
  snapshot: BoardSnapshot;
  chapterProjectId: string;
  chapterId: string;
  endChapterOpen?: boolean;
  onEndChapterClose?: () => void;
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
  const [manualOpen, setManualOpen] = useState(false);
  const [manualColumnId, setManualColumnId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>({
    captureId: null,
    templateId: null,
    transcript: "",
    proposals: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  function refreshData() {
    router.refresh();
  }

  function openManualTask(columnId: string) {
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
    setDragTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragTaskId(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

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
              <div className="overflow-x-auto pb-2">
                <div
                  className="board-grid grid grid-cols-1 gap-4"
                  style={{ "--col-count": snapshot.columns.length } as CSSProperties}
                >
                  {snapshot.columns.map((column) => (
                    <BoardColumnView
                      key={column.id}
                      column={column}
                      tasks={getColumnTasks(tasks, column.id)}
                      onOpenTask={setSelectedTaskId}
                      onCreateTask={openManualTask}
                      showAddButton={["Do This Week", "Do Today"].includes(column.name)}
                      dragInProgress={!!dragTaskId}
                      allColumns={snapshot.columns}
                      onMoveToColumn={handleMoveToColumn}
                    />
                  ))}
                </div>
              </div>
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

      <EndChapterModal
        open={endChapterOpen}
        onClose={() => onEndChapterClose?.()}
        onConfirm={() => {
          onEndChapterClose?.();
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
    </>
  );
}
