"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { BoardColumn, Priority, ProjectMember } from "@/types";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function AssigneeMultiSelect({
  value,
  memberOptions,
  onChange,
}: {
  value: string;
  memberOptions: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  function toggle(name: string) {
    const next = selected.includes(name)
      ? selected.filter((s) => s !== name)
      : [...selected, name];
    onChange(next.join(", "));
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-sm outline-none transition",
          open
            ? "border-[var(--accent)] ring-4 ring-[var(--accent-soft)]"
            : "border-[var(--border,#e5e7eb)] hover:border-[var(--accent)]/50",
        )}
      >
        <span className={selected.length > 0 ? "text-[var(--ink)]" : "text-[var(--muted)]"}>
          {selected.length > 0 ? selected.join(", ") : "Choose collaborators"}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 size-4 shrink-0 text-[var(--muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && memberOptions.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border bg-white shadow-lg">
          {memberOptions.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--surface-muted)]"
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[var(--muted)]/40",
                  )}
                >
                  {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className={isSelected ? "font-medium text-[var(--ink)]" : "text-[var(--ink)]"}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskFormFields({
  title,
  description,
  assigneeName,
  priority,
  dueDate,
  columnId,
  columns,
  assignableMembers,
  onChange,
}: {
  title: string;
  description: string;
  assigneeName: string;
  priority: Priority;
  dueDate: string;
  columnId: string;
  columns: BoardColumn[];
  assignableMembers: ProjectMember[];
  onChange: (field: string, value: string) => void;
}) {
  const memberOptions = Array.from(
    new Map(
      assignableMembers
        .map((member) => {
          const value = member.displayName?.trim() || member.email.trim();
          if (!value) return null;
          return [
            value,
            {
              value,
              label: member.displayName
                ? `${member.displayName} (${member.email})`
                : member.email,
            },
          ] as const;
        })
        .filter(Boolean) as Array<
        readonly [string, { value: string; label: string }]
      >,
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Rewrite homepage headline"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Add context, references, or the next step."
          className="min-h-[140px]"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Assigned to</label>
        {memberOptions.length > 0 ? (
          <AssigneeMultiSelect
            value={assigneeName}
            memberOptions={memberOptions}
            onChange={(value) => onChange("assigneeName", value)}
          />
        ) : (
          <Input
            value={assigneeName}
            onChange={(event) => onChange("assigneeName", event.target.value)}
            placeholder="Choose collaborators"
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Column</label>
          <select
            value={columnId}
            onChange={(event) => onChange("columnId", event.target.value)}
            className="w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Priority</label>
          <select
            value={priority ?? ""}
            onChange={(event) => onChange("priority", event.target.value)}
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
            value={dueDate}
            onChange={(event) => onChange("dueDate", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
