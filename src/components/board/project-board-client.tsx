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
import { Lock, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BoardColumn, BoardSnapshot, ProposedTask, Task } from "@/types";
import {
  deleteTaskAction,
  moveTaskAction,
  persistTaskArrangementAction,
} from "@/lib/actions/task-actions";
import { normalizeTaskOrder } from "@/lib/board-utils";
import { cn, formatDate } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { TapeButton } from "@/components/ui/tape-button";
import { Modal } from "@/components/ui/modal";
import { BoardColumnView } from "@/components/board/board-column";
import { CassBoardDrawer, CassBoardFab } from "@/components/board/cass-board-drawer";
import { MobileFab } from "@/components/ui/MobileFab";
import { resolveBannerState } from "@/components/board/chapter-progress-banner";
import { ManualTaskModal } from "@/components/tasks/manual-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { VoiceProcessingResult } from "@/components/voice/voice-capture-panel";
import { ReviewTasksModal } from "@/components/voice/review-tasks-modal";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import type { SubscriptionStatus } from "@/lib/subscription";

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
const DOCK_HOVER_TINTS_DARK: Record<string, string> = {
  "Do This Week": "rgba(234,179,8,0.18)",
  "Do Today":     "rgba(59,130,246,0.18)",
  "Blocked":      "rgba(236,72,153,0.18)",
  "Done":         "rgba(34,197,94,0.18)",
};

function DragDeleteZone() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { setNodeRef, isOver } = useDroppable({ id: DELETE_ZONE_ID, data: { type: "delete-zone" } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center gap-2.5 border-t-2 border-dashed transition-colors duration-150",
        isOver
          ? "border-red-400 bg-red-500/20"
          : isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.015]",
      )}
      style={{ height: "15%" }}
    >
      <Trash2
        className={cn("size-4 transition-colors duration-150", isOver ? "text-red-400" : isDark ? "text-white/20" : "text-black/25")}
        strokeWidth={1.5}
      />
      <span className={cn("text-xs font-medium tracking-wide transition-colors duration-150", isOver ? "text-red-400" : isDark ? "text-white/25" : "text-black/30")}>
        {isOver ? "Release to delete" : "Drag here to delete"}
      </span>
    </div>
  );
}

function DockColumnZone({ column, taskCount }: { column: BoardColumn; taskCount: number }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tints = isDark ? DOCK_HOVER_TINTS_DARK : DOCK_HOVER_TINTS;
  const { setNodeRef, isOver } = useDroppable({
    id: `${DOCK_PREFIX}${column.id}`,
    data: { type: "dock-column", columnId: column.id },
  });
  return (
    <div
      ref={setNodeRef}
      className="flex flex-1 flex-col items-center justify-center gap-1.5 border-r border-black/6 last:border-r-0 transition-colors duration-150"
      style={{ background: isOver ? (tints[column.name] ?? (isDark ? "rgba(200,168,107,0.12)" : "rgba(200,168,107,0.15)")) : "transparent" }}
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-40 hidden lg:flex flex-col"
      style={{ background: isDark ? "rgba(10,10,10,0.95)" : "rgba(248,245,240,0.92)", backdropFilter: "blur(6px)" }}
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

// Shown instead of the board when an earlier chapter in this project still
// hasn't had its retro completed — keeps users from working two chapters at
// once and losing track of which one they're actually "in."
function LockedChapterNotice({
  activeChapterName,
  activeChapterUrl,
  hasTasks,
  theme,
}: {
  activeChapterName: string | null;
  activeChapterUrl: string | null;
  hasTasks: boolean;
  theme: string;
}) {
  const router = useRouter();
  const isDark = theme === "dark";

  const finishLine = activeChapterName
    ? `you need to finish ${activeChapterName} before you can work on this.`
    : "you need to finish your previous chapter before you can work on this.";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "64px 24px", gap: "16px" }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        background: isDark ? "rgba(200,168,107,0.08)" : "rgba(200,168,107,0.12)",
        border: `1px solid ${isDark ? "rgba(200,168,107,0.25)" : "rgba(200,168,107,0.3)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Lock size={18} style={{ color: "#c8a86b" }} />
      </div>
      <p style={{ fontFamily: "'Literata', Georgia, serif", fontSize: "18px", fontWeight: 600, color: isDark ? "#f8f8f6" : "rgba(26,14,0,0.88)", margin: 0, maxWidth: "360px" }}>
        This chapter isn&apos;t open yet
      </p>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: "1.6", color: isDark ? "rgba(248,248,246,0.5)" : "rgba(26,14,0,0.5)", margin: 0, maxWidth: "360px" }}>
        {hasTasks
          ? `We've moved some tasks from a previous chapter into this one, but ${finishLine}`
          : `We'll bring this chapter online once you wrap up — ${finishLine}`}
      </p>
      {activeChapterUrl && (
        <TapeButton variant="primary" size="sm" onClick={() => router.push(activeChapterUrl)}>
          Go to {activeChapterName ?? "current chapter"}
        </TapeButton>
      )}
    </div>
  );
}

export function ProjectBoardClient({
  snapshot,
  chapterProjectId,
  chapterId,
  onEndChapterConfirmed,
  activeChapterUrl = null,
  isLocked = false,
  activeChapterName = null,
  onNavigateToStory,
  initialDrawerMode,
  chapterNumber = 1,
  retroNudge = false,
  onStartRetro,
  onRetroComplete,
  subscriptionStatus,
  onDrawerClosed,
}: {
  snapshot: BoardSnapshot;
  chapterProjectId: string;
  chapterId: string;
  onEndChapterConfirmed?: (nextChapterId: string | null) => void;
  activeChapterUrl?: string | null;
  /** True if an earlier chapter in this project still hasn't had its retro
   *  completed — this chapter's board is read-only until that happens. */
  isLocked?: boolean;
  /** Name of the chapter that needs its recap finished, for the lock message. */
  activeChapterName?: string | null;
  onNavigateToStory?: () => void;
  initialDrawerMode?: "retro" | "new_chapter";
  chapterNumber?: number;
  retroNudge?: boolean;
  onStartRetro?: () => void;
  onRetroComplete?: (data: { chapterStory: string; pullQuote: string; headline?: string; subheadline?: string; chapterType?: string }) => void;
  subscriptionStatus?: SubscriptionStatus;
  /** Called whenever the Cass drawer closes — lets the parent clear one-shot
   *  initialDrawerMode triggers (e.g. "new_chapter") so a later normal open
   *  via the FAB doesn't get hijacked by a stale forced mode. */
  onDrawerClosed?: () => void;
}) {
  const router = useRouter();
  const { theme } = useTheme();
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

  const needsPaywall = subscriptionStatus === "trial_ended" || subscriptionStatus === "expired";
  const [paywallOpen, setPaywallOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(snapshot.tasks));

  // Sync local task state when the server sends a fresh snapshot (after router.refresh())
  useEffect(() => {
    if (!dragTaskId) {
      setTasks(sortTasks(snapshot.tasks));
    }
  }, [snapshot.tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  // When a modal opens during a drag, mark it cancelled so handleDragEnd skips the move
  const cancelDragRef = useRef(false);
  const searchParams = useSearchParams();
  const skipIntro = searchParams.get("skipIntro") === "true";
  // When arriving from onboarding (skipIntro=true), open the drawer directly so Cass greets them
  const [cassOpen, setCassOpen] = useState(() =>
    skipIntro
      ? !needsPaywall
      : !!initialDrawerMode && !needsPaywall
  );
  const [cassBreakupTaskId, setCassBreakupTaskId] = useState<string | null>(null);
  const [cassCompletedMode, setCassCompletedMode] = useState(false);
  // Set when "End chapter" is clicked from the chapter-focus bar, so the drawer
  // opens directly into that flow instead of the additive "add something" menu.
  const [endChapterRequested, setEndChapterRequested] = useState(false);

  // Re-open drawer when a forced mode is set from outside (e.g., "all done" → retro)
  useEffect(() => {
    if (initialDrawerMode) {
      setCassBreakupTaskId(null);
      setCassCompletedMode(false);
      if (needsPaywall) {
        setPaywallOpen(true);
      } else {
        setCassOpen(true);
      }
    }
  }, [initialDrawerMode, needsPaywall]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualColumnId, setManualColumnId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>({
    captureId: null,
    templateId: null,
    transcript: "",
    proposals: [],
  });

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
      cancelDragRef.current = true;
      return;
    }
    if (retroNudge) {
      // Cards are already disabled via boardCompleted prop; guard here as a safety net
      cancelDragRef.current = true;
      return;
    }
    cancelDragRef.current = false;
    setDragTaskId(String(event.active.id));
  }

  function handleDragCancel() {
    setDragTaskId(null);
    cancelDragRef.current = false;
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragTaskId(null);
    // A modal opened during this drag — discard the move and let dnd-kit snap the card back
    if (cancelDragRef.current) {
      cancelDragRef.current = false;
      return;
    }
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
    if (retroNudge) return;
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

  // Chapter age / days remaining
  const CHAPTER_DAYS = 14;
  const daysOpen = snapshot.board.createdAt
    ? Math.floor((Date.now() - new Date(snapshot.board.createdAt).getTime()) / 86_400_000)
    : null;
  const daysLeft = daysOpen !== null ? CHAPTER_DAYS - daysOpen : null;

  // True whenever any overlay/modal is visible — board drag is locked out while this is true
  const anyModalOpen = Boolean(selectedTask) || manualOpen || reviewOpen || completedAlertOpen;

  // ── Banner state → FAB teaser ────────────────────────────────────────────────
  const bannerState = resolveBannerState(snapshot.board, tasks, snapshot.columns);

  const fabRingColor: "gold" | "amber" | "green" =
    bannerState.kind === "running_long" ? "amber" :
    bannerState.kind === "none"         ? "gold"  : "green";

  const fabTeaserText: string | undefined =
    bannerState.kind === "running_long"
      ? `${bannerState.ageDays} days in. Time to wrap up this chapter.`
    : bannerState.kind === "closing_stretch"
      ? `${bannerState.completedCount} of ${bannerState.totalCount} done. Almost there.`
    : bannerState.kind === "on_pace"
      ? `${bannerState.completedCount} done in ${bannerState.ageDays} days. Keep up the great work.`
    : bannerState.kind === "completed"
      ? `Done ${new Date(bannerState.retroCompletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
    : undefined;

  const fabTeaserWidth: string | undefined =
    bannerState.kind === "running_long"    ? "320px" :
    bannerState.kind === "closing_stretch" ? "290px" :
    bannerState.kind === "on_pace"         ? "290px" :
    bannerState.kind === "completed"       ? "260px" :
    undefined;

  if (isLocked) {
    return (
      <LockedChapterNotice
        activeChapterName={activeChapterName}
        activeChapterUrl={activeChapterUrl}
        hasTasks={tasks.length > 0}
        theme={theme}
      />
    );
  }

  return (
    <>
      <section className="flex flex-col">
          {error ? (
            <p className="mx-4 mt-4 mb-0 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5 sm:mt-5">
              {error}
            </p>
          ) : null}
          {isPending ? (
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <Badge className="mb-4">Saving changes...</Badge>
            </div>
          ) : null}
          {/* Chapter focus bar — shown when the board has a goal set */}
          {snapshot.board.goal && (() => {
            const isDarkBoard = theme === "dark";

            const healthLabel =
              daysLeft === null ? null :
              daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in this chapter` :
              daysLeft === 0 ? "Last day of this chapter" :
              `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} over. Time to wrap up.`;

            const healthColor =
              daysLeft === null ? "rgba(26,14,0,0.4)" :
              daysLeft > 4 ? (isDarkBoard ? "rgba(110,231,183,0.7)" : "rgba(22,101,52,0.65)") :
              daysLeft > 0 ? (isDarkBoard ? "#f5c84a" : "rgba(120,80,0,0.75)") :
              (isDarkBoard ? "#f87171" : "#b91c1c");

            return (
              <div style={{
                borderBottom: `1px solid ${isDarkBoard ? "rgba(200,168,107,0.15)" : "rgba(26,14,0,0.08)"}`,
                padding: "7px 20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: isDarkBoard ? "rgba(200,168,107,0.07)" : "#f0ebe0",
                width: "100vw",
                marginLeft: "calc(50% - 50vw)",
                marginRight: "calc(50% - 50vw)",
              }}>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: isDarkBoard ? "rgba(200,168,107,0.6)" : "rgba(26,14,0,0.45)",
                  flexShrink: 0,
                }}>
                  Chapter focus
                </span>
                <span style={{
                  width: "1px",
                  height: "12px",
                  background: isDarkBoard ? "rgba(200,168,107,0.2)" : "rgba(26,14,0,0.12)",
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13px",
                  color: isDarkBoard ? "rgba(232,224,208,0.82)" : "rgba(26,14,0,0.75)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}>
                  {snapshot.board.goal}
                </span>
                {healthLabel && (
                  <>
                    <span style={{
                      width: "1px",
                      height: "12px",
                      background: isDarkBoard ? "rgba(200,168,107,0.2)" : "rgba(26,14,0,0.12)",
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: healthColor,
                      flexShrink: 0,
                    }}>
                      {healthLabel}
                    </span>
                  </>
                )}
                {!snapshot.board.retroCompletedAt && (
                  <>
                    <span style={{
                      width: "1px",
                      height: "12px",
                      background: isDarkBoard ? "rgba(200,168,107,0.2)" : "rgba(26,14,0,0.12)",
                      flexShrink: 0,
                    }} />
                    <button
                      type="button"
                      onClick={() => { setCassCompletedMode(false); setCassBreakupTaskId(null); setEndChapterRequested(true); setCassOpen(true); }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: isDarkBoard ? "rgba(200,168,107,0.4)" : "rgba(26,14,0,0.32)",
                        flexShrink: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = isDarkBoard ? "rgba(200,168,107,0.7)" : "rgba(26,14,0,0.55)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isDarkBoard ? "rgba(200,168,107,0.4)" : "rgba(26,14,0,0.32)"; }}
                    >
                      End chapter
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          <div style={{ position: "relative", pointerEvents: anyModalOpen ? "none" : "auto" }}>
            <DndContext
              id="board-dnd-context"
              sensors={sensors}
              collisionDetection={boardCollisionDetection}
              modifiers={[restrictSameColumnToVertical]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {/* Mobile: one column at a time with swipe pagination */}
              <div className="p-4 sm:p-5 lg:hidden">
                {/* Pagination indicators — above the column header */}
                <div className="flex justify-center items-center gap-2 pb-4">
                  {snapshot.columns.map((column, i) => (
                    <button
                      key={column.id}
                      onClick={() => scrollToPage(i)}
                      aria-label={`Go to ${column.name}`}
                      type="button"
                      className={cn(
                        "h-2 rounded-full transition-all duration-200",
                        i === activePage
                          ? "w-6 bg-[var(--accent)]"
                          : "w-2 bg-white/30",
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
                        onCreateTask={retroNudge ? undefined : openManualTask}
                        dragInProgress={!!dragTaskId}
                        allColumns={snapshot.columns}
                        onMoveToColumn={retroNudge ? undefined : handleMoveToColumn}
                        boardCompleted={!!snapshot.board.retroCompletedAt || retroNudge}
                        onOpenCass={
                          !snapshot.board.retroCompletedAt && !retroNudge &&
                          (
                            (column.name === "Done") ||
                            ((column.name === "Do This Week" || column.name === "Do Today" || column.name === "Blocked") && (daysLeft === null || daysLeft > 0))
                          )
                            ? () => { setCassCompletedMode(false); setCassBreakupTaskId(null); needsPaywall ? setPaywallOpen(true) : setCassOpen(true); }
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: 4-column grid — flush top, no gaps, separator borders */}
              <div className="hidden border-b border-black/6 lg:grid lg:grid-cols-4">
                {snapshot.columns.map((column) => (
                  <BoardColumnView
                    key={column.id}
                    column={column}
                    tasks={getColumnTasks(tasks, column.id)}
                    onOpenTask={setSelectedTaskId}
                    onCreateTask={retroNudge ? undefined : openManualTask}
                    dragInProgress={!!dragTaskId}
                    allColumns={snapshot.columns}
                    onMoveToColumn={retroNudge ? undefined : handleMoveToColumn}
                    boardCompleted={!!snapshot.board.retroCompletedAt || retroNudge}
                    onOpenCass={
                      !snapshot.board.retroCompletedAt && !retroNudge &&
                      (
                        (column.name === "Done") ||
                        ((column.name === "Do This Week" || column.name === "Do Today" || column.name === "Blocked") && (daysLeft === null || daysLeft > 0))
                      )
                        ? () => { setCassCompletedMode(false); setCassBreakupTaskId(null); needsPaywall ? setPaywallOpen(true) : setCassOpen(true); }
                        : undefined
                    }
                  />
                ))}
              </div>

              {/* Full-viewport drag canvas — column zones (top 85%) + delete strip (bottom 15%) */}
              <DragCanvas
                active={!!dragTaskId}
                columns={snapshot.columns}
                tasks={tasks}
              />
            </DndContext>

            {/* Completed overlay — diagonal tape strip across the whole board */}
            {snapshot.board.retroCompletedAt && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
                overflow: "hidden", display: "flex", alignItems: "flex-start", justifyContent: "center",
                paddingTop: "250px",
              }}>
                <div style={{
                  background: "#bbf7d0",
                  clipPath: "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
                  transform: "rotate(-18deg)",
                  width: "110%",
                  padding: "18px 60px 22px",
                  textAlign: "center",
                  fontFamily: "var(--font-cass)",
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#1a0e00",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  lineHeight: 1.2,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 8px 40px rgba(0,0,0,0.15)",
                  whiteSpace: "nowrap",
                }}>
                  Completed<span className="hidden sm:inline"> on: {new Date(snapshot.board.retroCompletedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            )}
          </div>
        </section>

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
          <TapeButton variant="secondary" size="sm" onClick={() => setCompletedAlertOpen(false)}>
            Dismiss
          </TapeButton>
          {activeChapterUrl && (
            <TapeButton variant="primary" size="sm" onClick={() => router.push(activeChapterUrl)}>
              Go to current chapter
            </TapeButton>
          )}
        </div>
      </Modal>

      {/* FAB — plus circle on all screen sizes */}
      <MobileFab onClick={() => { setCassCompletedMode(false); setCassBreakupTaskId(null); needsPaywall ? setPaywallOpen(true) : setCassOpen(true); }} />

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />

      <CassBoardDrawer
        open={cassOpen}
        project={snapshot.project}
        board={snapshot.board}
        columns={snapshot.columns}
        tasks={tasks}
        templates={snapshot.workflowTemplates}
        breakupTask={cassBreakupTaskId ? (tasks.find((t) => t.id === cassBreakupTaskId) ?? null) : null}
        completedChapterMode={cassCompletedMode}
        retroNudge={retroNudge}
        onStartRetro={onStartRetro}
        initialMode={
          endChapterRequested
            ? "end_chapter"
            : !cassCompletedMode && !cassBreakupTaskId
              ? initialDrawerMode
              : undefined
        }
        fromOnboarding={skipIntro}
        chapterNumber={chapterNumber}
        chapterDaysLeft={daysLeft}
        onNavigateToLatest={activeChapterUrl ? () => router.push(activeChapterUrl) : undefined}
        onPlanChapters={() => router.push(`/projects/${chapterProjectId}?plan=true`)}
        onRefocus={bannerState.kind === "running_long" ? () => {} : undefined}
        onEndChapterConfirmed={!snapshot.board.retroCompletedAt ? (nextChapterId) => { onEndChapterConfirmed?.(nextChapterId); refreshData(); } : undefined}
        onRetroComplete={(data) => { onRetroComplete?.(data); refreshData(); }}
        onClose={() => { setCassOpen(false); setCassBreakupTaskId(null); setCassCompletedMode(false); setEndChapterRequested(false); onDrawerClosed?.(); }}
        onTasksAdded={refreshData}
        onTaskDeleted={refreshData}
      />
    </>
  );
}
