"use client";

import { useState } from "react";
import { Circle, CheckCircle2, Trash2, X } from "lucide-react";
import type { BoardColumn, Task } from "@/types";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

// Time to let the filled-in checkmark register before the row disappears
// (the parent removes the task from its list as soon as onComplete fires).
const CHECK_ANIMATION_MS = 300;

const DROP_REASONS = ["Blocked", "No longer relevant", "Deprioritized"] as const;

export function ChapterTaskList({
  tasks,
  columns,
  onComplete,
  onDelete,
  onOpenTask,
}: {
  tasks: Task[];
  columns: BoardColumn[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string, reason: string) => void;
  onOpenTask?: (taskId: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  function handleTap(taskId: string) {
    if (checkedIds.has(taskId)) return;
    setCheckedIds((prev) => new Set(prev).add(taskId));
    setTimeout(() => onComplete?.(taskId), CHECK_ANIMATION_MS);
  }

  function startDelete(taskId: string) {
    setDeletingTaskId(taskId);
  }

  function cancelDelete() {
    setDeletingTaskId(null);
  }

  function finalizeDelete(taskId: string, reason: string) {
    onDelete?.(taskId, reason);
    setDeletingTaskId(null);
  }

  const doneColumnId = columns.find((col) => col.name.toLowerCase() === "done")?.id;
  const remainingTasks = tasks
    .filter((task) => task.columnId !== doneColumnId)
    .sort((a, b) => a.position - b.position);
  const completedTasks = doneColumnId
    ? tasks.filter((task) => task.columnId === doneColumnId)
    : [];
  const totalCount = tasks.length;
  const percentComplete = totalCount > 0 ? Math.round((completedTasks.length / totalCount) * 100) : 0;

  if (totalCount === 0) return null;

  const labelColor = isDark ? "rgba(200,168,107,0.45)" : "rgba(0,0,0,0.38)";
  const progressTrack = isDark ? "rgba(245,200,74,0.12)" : "rgba(245,200,74,0.15)";
  const rowBorder = isDark ? "rgba(200,168,107,0.1)" : "rgba(0,0,0,0.07)";
  const titleColor = isDark ? "rgba(232,224,208,0.85)" : "rgba(22,19,15,0.85)";
  const checkIdle = isDark ? "rgba(200,168,107,0.35)" : "rgba(0,0,0,0.25)";
  const checkHover = isDark ? "#c8a86b" : "rgba(22,19,15,0.6)";
  const metaColor = isDark ? "rgba(200,168,107,0.5)" : "rgba(0,0,0,0.4)";
  const chipBg = isDark ? "rgba(200,168,107,0.08)" : "rgba(0,0,0,0.04)";
  const chipBorder = isDark ? "rgba(200,168,107,0.25)" : "rgba(0,0,0,0.14)";
  const chipHoverBorder = isDark ? "#c8a86b" : "rgba(22,19,15,0.5)";
  const promptColor = isDark ? "rgba(232,224,208,0.6)" : "rgba(22,19,15,0.55)";

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{
          width: "100%", height: "5px", borderRadius: "3px",
          background: progressTrack, overflow: "hidden",
        }}>
          <div style={{
            width: `${percentComplete}%`, height: "100%",
            background: "linear-gradient(90deg, rgba(200,168,107,0.65) 0%, #c8a86b 100%)",
            borderRadius: "3px",
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em",
          color: labelColor, margin: "6px 0 0",
        }}>
          {completedTasks.length} of {totalCount} done · {percentComplete}%
        </p>
      </div>

      {remainingTasks.length > 0 && (
      <div style={{ marginTop: "20px" }}>
      <p style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: labelColor,
        margin: "0 0 8px",
      }}>
        Things I want to do
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {remainingTasks.map((task, i) => {
          const checked = checkedIds.has(task.id);
          const isDeleting = deletingTaskId === task.id;
          return (
          <div
            key={task.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "10px 0",
              borderTop: i === 0 ? "none" : `1px solid ${rowBorder}`,
            }}
          >
            <button
              type="button"
              onClick={() => handleTap(task.id)}
              disabled={checked || isDeleting}
              aria-label={`Mark "${task.title}" complete`}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: "1px",
                cursor: checked ? "default" : "pointer",
                color: checked ? "#4ade80" : checkIdle,
                flexShrink: 0,
                lineHeight: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { if (!checked) e.currentTarget.style.color = checkHover; }}
              onMouseLeave={(e) => { if (!checked) e.currentTarget.style.color = checkIdle; }}
            >
              {checked
                ? <CheckCircle2 size={18} strokeWidth={1.5} fill="currentColor" stroke={isDark ? "#0d0c09" : "#faf9f4"} />
                : <Circle size={18} strokeWidth={1.5} />}
            </button>

            <div
              style={{ flex: 1, minWidth: 0 }}
              onClick={!isDeleting && !checked ? () => onOpenTask?.(task.id) : undefined}
            >
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                lineHeight: 1.5,
                color: titleColor,
                margin: 0,
                cursor: !isDeleting && !checked && onOpenTask ? "pointer" : "default",
              }}>
                {task.title}
              </p>
              {(task.isUrgent || task.size || task.dueDate) && (
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "11px",
                  color: metaColor,
                  margin: "3px 0 0",
                }}>
                  {[
                    task.isUrgent ? "Urgent" : null,
                    task.size ? `${task.size === "small" ? "Small" : "Big"} effort` : null,
                    task.dueDate ? formatDate(task.dueDate) : null,
                  ]
                    .filter(Boolean)
                    .map((part, i) =>
                      i === 0
                        ? <span key={part}>{part}</span>
                        : <span key={part}> · {part}</span>,
                    )}
                </p>
              )}

              {isDeleting && (
                <div style={{ marginTop: "10px" }}>
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13px",
                    color: promptColor,
                    margin: "0 0 8px",
                  }}>
                    Why are you dropping this?
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {DROP_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => finalizeDelete(task.id, reason)}
                        style={{
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: "12.5px",
                          color: titleColor,
                          background: chipBg,
                          border: `1px solid ${chipBorder}`,
                          borderRadius: "999px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = chipHoverBorder; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = chipBorder; }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => (isDeleting ? cancelDelete() : startDelete(task.id))}
              aria-label={isDeleting ? "Cancel" : `Delete "${task.title}"`}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: "1px",
                cursor: "pointer",
                color: checkIdle,
                flexShrink: 0,
                lineHeight: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = checkHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = checkIdle; }}
            >
              {isDeleting ? <X size={18} strokeWidth={1.5} /> : <Trash2 size={16} strokeWidth={1.5} />}
            </button>
          </div>
          );
        })}
      </div>
      </div>
      )}

      {completedTasks.length > 0 && (
        <div style={{ marginTop: remainingTasks.length > 0 ? "22px" : "0" }}>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: labelColor,
            margin: "0 0 8px",
          }}>
            Things I&apos;ve completed
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {completedTasks.map((task, i) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${rowBorder}`,
                }}
              >
                <CheckCircle2 size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: metaColor }} />
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13px",
                  color: metaColor,
                  margin: 0,
                  textDecoration: "line-through",
                  textDecorationColor: isDark ? "rgba(200,168,107,0.3)" : "rgba(0,0,0,0.2)",
                }}>
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
