"use client";

import { useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
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
import { ProjectAccessModal } from "@/components/projects/project-access-modal";
import { ManualTaskModal } from "@/components/tasks/manual-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { VoiceProcessingResult } from "@/components/voice/voice-capture-panel";
import { ReviewTasksModal } from "@/components/voice/review-tasks-modal";

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

export function ProjectBoardClient({ snapshot }: { snapshot: BoardSnapshot }) {
  const router = useRouter();
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
  const [manualColumnId, setManualColumnId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
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
  const visibleMembers = useMemo(
    () => snapshot.projectMembers.slice(0, 4),
    [snapshot.projectMembers],
  );

  function displayName(member: { displayName: string | null; email: string | null }) {
    return member.displayName?.trim() || member.email?.trim() || "Unknown user";
  }

  function initials(value: string) {
    const normalized = value.includes("@") ? value.split("@")[0] : value;
    const segments = normalized.split(/[.\s_-]+/).filter(Boolean);
    return segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("") || "?";
  }

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

  function findColumnIdForTarget(targetId: string | null) {
    if (!targetId) return null;
    const taskMatch = tasks.find((task) => task.id === targetId);
    return taskMatch?.columnId ?? null;
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
    const destinationColumnId = findColumnIdForTarget(overId);

    if (!activeTask || !sourceColumnId || !destinationColumnId) return;
    if (sourceColumnId !== destinationColumnId) return;

    const columnTasks = tasks.filter((task) => task.columnId === sourceColumnId);
    const sourceIndex = columnTasks.findIndex((task) => task.id === activeId);
    const overIndex = columnTasks.findIndex((task) => task.id === overId);
    if (sourceIndex === -1 || overIndex === -1) return;

    const reorderedColumnTasks = arrayMove(columnTasks, sourceIndex, overIndex);
    const nonColumnTasks = tasks.filter((task) => task.columnId !== sourceColumnId);
    const merged = [...nonColumnTasks, ...reorderedColumnTasks].map((task) => ({ ...task }));
    const normalized = normalizeTaskOrder(snapshot.columns, merged);
    const normalizedTasks = merged.map((task) => {
      const update = normalized.find((item) => item.id === task.id);
      return update ? { ...task, columnId: update.columnId, position: update.position } : task;
    });

    setTasks(sortTasks(normalizedTasks));
    persistArrangement(normalized);
  }

  function handleMoveTask(taskId: string, targetColumnId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.columnId === targetColumnId) return;

    const nextPosition =
      Math.max(
        0,
        ...tasks
          .filter((item) => item.columnId === targetColumnId)
          .map((item) => item.position),
      ) + 1000;

    setTasks((current) =>
      sortTasks(
        current.map((item) =>
          item.id === taskId
            ? { ...item, columnId: targetColumnId, position: nextPosition }
            : item,
        ),
      ),
    );
    setError(null);
    setMovingTaskId(taskId);
    startTransition(async () => {
      try {
        await moveTaskAction({
          taskId,
          projectId: snapshot.project.id,
          boardId: snapshot.board.id,
          targetColumnId,
        });
        refreshData();
      } catch (persistError) {
        setError(
          persistError instanceof Error
            ? persistError.message
            : "Failed to move task.",
        );
        refreshData();
      } finally {
        setMovingTaskId(null);
      }
    });
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
      <div className="space-y-6 lg:h-full">
        <section className="surface hairline flex h-full flex-col rounded-[2rem] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                {snapshot.board.name}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {snapshot.project.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {snapshot.project.description ??
                  "Capture ideas by voice, review the extracted tasks, and move work through a lightweight board."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center -space-x-2 sm:flex">
                {visibleMembers.map((member) => (
                  <div
                    key={member.id}
                    title={`${displayName(member)}${member.email ? ` (${member.email})` : ""}`}
                    className="flex size-9 items-center justify-center rounded-full border-2 border-[var(--app-bg)] bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]"
                  >
                    {initials(displayName(member))}
                  </div>
                ))}
                {snapshot.projectMembers.length > visibleMembers.length ? (
                  <div className="flex size-9 items-center justify-center rounded-full border-2 border-[var(--app-bg)] bg-black text-[11px] font-semibold text-white">
                    +{snapshot.projectMembers.length - visibleMembers.length}
                  </div>
                ) : null}
              </div>
              <Badge>{snapshot.projectMembers.length} people</Badge>
              <Button variant="secondary" onClick={() => setAccessOpen(true)}>
                Share access
              </Button>
            </div>
          </div>
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {isPending ? <Badge className="mb-4">Saving changes...</Badge> : null}
          <div className="min-h-0 flex-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="h-full overflow-x-auto pb-2">
                <div
                  className="grid grid-cols-1 gap-4 lg:h-full lg:min-w-full lg:[grid-template-columns:repeat(var(--column-count),minmax(280px,1fr))]"
                  style={
                    {
                      "--column-count": snapshot.columns.length,
                    } as CSSProperties
                  }
                >
                  {snapshot.columns.map((column) => (
                    <BoardColumnView
                      key={column.id}
                      column={column}
                      columns={snapshot.columns}
                      tasks={getColumnTasks(tasks, column.id)}
                      onOpenTask={setSelectedTaskId}
                      onCreateTask={openManualTask}
                      onMoveTask={handleMoveTask}
                      movingTaskId={movingTaskId === null ? dragTaskId : movingTaskId}
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

      {accessOpen ? (
        <ProjectAccessModal
          open={accessOpen}
          onClose={() => setAccessOpen(false)}
          project={snapshot.project}
          currentUser={snapshot.currentUser}
          members={snapshot.projectMembers}
          onUpdated={refreshData}
        />
      ) : null}
    </>
  );
}
