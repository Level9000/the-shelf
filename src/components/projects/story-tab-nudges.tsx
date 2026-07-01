"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters } from "@/types";
import { checkBackstoryNudgeAction, dismissBackstoryNudgeAction } from "@/lib/actions/backstory-nudge-actions";
import { checkVoiceProfileNudgeAction, dismissVoiceProfileNudgeAction } from "@/lib/actions/voice-profile-actions";
import { CassFoundationDrawer } from "@/components/projects/story-foundation";
import { ToneVoiceRefinerDrawer } from "@/components/projects/tone-voice-refiner-chat";
import { CassNudgeFab } from "@/components/cass/CassNudgeFab";

type ActiveNudge = "backstory" | "voice" | null;

const NUDGE_MESSAGES: Record<Exclude<ActiveNudge, null>, string> = {
  backstory: "Hey, I noticed some gaps in your backstory. Can we review that together?",
  voice: "Do you like the tone of voice your story has? I can help you refine that.",
};

/**
 * Coordinates the Story tab's nudges so at most one ever shows at a time.
 * Backstory takes priority — it's foundational context the rest of the story
 * leans on, where tone-of-voice is more of a polish step. If backstory isn't
 * eligible, falls through to checking the voice-profile nudge.
 *
 * Rather than auto-opening the chat drawer (which used to fire an AI request
 * the instant the Story tab loaded, before the user had any idea what was
 * happening), Cass pops out from the corner with a message and waits for an
 * explicit "Sure" or "Not now". The drawer — and the AI call that seeds its
 * opening line — only fires if the user taps "Sure".
 */
export function StoryTabNudges({ project }: { project: ProjectWithChapters }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveNudge>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  function dismiss() {
    setDrawerOpen(false);
    setActive(null);
  }

  function declineNudge() {
    if (active === "backstory") {
      dismissBackstoryNudgeAction(project.id).catch(() => undefined);
    } else if (active === "voice") {
      dismissVoiceProfileNudgeAction(project.id).catch(() => undefined);
    }
    setActive(null);
  }

  return (
    <>
      {active && !drawerOpen && (
        <CassNudgeFab
          message={NUDGE_MESSAGES[active]}
          onAccept={() => setDrawerOpen(true)}
          onDecline={declineNudge}
        />
      )}
      <CassFoundationDrawer
        open={active === "backstory" && drawerOpen}
        project={project}
        gapHint={backstoryGap}
        onClose={dismiss}
        onPartialClose={(conversation) => {
          dismissBackstoryNudgeAction(project.id, conversation).catch(() => undefined);
        }}
        onSaved={() => {
          dismiss();
          router.refresh();
        }}
      />
      <ToneVoiceRefinerDrawer
        open={active === "voice" && drawerOpen}
        projectId={project.id}
        onClose={dismiss}
        onPartialClose={(conversation) => {
          dismissVoiceProfileNudgeAction(project.id, conversation).catch(() => undefined);
        }}
        onSaved={() => {
          dismiss();
          router.refresh();
        }}
      />
    </>
  );
}
