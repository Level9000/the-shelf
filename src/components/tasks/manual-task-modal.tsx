"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Layers3, MessageSquareText, Mic, PencilLine, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  Board,
  BoardColumn,
  Project,
  ProjectMember,
  Task,
  WorkflowTemplate,
} from "@/types";
import {
  createTaskAction,
  createTasksFromTemplateAction,
} from "@/lib/actions/task-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { StrategicTextDialogueModal } from "@/components/voice/strategic-text-dialogue-modal";
import {
  VoiceCapturePanel,
  type VoiceCapturePanelHandle,
  type VoiceProcessingResult,
} from "@/components/voice/voice-capture-panel";

type FormState = {
  title: string;
  description: string;
  assigneeName: string;
  priority: string;
  dueDate: string;
  columnId: string;
};

function getInitialState(columns: BoardColumn[]): FormState {
  return {
    title: "",
    description: "",
    assigneeName: "",
    priority: "",
    dueDate: "",
    columnId: columns[0]?.id ?? "",
  };
}

export function ManualTaskModal({
  open,
  onClose,
  project,
  board,
  columns,
  assignableMembers,
  templates,
  initialColumnId,
  onCreated,
  onProcessed,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  board: Board;
  columns: BoardColumn[];
  assignableMembers: ProjectMember[];
  templates: WorkflowTemplate[];
  initialColumnId?: string | null;
  onCreated: () => void;
  onProcessed: (result: VoiceProcessingResult) => void;
}) {
  const router = useRouter();
  const aiLauncherRef = useRef<VoiceCapturePanelHandle | null>(null);
  const [mode, setMode] = useState<"chooser" | "manual" | "template">("chooser");
  const [strategyDialogueOpen, setStrategyDialogueOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    ...getInitialState(columns),
    columnId: initialColumnId ?? columns[0]?.id ?? "",
  }));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  function handleChange(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createTaskAction({
          projectId: project.id,
          boardId: board.id,
          columnId: form.columnId,
          title: form.title,
          description: form.description,
          assigneeName: form.assigneeName || null,
          priority: (form.priority || null) as Task["priority"],
          dueDate: form.dueDate || null,
        });
        onCreated();
        onClose();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Failed to create task.",
        );
      }
    });
  }

  function handleApplyTemplate() {
    if (!selectedTemplate) {
      setError("Choose a template first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createTasksFromTemplateAction({
          projectId: project.id,
          boardId: board.id,
          templateId: selectedTemplate.id,
          columnMap: columns.map((column) => ({ id: column.id, name: column.name })),
        });
        onCreated();
        onClose();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Failed to apply template.",
        );
      }
    });
  }

  return (
    <>
      <Modal
        open={open}
        title="Add to backlog"
        description="Create a task manually, use a saved workflow, or let AI generate the work."
        onClose={onClose}
        className="max-w-5xl"
      >
        {mode === "chooser" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("manual");
                }}
                className="rounded-[1.75rem] bg-white/85 p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <PencilLine className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--ink)]">Create a task</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Add one card manually with your own title, details, and due date.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("template");
                }}
                className="rounded-[1.75rem] bg-white/85 p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Layers3 className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-[var(--ink)]">
                        Add from my template library
                      </p>
                      <Badge>{templates.length}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Choose a saved workflow and add its steps to this chapter instantly.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Level up with Pro
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    aiLauncherRef.current?.openAudioToBacklog();
                  }}
                  className="rounded-[1.75rem] bg-white/85 p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Mic className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[var(--ink)]">
                        Speech to backlog
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Record a note and turn it into reviewable tasks.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    aiLauncherRef.current?.openPlanWithAi();
                  }}
                  className="rounded-[1.75rem] bg-white/85 p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <MessageSquareText className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[var(--ink)]">
                        Plan with AI
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Talk through the work and extract backlog tasks fast.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "manual" ? (
          <>
            <TaskFormFields
              title={form.title}
              description={form.description}
              assigneeName={form.assigneeName}
              priority={form.priority as Task["priority"]}
              dueDate={form.dueDate}
              columnId={form.columnId}
              columns={columns}
              assignableMembers={assignableMembers}
              onChange={handleChange}
            />
            <div className="sticky bottom-0 mt-6 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
              <Button variant="secondary" onClick={() => setMode("chooser")}>
                Back
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? "Creating..." : "Create task"}
              </Button>
            </div>
          </>
        ) : null}

        {mode === "template" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <Sparkles className="size-4 text-[var(--accent)]" />
                My template library
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Saved workflows you can reuse across chapters and projects.
              </p>

              {templates.length === 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.5rem] bg-white/75 p-4 text-sm text-[var(--muted)]">
                    No templates saved yet. Use AI to capture a repeatable process and turn it into a reusable workflow.
                  </div>
                  <button
                    type="button"
                    onClick={() => setStrategyDialogueOpen(true)}
                    className="flex w-full items-center gap-3 rounded-[1.5rem] bg-white p-4 text-left ring-1 ring-[var(--accent)]/20 transition hover:shadow-md hover:shadow-black/5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Wand2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">Build with AI</p>
                      <p className="text-xs text-[var(--muted)]">Describe a process and Shelf will capture it as a template.</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full rounded-[1.5rem] p-4 text-left transition ${
                        template.id === selectedTemplateId
                          ? "bg-white shadow-sm ring-2 ring-[var(--accent)]/30"
                          : "bg-white/75 ring-1 ring-black/6 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--ink)]">
                          {template.name}
                        </p>
                        <Badge>{template.steps.length} steps</Badge>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                        Trigger: {template.triggerPhrase}
                      </p>
                      {template.description ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {template.description}
                        </p>
                      ) : null}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStrategyDialogueOpen(true)}
                    className="flex w-full items-center gap-3 rounded-[1.5rem] border border-dashed border-[var(--accent)]/30 bg-white/60 p-4 text-left transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Wand2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">Build new template with AI</p>
                      <p className="text-xs text-[var(--muted)]">Capture another repeatable process.</p>
                    </div>
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] bg-white/90 p-5 ring-1 ring-black/6">
              {selectedTemplate ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--ink)]">
                        {selectedTemplate.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Trigger phrase: {selectedTemplate.triggerPhrase}
                      </p>
                    </div>
                    <Badge>{selectedTemplate.steps.length} tasks</Badge>
                  </div>
                  {selectedTemplate.description ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {selectedTemplate.description}
                    </p>
                  ) : null}
                  <div className="mt-5 space-y-3">
                    {selectedTemplate.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="rounded-[1.4rem] bg-[var(--surface-muted)] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[var(--ink)]">
                          {index + 1}. {step.title}
                        </p>
                        {step.description ? (
                          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                            {step.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-[var(--muted)]">
                  Pick a template from the left to preview the steps that will be added
                  to this chapter.
                </div>
              )}
            </section>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {mode === "chooser" ? (
          <div className="sticky bottom-0 mt-6 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : null}

        {mode === "template" ? (
          <div className="sticky bottom-0 mt-6 flex flex-wrap justify-center gap-3 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
            <Button variant="secondary" onClick={() => setMode("chooser")}>
              Back
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={isPending || !selectedTemplate}
            >
              {isPending ? "Adding..." : "Add template to backlog"}
            </Button>
          </div>
        ) : null}
      </Modal>

      <VoiceCapturePanel
        ref={aiLauncherRef}
        project={project}
        boardId={board.id}
        columns={columns}
        onProcessed={(result) => {
          onClose();
          onProcessed(result);
        }}
        onTasksCreated={() => {
          onCreated();
          onClose();
        }}
        showLauncher={false}
      />

      <StrategicTextDialogueModal
        open={strategyDialogueOpen}
        project={project}
        boardId={board.id}
        columns={columns}
        onClose={() => setStrategyDialogueOpen(false)}
        onProcessed={(result) => {
          setStrategyDialogueOpen(false);
          onClose();
          onProcessed(result);
        }}
        onTasksCreated={() => {
          setStrategyDialogueOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
