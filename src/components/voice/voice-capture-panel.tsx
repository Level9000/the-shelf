"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Mic,
  PauseCircle,
  Speech,
  WandSparkles,
} from "lucide-react";
import type { Project, ProposedTask } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "processing" | "ready" | "error";

export type VoiceProcessingResult = {
  captureId: string;
  transcript: string;
  proposals: ProposedTask[];
};

export type VoiceCapturePanelHandle = {
  startCapture: () => void;
};

export const VoiceCapturePanel = forwardRef<VoiceCapturePanelHandle, {
  project: Project;
  onProcessed: (result: VoiceProcessingResult) => void;
  className?: string;
  idleDescription?: string;
}>(
function VoiceCapturePanel({
  project,
  onProcessed,
  className,
  idleDescription,
}, ref) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state !== "recording") return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state]);

  const processRecording = useCallback((audioBlob: Blob) => {
    setMessage(null);
    setState("processing");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("projectId", project.id);
        formData.append(
          "audio",
          new File([audioBlob], "voice-note.webm", { type: "audio/webm" }),
        );

        const response = await fetch("/api/voice/process", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as {
          id?: string;
          transcript?: string;
          tasks?: ProposedTask[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Voice processing failed.");
        }

        const transcript = payload.transcript?.trim();

        if (!transcript) {
          throw new Error("Transcription came back empty.");
        }

        const proposals =
          payload.tasks?.map((task) => ({
            ...task,
            title: task.title.trim(),
            description: task.description ?? "",
          })) ?? [];

        setState("ready");
        setModalOpen(false);
        onProcessed({
          captureId: payload.id ?? crypto.randomUUID(),
          transcript,
          proposals,
        });
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error ? error.message : "Voice processing failed.",
        );
      }
    });
  }, [onProcessed, project.id, startTransition]);

  const startRecording = useCallback(async () => {
    try {
      setMessage(null);
      setModeNote(null);
      setElapsedSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });

      const chunks: Blob[] = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        void processRecording(blob);
      });

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setState("error");
      setMessage("Microphone access failed. Check browser permissions and try again.");
    }
  }, [processRecording]);

  useImperativeHandle(ref, () => ({
    startCapture: () => {
      if (window.matchMedia("(max-width: 767px)").matches) {
        setModeNote(null);
        setModePickerOpen(true);
        return;
      }
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setModalOpen(true);
    },
  }), []);

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  }

  return (
    <>
      {isCollapsed ? (
        <div className={cn("mb-4 flex justify-end", className)}>
          <Button
            variant="secondary"
            className="gap-2 px-3 py-2 text-xs"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand AI modes"
          >
            Use Voice Features
            <ChevronDown className="size-4" />
          </Button>
        </div>
      ) : (
        <section
          ref={sectionRef}
          className={cn(
            "mb-4 rounded-[1.75rem] border border-dashed border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,243,238,0.94))] p-4",
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                <WandSparkles className="size-3.5" />
                Pro tier AI modes
              </div>
              <p className="mt-3 hidden text-sm leading-6 text-[var(--muted)] md:block">
                Choose how you want Shelf to help: capture spoken thoughts into
                tasks, align through back-and-forth text, or strategize out loud
                with voice dialogue.
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)] md:hidden">
                Premium AI features leveraging recordings, voice, and text to populate your backlog.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white md:inline-flex">
                Try free, upgrade later
              </div>
              <Button
                variant="secondary"
                className="gap-2 px-3 py-2 text-xs"
                onClick={() => setIsCollapsed(true)}
                aria-label="Minimize AI modes"
              >
                Minimize
                <ChevronUp className="size-4" />
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setModeNote(null);
              setModePickerOpen(true);
            }}
            className="rounded-[1.4rem] bg-white/85 p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5 md:hidden"
          >
            <p className="text-base font-semibold text-[var(--ink)]">
              Want to talk things out?
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Premium AI features leveraging recordings, voice, and text to populate your backlog.
            </p>
          </button>
          <div className="hidden gap-3 md:grid md:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setModeNote(null);
                setModalOpen(true);
              }}
              className="rounded-[1.25rem] bg-white/75 p-4 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <Mic className="size-4 text-[var(--accent)]" />
                Audio to backlog
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Record a note and turn it into proposed board items in one pass.
              </p>
            </button>
            <div className="rounded-[1.25rem] bg-white/75 p-4 ring-1 ring-black/6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <MessageSquareText className="size-4 text-[var(--accent)]" />
                Strategic text dialogue
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Think through priorities with AI over text and shape the right tasks.
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/75 p-4 ring-1 ring-black/6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <Speech className="size-4 text-[var(--accent)]" />
                Strategic voice dialogue
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Talk through the work out loud and let AI help structure the plan.
              </p>
            </div>
          </div>
          <div className="mt-3 hidden items-center gap-2 text-xs text-[var(--muted)] md:flex">
            <WandSparkles className="size-3.5" />
            Review happens before save, so AI suggestions never auto-create cards.
          </div>
        </section>
      )}

      {modeNote ? (
        <p className="mt-3 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          {modeNote}
        </p>
      ) : null}

      <Modal
        open={modePickerOpen}
        onClose={() => setModePickerOpen(false)}
        title="Choose an AI workflow"
        description="Pick the mode that matches how you want to think through the work."
        fullScreenOnMobile
        className="h-full max-w-none rounded-none p-5 sm:h-auto sm:max-w-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex h-full flex-col">
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setModeNote(null);
                setModePickerOpen(false);
                setModalOpen(true);
              }}
              className="rounded-[1.5rem] bg-[var(--surface-muted)] p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <Mic className="size-4 text-[var(--accent)]" />
                Audio to backlog
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Record a spoken note and turn it into reviewable tasks for this chapter.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setModeNote("Strategic text dialogue is coming soon.");
                setModePickerOpen(false);
              }}
              className="rounded-[1.5rem] bg-[var(--surface-muted)] p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <MessageSquareText className="size-4 text-[var(--accent)]" />
                  Strategic text dialogue
                </div>
                <div className="rounded-full bg-black/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Pro
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Work through priorities with AI over text before creating the right tasks.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setModeNote("Strategic voice dialogue is coming soon.");
                setModePickerOpen(false);
              }}
              className="rounded-[1.5rem] bg-[var(--surface-muted)] p-5 text-left ring-1 ring-black/6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <Speech className="size-4 text-[var(--accent)]" />
                  Strategic voice dialogue
                </div>
                <div className="rounded-full bg-black/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Pro
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Talk the plan through out loud and let AI help align the work.
              </p>
            </button>
          </div>
          <div className="mt-auto pt-5">
            <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2 font-medium text-[var(--ink)]">
                <LockKeyhole className="size-4 text-[var(--accent)]" />
                Pro tier modes
              </div>
              <p className="mt-1 leading-6">
                Audio capture works now. Strategic text and strategic voice are preview modes you can try free before upgrade.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (state !== "processing") {
            setModalOpen(false);
          }
        }}
        title="Audio to backlog"
        description={idleDescription ?? `Speak a note for ${project.name}; review tasks before they become cards.`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl transition",
                state === "recording"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                  : "bg-[var(--accent-soft)] text-[var(--accent)]",
              )}
            >
              {state === "processing" || isPending ? (
                <LoaderCircle className="size-6 animate-spin" />
              ) : state === "recording" ? (
                <PauseCircle className="size-6" />
              ) : (
                <Mic className="size-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {state === "recording"
                  ? "Recording in progress"
                  : state === "processing"
                    ? "Processing your note"
                    : "Ready to capture"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {state === "recording"
                  ? `${elapsedSeconds}s recorded`
                  : state === "processing"
                    ? "Audio stays in memory only while transcription runs."
                    : "Start when you are ready, then stop to transcribe immediately."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {state === "recording" ? (
              <Button onClick={stopRecording}>
                Stop and transcribe
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={state === "processing" || isPending}
              >
                Start recording
              </Button>
            )}
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {message}
          </p>
        ) : null}
      </Modal>
    </>
  );
});
