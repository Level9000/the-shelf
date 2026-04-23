"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { LoaderCircle, Mic, PauseCircle, WandSparkles } from "lucide-react";
import type { Project, ProposedTask, VoiceCapture } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

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
  voiceCaptures: VoiceCapture[];
  onProcessed: (result: VoiceProcessingResult) => void;
}>(
function VoiceCapturePanel({
  project,
  voiceCaptures,
  onProcessed,
}, ref) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state !== "recording") return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state]);

  const latestReadyCapture = useMemo(
    () => voiceCaptures.find((capture) => capture.status === "ready"),
    [voiceCaptures],
  );

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
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      if (state === "idle" || state === "ready" || state === "error") {
        void startRecording();
      }
    },
  }), [startRecording, state]);

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  }

  return (
    <section
      ref={sectionRef}
      className="surface-card hairline rounded-[2rem] p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <Mic className="size-3.5" />
            Voice capture
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Speak the work out loud.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Record a loose note for {project.name}. Shelf will transcribe it,
            extract tasks, and let you review before anything lands on the board.
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Latest processed
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">
            {latestReadyCapture ? formatDate(latestReadyCapture.createdAt) : "None yet"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-dashed border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,243,238,0.96))] p-5">
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
                    ? "Your note stays in memory only while transcription runs."
                    : "Stop recording to transcribe immediately and move into review."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {state === "recording" ? (
              <Button onClick={stopRecording}>
                Stop and transcribe
              </Button>
            ) : (
              <Button onClick={startRecording} disabled={state === "processing" || isPending}>
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
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {voiceCaptures.slice(0, 4).map((capture) => (
          <div key={capture.id} className="rounded-[1.5rem] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Voice note</p>
              <Badge
                className={cn(
                  capture.status === "ready" && "bg-emerald-100 text-emerald-700",
                  capture.status === "failed" && "bg-rose-100 text-rose-700",
                  capture.status === "processing" && "bg-amber-100 text-amber-700",
                )}
              >
                {capture.status}
              </Badge>
            </div>
            <p className="mt-2 text-xs font-mono text-[var(--muted)]">
              {formatDate(capture.createdAt)}
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
              {capture.transcript ?? capture.errorMessage ?? "Awaiting transcript"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
        <WandSparkles className="size-3.5" />
        Review happens before save, so AI suggestions never auto-create cards.
      </div>
    </section>
  );
});
