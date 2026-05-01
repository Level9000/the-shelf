"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectShellFrame({
  projects,
  profile,
  currentProjectId,
  currentChapterId = null,
  mobileEyebrow,
  mobileTitle,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "grid gap-6 lg:min-h-[calc(100dvh-4rem)] lg:items-stretch",
          collapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[300px_minmax(0,1fr)]",
        )}
      >
        <div className="hidden lg:block lg:min-h-[calc(100dvh-4rem)]">
          <ProjectSidebar
            projects={projects}
            currentProjectId={currentProjectId}
            currentChapterId={currentChapterId}
            collapsed={collapsed}
            onToggle={() => setCollapsed((current) => !current)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
        <div className="min-w-0 lg:min-h-[calc(100dvh-4rem)]">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Button
              variant="secondary"
              className="gap-2 px-4"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="size-4" />
              Shelf
            </Button>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {mobileEyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                {mobileTitle}
              </p>
            </div>
          </div>
          <div className="lg:flex lg:min-h-[calc(100dvh-8.5rem)] lg:flex-col">
            {children}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileSidebarOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
            mobileSidebarOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[88vw] max-w-[360px] p-4 transition-transform duration-300",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-3 flex justify-start">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/80 text-[var(--ink)] shadow-lg shadow-black/10"
              aria-label="Close shelf menu"
            >
              <X className="size-4" />
            </button>
          </div>
          <ProjectSidebar
            projects={projects}
            currentProjectId={currentProjectId}
            currentChapterId={currentChapterId}
            collapsed={false}
            onToggle={() => {}}
            onOpenSettings={() => {
              setMobileSidebarOpen(false);
              setSettingsOpen(true);
            }}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
