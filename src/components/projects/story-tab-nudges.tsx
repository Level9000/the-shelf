"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters } from "@/types";
import { checkBackstoryNudgeAction, dismissBackstoryNudgeAction } from "@/lib/actions/backstory-nudge-actions";
import { checkVoiceProfileNudgeAction, dismissVoiceProfileNudgeAction } from "@/lib/actions/voice-profile-actions";
import { CassFoundationDrawer } from "@/components/projects/story-foundation";
import { ToneVoiceRefinerDrawer } from "@/components/projects/tone-voice-refiner-chat";

type ActiveNudge = "backstory" | "voice" | null;

/**
 * Coordinates the Story tab's auto-opening nudges so at most one ever shows at a
 * time. Backstory takes priority — it's foundational context the rest of the story
 * leans on, where tone-of-voice is more of a polish step. If backstory isn't
 * eligible, falls through to checking the voice-profile nudge.
 */
export function StoryTabNudges({ project }: { project: ProjectWithChapters }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveNudge>(null);
  const [backstoryGap, setBackstoryGap] = useState<string | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      const backstory = await checkBackstoryNudgeAction(project.id).catch(() => ({ gap: null }));
      if (backstory.gap) {
        setBackstoryGap(backstory.gap);
        setActive("backstory");
        return;
      }

      const voice = await checkVoiceProfileNudgeAction(project.id).catch(() => ({ show: false }));
      if (voice.show) setActive("voice");
    })();
  }, [project.id]);

  return (
    <>
      <CassFoundationDrawer
        open={active === "backstory"}
        project={project}
        gapHint={backstoryGap}
        onClose={() => setActive(null)}
        onPartialClose={(conversation) => {
          dismissBackstoryNudgeAction(project.id, conversation).catch(() => undefined);
        }}
        onSaved={() => {
          setActive(null);
          router.refresh();
        }}
      />
      <ToneVoiceRefinerDrawer
        open={active === "voice"}
        projectId={project.id}
        onClose={() => setActive(null)}
        onPartialClose={(conversation) => {
          dismissVoiceProfileNudgeAction(project.id, conversation).catch(() => undefined);
        }}
        onSaved={() => {
          setActive(null);
          router.refresh();
        }}
      />
    </>
  );
}
