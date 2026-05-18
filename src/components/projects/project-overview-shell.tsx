"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ChapterPlannerChat } from "@/components/projects/chapter-planner-chat";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { SparkleShareIcon } from "@/components/ui/sparkle-share-icon";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chapterStatus(chapter: Chapter): "completed" | "working_on_it" | "planned" {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

// ── FAB action sheet ──────────────────────────────────────────────────────────

function FabActionSheet({
  project,
  onClose,
  onPlan,
  onRefine,
}: {
  project: ProjectWithChapters;
  onClose: () => void;
  onPlan: () => void;
  onRefine: () => void;
}) {
  const router = useRouter();
  const lastCompletedChapter = [...project.chapters].reverse().find((c) => c.retroCompletedAt);

  const actions = [
    {
      Icon: MessageSquare,
      title: "Plan chapters",
      description: "Map out what's coming next",
      onClick: () => { onClose(); onPlan(); },
      disabled: false,
    },
    {
      Icon: SparkleShareIcon,
      title: "Craft your story",
      description: lastCompletedChapter
        ? "Turn a completed chapter into content to share"
        : "Complete a chapter first to craft your story",
      onClick: lastCompletedChapter
        ? () => {
            onClose();
            router.push(`/projects/${project.id}/chapters/${lastCompletedChapter.id}`);
          }
        : null,
      disabled: !lastCompletedChapter,
    },
    {
      Icon: Sparkles,
      title: "Refine the vision",
      description: "Sharpen your north star and narrative arc",
      onClick: () => { onClose(); onRefine(); },
      disabled: false,
    },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center lg:inset-0 lg:items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full rounded-t-[2rem] pb-10 pt-5 lg:max-w-sm lg:rounded-[2rem] lg:pb-6"
          style={{ background: "#111", border: "1px solid rgba(200,168,107,0.15)" }}
        >
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "9px",
              letterSpacing: "3px",
              color: "rgba(200,168,107,0.5)",
              textTransform: "uppercase",
              padding: "0 24px 14px",
            }}
          >
            What do you want to do?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
            {actions.map(({ Icon, title, description, onClick, disabled }) => (
              <button
                key={title}
                type="button"
                onClick={onClick ?? undefined}
                disabled={disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  borderRadius: "1.25rem",
                  padding: "14px 16px",
                  textAlign: "left",
                  transition: "background 0.15s",
                  background: "transparent",
                  border: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.35 : 1,
                  width: "100%",
                }}
                onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(200,168,107,0.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(200,168,107,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: "18px", height: "18px", color: "#c8a86b" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", fontWeight: 600, color: "#e8e0d0", margin: 0 }}>
                    {title}
                  </p>
                  <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(200,168,107,0.45)", margin: "3px 0 0" }}>
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chapter entry ─────────────────────────────────────────────────────────────

function ChapterEntry({
  chapter,
  index,
  projectId,
  isLast,
}: {
  chapter: Chapter;
  index: number;
  projectId: string;
  isLast: boolean;
}) {
  const status = chapterStatus(chapter);

  return (
    <div>
      {/* Gold rule divider between chapters */}
      {index > 0 && (
        <div
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(200,168,107,0.18) 20%, rgba(200,168,107,0.18) 80%, transparent)",
            margin: "48px 0",
          }}
        />
      )}

      <div style={{ opacity: status === "planned" ? 0.4 : 1, transition: "opacity 0.2s" }}>
        {/* Chapter label */}
        <p
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "9px",
            letterSpacing: "3.5px",
            color: status === "completed" ? "rgba(200,168,107,0.55)" : "rgba(200,168,107,0.3)",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Chapter {index + 1}
          {status === "working_on_it" && (
            <span style={{ marginLeft: "10px", color: "rgba(200,168,107,0.5)" }}>· in progress</span>
          )}
          {status === "planned" && (
            <span style={{ marginLeft: "10px", color: "rgba(200,168,107,0.3)" }}>· coming up</span>
          )}
        </p>

        {/* Chapter name — links to the chapter page */}
        <Link
          href={`/projects/${projectId}/chapters/${chapter.id}`}
          style={{ textDecoration: "none" }}
        >
          <h2
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "22px",
              color: status === "completed" ? "#e8e0d0" : "rgba(232,224,208,0.6)",
              margin: 0,
              lineHeight: 1.3,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { if (status !== "planned") (e.target as HTMLElement).style.color = "#c8a86b"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = status === "completed" ? "#e8e0d0" : "rgba(232,224,208,0.6)"; }}
          >
            {chapter.name}
          </h2>
        </Link>

        {/* Completed: pull quote */}
        {status === "completed" && chapter.openingLine && (
          <p
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "17px",
              fontStyle: "italic",
              color: "#c8a86b",
              lineHeight: 1.75,
              margin: "14px 0 0",
              paddingLeft: "16px",
              borderLeft: "2px solid rgba(200,168,107,0.3)",
            }}
          >
            &ldquo;{chapter.openingLine}&rdquo;
          </p>
        )}

        {/* Completed: full chapter story */}
        {status === "completed" && chapter.chapterStory && (
          <p
            style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: "15px",
              color: "rgba(232,224,208,0.8)",
              lineHeight: 1.85,
              margin: "16px 0 0",
            }}
          >
            {chapter.chapterStory}
          </p>
        )}

        {/* Completed: no story yet — show the bet */}
        {status === "completed" && !chapter.chapterStory && chapter.goal && (
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px",
              color: "rgba(200,168,107,0.4)",
              lineHeight: 1.7,
              margin: "12px 0 0",
              fontStyle: "italic",
            }}
          >
            {chapter.goal}
          </p>
        )}

        {/* In progress: pulsing indicator + goal */}
        {status === "working_on_it" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "14px" }}>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#c8a86b",
                flexShrink: 0,
                marginTop: "5px",
                animation: "overviewPulse 2s ease-in-out infinite",
              }}
            />
            <p
              style={{
                fontFamily: "'Special Elite', cursive",
                fontSize: "14px",
                color: "rgba(232,224,208,0.5)",
                lineHeight: 1.7,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {chapter.goal || "This chapter is being written…"}
            </p>
          </div>
        )}

        {/* Planned: goal if set, otherwise placeholder */}
        {status === "planned" && chapter.goal && (
          <p
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px",
              color: "rgba(200,168,107,0.3)",
              lineHeight: 1.65,
              margin: "10px 0 0",
            }}
          >
            {chapter.goal}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function ProjectOverviewShell({
  project,
  projects,
  profile,
  currentUser,
  projectMembers,
  lastChapterId,
  initialPlanning = false,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
  lastChapterId?: string | null;
  initialPlanning?: boolean;
}) {
  const [refining, setRefining] = useState(false);
  const [planning, setPlanning] = useState(initialPlanning);
  const [fabOpen, setFabOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={project.id}
        lastChapterId={lastChapterId}
        activeNav="overview"
        mobileEyebrow="Overview"
        mobileTitle={project.name}
        onPlanChapters={() => setPlanning(true)}
      >
        {refining ? (
          <ProjectArcRefiner project={project} onClose={() => setRefining(false)} />
        ) : planning ? (
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6 lg:px-8">
            <ChapterPlannerChat project={project} onClose={() => setPlanning(false)} />
          </div>
        ) : (
          /* ── The Story So Far ── */
          <div
            className="-mx-4 lg:mx-0"
            style={{
              background: "#0a0a0a",
              backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(200,168,107,0.04) 0%, transparent 65%)",
              minHeight: "100%",
              paddingBottom: "120px",
            }}
          >
            <style>{`
              @keyframes overviewPulse {
                0%, 100% { opacity: 0.4; transform: scale(0.85); }
                50% { opacity: 1; transform: scale(1.15); }
              }
            `}</style>

            {/* Reading column */}
            <div
              style={{
                maxWidth: "660px",
                margin: "0 auto",
                padding: "48px 28px 0",
              }}
            >

              {/* ── Masthead ── */}
              <header style={{ marginBottom: "52px" }}>
                <p
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "3.5px",
                    color: "rgba(200,168,107,0.45)",
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}
                >
                  The Story So Far
                </p>
                <h1
                  style={{
                    fontFamily: "'Special Elite', cursive",
                    fontSize: "clamp(28px, 5vw, 40px)",
                    color: "#e8e0d0",
                    margin: 0,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {project.name}
                </h1>

                {project.northStar && (
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "#c8a86b",
                      margin: "14px 0 0",
                      lineHeight: 1.65,
                      opacity: 0.85,
                    }}
                  >
                    &ldquo;{project.northStar}&rdquo;
                  </p>
                )}

                {/* Thin rule under masthead */}
                <div
                  style={{
                    height: "1px",
                    background: "linear-gradient(90deg, rgba(200,168,107,0.25), rgba(200,168,107,0.06) 70%, transparent)",
                    marginTop: "28px",
                  }}
                />
              </header>

              {/* ── Chapter list ── */}
              {project.chapters.length > 0 ? (
                <div>
                  {project.chapters.map((chapter, i) => (
                    <ChapterEntry
                      key={chapter.id}
                      chapter={chapter}
                      index={i}
                      projectId={project.id}
                      isLast={i === project.chapters.length - 1}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p
                    style={{
                      fontFamily: "'Special Elite', cursive",
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "rgba(232,224,208,0.3)",
                      lineHeight: 1.7,
                    }}
                  >
                    The first chapter hasn&apos;t started yet.
                    <br />
                    Use the button below to plan it.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── FAB — gold Cass-themed ── */}
        {!refining && !planning && (
          <button
            type="button"
            onClick={() => setFabOpen(true)}
            aria-label="Actions"
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 40,
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c8a86b, #a8864e)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(200,168,107,0.35), 0 2px 8px rgba(0,0,0,0.4)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(200,168,107,0.45), 0 4px 12px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(200,168,107,0.35), 0 2px 8px rgba(0,0,0,0.4)";
            }}
          >
            <Sparkles style={{ width: "20px", height: "20px", color: "#0a0a0a" }} />
          </button>
        )}

      </ProjectShellFrame>

      {/* ── FAB action sheet ── */}
      {fabOpen && (
        <FabActionSheet
          project={project}
          onClose={() => setFabOpen(false)}
          onPlan={() => setPlanning(true)}
          onRefine={() => setRefining(true)}
        />
      )}

      <ProjectOverviewSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        project={project}
        currentUser={currentUser}
        members={projectMembers}
      />
    </>
  );
}
