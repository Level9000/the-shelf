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
import { LoaderCircle, Mic, PauseCircle, WandSparkles } from "lucide-react";
import type { Project, ProposedTask } from "@/types";
import { Button } from "@/components/ui/button";
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
      className={cn(
        "mb-4 rounded-[1.75rem] border border-dashed border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,243,238,0.94))] p-4",
        className,
      )}
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
                  : "Voice capture"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {state === "recording"
                ? `${elapsedSeconds}s recorded`
                : state === "processing"
                  ? "Audio stays in memory only while transcription runs."
                  : idleDescription ??
                    `Speak a note for ${project.name}; review tasks before they become cards.`}
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

      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
        <WandSparkles className="size-3.5" />
        Review happens before save, so AI suggestions never auto-create cards.
      </div>
    </section>
  );
});
