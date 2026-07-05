import type { AudienceId } from "./share-types";

/**
 * Expected story beats per audience. Extensible — add more audiences over
 * time without touching the gap-check logic itself.
 */
export const GAP_CHECKLISTS: Partial<Record<AudienceId, string[]>> = {
  investors: ["traction_metrics", "challenges", "ask"],
  leadership: ["team_wins", "blockers"],
};

/** Terse semantic description of each beat, fed to the gap-check classifier — not shown to the user. */
export const GAP_BEAT_DESCRIPTIONS: Record<string, string> = {
  traction_metrics: "Concrete numbers or metrics showing progress (users, revenue, growth, retention, etc.)",
  challenges: "An honest acknowledgment of something that was hard or didn't go as planned",
  ask: "A specific ask of the reader — an intro, funding, feedback, or similar",
  team_wins: "A specific win or accomplishment attributable to the team",
  blockers: "A specific blocker or obstacle currently in the way",
};

/** The Cass message shown when a beat is missing (before the quick-tap actions). */
export const GAP_BEAT_PROMPTS: Record<string, string> = {
  traction_metrics:
    "Investor updates usually include your key numbers. I don't see financials captured yet — want to give me a quick rundown now, skip that section, or have me flag it as “coming soon”?",
  challenges:
    "Investors read honesty as confidence. I don't see any challenges captured for this stretch — want to add one, skip it, or flag it as “coming soon”?",
  ask:
    "Is there an ask in this update — an intro, a check, or just keeping them informed? I don't see one yet.",
  team_wins:
    "Leadership updates land better with a specific win or two. I don't see any captured — want to add one, skip it, or flag it as “coming soon”?",
  blockers:
    "I don't see any blockers captured for this stretch — want to note one, skip it, or flag it as “coming soon”?",
};

/** Label for the "fill this in now" quick-tap action — tailored per beat so it matches the question asked. */
export const GAP_BEAT_ACTION_LABELS: Record<string, string> = {
  traction_metrics: "Add numbers now",
  challenges: "Add a challenge now",
  ask: "Add the ask now",
  team_wins: "Add a win now",
  blockers: "Add a blocker now",
};
