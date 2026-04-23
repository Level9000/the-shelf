"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProposedTask, Task } from "@/types";
import { persistTaskArrangementAction } from "@/lib/actions/task-actions";
import { normalizeTaskOrder } from "@/lib/board-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BoardColumnView } from "@/components/board/board-column";
import { ManualTaskModal } from "@/components/tasks/manual-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import {
  VoiceCapturePanel,
  type VoiceCapturePanelHandle,
  type VoiceProcessingResult,
} from "@/components/voice/voice-capture-panel";
import { ReviewTasksModal } from "@/components/voice/review-tasks-modal";

type ReviewState = {
  captureId: string | null;
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

export function ProjectBoardClient({ snapshot }: { snapshot: BoardSnapshot }) {
  const router = useRouter();
  const voiceCaptureRef = useRef<VoiceCapturePanelHandle | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(snapshot.tasks));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>({
    captureId: null,
    transcript: "",
    proposals: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const dragTask = useMemo(
    () => tasks.find((task) => task.id === dragTaskId) ?? null,
    [dragTaskId, tasks],
  );

  function refreshData() {
    router.refresh();
  }

  function openReview(result: VoiceProcessingResult) {
    setReviewState({
      captureId: result.captureId,
      transcript: result.transcript,
      proposals: result.proposals,
    });
    setReviewOpen(true);
  }

  function findColumnIdForTarget(targetId: string | null) {
    if (!targetId) return null;
    const columnMatch = snapshot.columns.find((column) => column.id === targetId);
    if (columnMatch) return columnMatch.id;
    const taskMatch = tasks.find((task) => task.id === targetId);
    return taskMatch?.columnId ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    setDragTaskId(activeId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragTaskId(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (!overId || activeId === overId) {
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeId);
    if (!activeTask) {
      return;
    }

    const sourceColumnId = activeTask.columnId;
    const destinationColumnId = findColumnIdForTarget(overId);

    if (!destinationColumnId) {
      return;
    }

    const nextTasks = [...tasks];
    const activeIndex = nextTasks.findIndex((task) => task.id === activeId);
    const activeItem = nextTasks[activeIndex];

    if (!activeItem) return;

    if (sourceColumnId === destinationColumnId) {
      const columnTasks = nextTasks.filter((task) => task.columnId === sourceColumnId);
      const sourceIndex = columnTasks.findIndex((task) => task.id === activeId);
      const overTaskIndex = columnTasks.findIndex((task) => task.id === overId);
      if (sourceIndex === -1) return;
      const targetIndex = overTaskIndex === -1 ? columnTasks.length - 1 : overTaskIndex;
      const reorderedColumnTasks = arrayMove(columnTasks, sourceIndex, targetIndex);
      const nonColumnTasks = nextTasks.filter((task) => task.columnId !== sourceColumnId);
      const merged = [...nonColumnTasks, ...reorderedColumnTasks].map((task) => ({
        ...task,
      }));
      const normalized = normalizeTaskOrder(snapshot.columns, merged);
      const normalizedTasks = merged.map((task) => {
        const update = normalized.find((item) => item.id === task.id);
        return update ? { ...task, columnId: update.columnId, position: update.position } : task;
      });
      setTasks(sortTasks(normalizedTasks));
      persistArrangement(normalized);
      return;
    }

    nextTasks.splice(activeIndex, 1);
    const updatedActiveItem = { ...activeItem, columnId: destinationColumnId };
    const overIndex = nextTasks.findIndex((task) => task.id === overId);
    if (overIndex >= 0) {
      nextTasks.splice(overIndex, 0, updatedActiveItem);
    } else {
      nextTasks.push(updatedActiveItem);
    }

    const normalized = normalizeTaskOrder(snapshot.columns, nextTasks);
    const normalizedTasks = nextTasks.map((task) => {
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
          updates,
        });
        refreshData();
      } catch (persistError) {
        setError(
          persistError instanceof Error
            ? persistError.message
            : "Failed to save board order.",
        );
        refreshData();
      }
    });
  }

  return (
    <>
      <div className="space-y-6">
        <section className="surface hairline rounded-[2rem] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {snapshot.project.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {snapshot.project.description ??
                  "Capture ideas by voice, review the extracted tasks, and move work through a lightweight board."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isPending ? <Badge>Saving order...</Badge> : null}
              <Button onClick={() => setManualOpen(true)}>
                <Plus className="mr-2 size-4" />
                New task
              </Button>
            </div>
          </div>
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <VoiceCapturePanel
            ref={voiceCaptureRef}
            project={snapshot.project}
            onProcessed={openReview}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-full gap-4">
                {snapshot.columns.map((column) => (
                  <BoardColumnView
                    key={column.id}
                    column={column}
                    tasks={getColumnTasks(tasks, column.id)}
                    onOpenTask={setSelectedTaskId}
                  />
                ))}
              </div>
            </div>
            <DragOverlay>
              {dragTask ? (
                <div className="w-[300px] rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-2xl shadow-black/10">
                  <p className="text-sm font-semibold">{dragTask.title}</p>
                  {dragTask.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">
                      {dragTask.description}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      </div>

      <TaskDetailModal
        key={selectedTask?.id ?? "task-detail"}
        task={selectedTask}
        projectId={snapshot.project.id}
        columns={snapshot.columns}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        onSaved={refreshData}
        onDeleted={refreshData}
      />

      <ManualTaskModal
        key={`manual-${manualOpen ? "open" : "closed"}-${snapshot.project.id}`}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        projectId={snapshot.project.id}
        project={snapshot.project}
        board={snapshot.board}
        columns={snapshot.columns}
        onCreated={refreshData}
        onVoiceProcessed={openReview}
      />

      <ReviewTasksModal
        key={reviewState.captureId ?? "review-empty"}
        open={reviewOpen}
        projectId={snapshot.project.id}
        board={snapshot.board}
        columns={snapshot.columns}
        captureId={reviewState.captureId}
        transcript={reviewState.transcript}
        proposals={reviewState.proposals}
        onClose={() => setReviewOpen(false)}
        onAccepted={refreshData}
      />
    </>
  );
}
