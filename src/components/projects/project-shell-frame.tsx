"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { ProjectAppHeader } from "@/components/projects/project-app-header";
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
  activeNav,
  retroAvailable,
  onEndChapter,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  activeNav?: "overview" | "board";
  retroAvailable?: boolean;
  onEndChapter?: () => void;
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* ── Desktop layout (lg+): header banner + full-width content ── */}
      <div className="hidden lg:flex lg:min-h-screen lg:flex-col">
        <ProjectAppHeader
          projects={projects}
          currentProjectId={currentProjectId}
          currentChapterId={currentChapterId}
          onOpenSettings={() => setSettingsOpen(true)}
          activeNav={activeNav}
          retroAvailable={retroAvailable}
          onEndChapter={onEndChapter}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>

      {/* ── Mobile layout (<lg): hamburger header + content ── */}
      <div className="lg:hidden">
        <div className="mb-4 flex items-center justify-between">
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
        {children}
      </div>

      {/* ── Mobile sidebar overlay ── */}
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
