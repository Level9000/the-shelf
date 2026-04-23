import type { BoardColumn, Priority } from "@/types";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TaskFormFields({
  title,
  description,
  priority,
  dueDate,
  columnId,
  columns,
  onChange,
}: {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  columnId: string;
  columns: BoardColumn[];
  onChange: (field: string, value: string) => void;
}) {
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
