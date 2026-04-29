"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Board, BoardColumn, ProjectMember, ProposedTask } from "@/types";
import { acceptProposedTasksAction } from "@/lib/actions/task-actions";
import { fallbackColumnName } from "@/lib/board-utils";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditableProposal = ProposedTask & {
  selected: boolean;
};

export function ReviewTasksModal({
  open,
  projectId,
  board,
  columns,
  assignableMembers,
  captureId,
  templateId,
  transcript,
  proposals,
  onClose,
  onAccepted,
}: {
  open: boolean;
  projectId: string;
  board: Board;
  columns: BoardColumn[];
  assignableMembers: ProjectMember[];
  captureId: string | null;
  templateId?: string | null;
  transcript: string;
  proposals: ProposedTask[];
  onClose: () => void;
  onAccepted: () => void;
}) {
  const [items, setItems] = useState<EditableProposal[]>(() =>
    proposals.map((proposal) => ({
      ...proposal,
      selected: true,
      suggestedColumn: fallbackColumnName(proposal.suggestedColumn),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCount = useMemo(
    () => items.filter((item) => item.selected).length,
    [items],
  );
  const assigneeSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          assignableMembers
            .map((member) => (member.displayName?.trim() || member.email.trim()))
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [assignableMembers],
  );

  function updateItem(
    id: string,
    field: string,
    value: string | boolean | null,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function acceptSelected() {
    const selected = items.filter((item) => item.selected);

    if (!captureId) {
      setError("Voice capture metadata is missing.");
      return;
    }

    if (selected.length === 0) {
      setError("Select at least one task to save.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await acceptProposedTasksAction({
          projectId,
          boardId: board.id,
          captureId,
          templateId,
          proposals: selected,
          columnMap: columns.map((column) => ({ id: column.id, name: column.name })),
        });
        onAccepted();
        onClose();
      } catch (acceptError) {
        setError(
          acceptError instanceof Error
            ? acceptError.message
            : "Failed to save tasks.",
        );
      }
    });
  }

  return (
    <Modal
      open={open}
      title="Review extracted tasks"
      description="Edit, remove, or deselect anything that doesn’t belong before saving cards to the board."
      onClose={onClose}
      className="max-w-5xl"
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Transcript</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Parsed into {items.length} proposed tasks
              </p>
            </div>
            <Badge>{selectedCount} selected</Badge>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
            {transcript}
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Proposed tasks</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Titles stay concise; details live in descriptions.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  setItems((current) =>
                    current.map((item) => ({ ...item, selected: true })),
                  )
                }
              >
                Accept all
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[1.75rem] bg-[var(--surface-muted)] p-6 text-sm text-[var(--muted)]">
              No tasks were extracted. You can record again or create a task manually.
            </div>
          ) : null}

          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-[1.75rem] border p-4 transition",
                item.selected ? "bg-white/90" : "bg-black/[0.02] opacity-75",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(event) => updateItem(item.id, "selected", event.target.checked)}
                    className="size-4 rounded border-black/15 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  Include task
                </label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-black/5 text-[var(--muted)]">
                    {(item.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                  <Button variant="ghost" onClick={() => removeItem(item.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Title</label>
                  <Input
                    value={item.title}
                    onChange={(event) => updateItem(item.id, "title", event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <Textarea
                    value={item.description}
                    onChange={(event) =>
                      updateItem(item.id, "description", event.target.value)
                    }
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Assigned to</label>
                  <Input
                    list="review-task-assignee-suggestions"
                    value={item.assigneeName ?? ""}
                    onChange={(event) =>
                      updateItem(item.id, "assigneeName", event.target.value)
                    }
                    placeholder="Alex Morgan"
                  />
                  {assigneeSuggestions.length > 0 ? (
                    <datalist id="review-task-assignee-suggestions">
                      {assigneeSuggestions.map((email) => (
                        <option key={email} value={email} />
                      ))}
                    </datalist>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Column</label>
                    <select
                      value={item.suggestedColumn}
                      onChange={(event) =>
                        updateItem(item.id, "suggestedColumn", event.target.value)
                      }
                      className="w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    >
                      {columns.map((column) => (
                        <option key={column.id} value={column.name}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Priority</label>
                    <select
                      value={item.priority ?? ""}
                      onChange={(event) =>
                        updateItem(item.id, "priority", event.target.value || null)
                      }
                      className="w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    >
                      <option value="">None</option>
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Due date</label>
                    <Input
                      type="date"
                      value={item.dueDate ?? ""}
                      onChange={(event) => updateItem(item.id, "dueDate", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-6 flex flex-col items-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 text-center backdrop-blur">
        <p className="text-sm text-[var(--muted)]">
          Nothing is saved until you confirm.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Keep reviewing
          </Button>
          <Button onClick={acceptSelected} disabled={isPending || items.length === 0}>
            <Check className="mr-2 size-4" />
            {isPending ? "Saving..." : `Save ${selectedCount} task${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
