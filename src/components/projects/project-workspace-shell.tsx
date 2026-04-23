"use client";

import { useState } from "react";
import type { BoardSnapshot, Project } from "@/types";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { cn } from "@/lib/utils";

export function ProjectWorkspaceShell({
  snapshot,
  projects,
  currentProjectId,
}: {
  snapshot: BoardSnapshot;
  projects: Project[];
  currentProjectId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "grid gap-6 lg:items-start",
        collapsed
          ? "lg:grid-cols-[88px_minmax(0,1fr)]"
          : "lg:grid-cols-[300px_minmax(0,1fr)]",
      )}
    >
      <ProjectSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
      <ProjectBoardClient snapshot={snapshot} />
    </div>
  );
}
