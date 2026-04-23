import { DEFAULT_COLUMNS } from "@/lib/constants";

export function normalizeTaskOrder(
  columns: Array<{ id: string }>,
  tasks: Array<{ id: string; columnId: string }>,
) {
  const updates: Array<{ id: string; columnId: string; position: number }> = [];

  columns.forEach((column) => {
    tasks
      .filter((task) => task.columnId === column.id)
      .forEach((task, index) => {
        updates.push({
          id: task.id,
          columnId: task.columnId,
          position: (index + 1) * 1000,
        });
      });
  });

  return updates;
}

export function fallbackColumnName(columnName: string) {
  return DEFAULT_COLUMNS.includes(columnName as (typeof DEFAULT_COLUMNS)[number])
    ? columnName
    : "Inbox";
}
