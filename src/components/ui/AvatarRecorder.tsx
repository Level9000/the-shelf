"use client";

/**
 * AvatarRecorder — renders the correct animated avatar based on activeAvatar context.
 * Drop-in replacement for <CassRecorder /> wherever the drawer needs to show an avatar.
 */

import { useAvatar } from "@/lib/avatar-context";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";
import type { CassAnimState } from "@/components/cass/cassVoice";
import type { TypewriterAnimState } from "@/components/ui/TypewriterRecorder";
import type { PressAnimState } from "@/components/ui/PressMonitor";

// Map Cass's anim states → Ty and Press equivalents
function toCassAnim(state: CassAnimState): TypewriterAnimState {
  switch (state) {
    case "recording":  return "typing";
    case "listening":  return "idle";
    case "talking":    return "typing";
    case "playing":    return "thinking";
    case "idle":
    default:           return "idle";
  }
}

function toPressAnim(state: CassAnimState): PressAnimState {
  switch (state) {
    case "recording":  return "thinking";
    case "listening":  return "idle";
    case "talking":    return "talking";
    case "playing":    return "thinking";
    case "idle":
    default:           return "idle";
  }
}

type Size = "sm" | "md" | "lg";

export function AvatarRecorder({
  animState,
  size = "md",
}: {
  animState: CassAnimState;
  size?: Size;
}) {
  const { activeAvatar } = useAvatar();

  if (activeAvatar === "ty") {
    return <TypewriterRecorder animState={toCassAnim(animState)} size={size} />;
  }

  if (activeAvatar === "press") {
    return <PressMonitor animState={toPressAnim(animState)} size={size} />;
  }

  // default: cass
  return <CassRecorder animState={animState} size={size} />;
}

/** The avatar's display name — use in drawer headers */
export function useAvatarName(): string {
  const { activeAvatar } = useAvatar();
  switch (activeAvatar) {
    case "ty":    return "Ty";
    case "press": return "Press";
    default:      return "Cass";
  }
}
