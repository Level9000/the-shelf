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
import { Mic, Plus, Sparkles } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

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
  const [voiceCaptures] = useState(snapshot.voiceCaptures);
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
        <section className="surface hairline rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                <Sparkles className="size-3.5" />
                Project board
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance">
                {snapshot.project.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {snapshot.project.description ??
                  "Capture ideas by voice, review the extracted tasks, and move work through a lightweight board."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="surface-card hairline rounded-[1.5rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Tasks
                </p>
                <p className="mt-2 text-2xl font-semibold">{tasks.length}</p>
              </div>
              <div className="surface-card hairline rounded-[1.5rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Voice notes
                </p>
                <p className="mt-2 text-2xl font-semibold">{voiceCaptures.length}</p>
              </div>
              <div className="surface-card hairline rounded-[1.5rem] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Updated
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {formatDate(snapshot.project.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <VoiceCapturePanel
          ref={voiceCaptureRef}
          project={snapshot.project}
          voiceCaptures={voiceCaptures}
          onProcessed={openReview}
        />

        <section className="surface hairline rounded-[2rem] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kanban board</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Drag cards between columns or reorder within a lane.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isPending ? <Badge>Saving order...</Badge> : null}
              <Button
                variant="secondary"
                onClick={() => voiceCaptureRef.current?.startCapture()}
              >
                <Mic className="mr-2 size-4" />
                Voice capture
              </Button>
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
        board={snapshot.board}
        columns={snapshot.columns}
        onCreated={refreshData}
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
