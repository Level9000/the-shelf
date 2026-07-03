/**
 * Chapter Structure Templates — Authored By
 *
 * One template per chapter type. Passed to the writer agent in Pass 1.
 * The appropriate template is selected after chapter type detection.
 *
 * Types:
 *   climb   — execution chapter, grinding toward a known goal
 *   win     — significant achievement, connect cost to result
 *   turn    — direction changed, honor what was left behind
 *   fog     — uncertainty high, output low, what kept them going
 *   reframe — planned story and real story diverged, discovery
 */

export type ChapterType = "climb" | "win" | "turn" | "fog" | "reframe";

export const CHAPTER_TEMPLATES: Record<ChapterType, string> = {
  // ── CLIMB ────────────────────────────────────────────────────────────────────
  climb: `
This is a CLIMB chapter. The author was grinding toward a known goal. Nothing dramatically unexpected happened. The writing job is to make the effort feel meaningful — not heroic, but real. Find the human experience of sustained work. The chapter should leave the reader respecting the consistency, not pitying the grind.

Structure:
1. HOOK (1 paragraph): Open on the texture of the work — a specific moment, task, or feeling from the period. Not a summary. Draw the reader in before they know what the chapter is about.
2. SETUP (1 paragraph): Establish what was at stake and what the author was thinking going in. Use the kickoff gut feeling here.
3. THE WORK (1–2 paragraphs): What actually happened. The cards, the effort, the execution. Give it texture. Note where reality matched the plan and where it didn't, even slightly.
4. PULL QUOTE: One line from the author's retro — the most honest thing they said.
5. THE ANCHOR (1 paragraph): Why any of this matters. Connect the execution back to the bigger story. This is not a celebration — it's a grounding.
6. CLOSE (2–3 sentences): Forward momentum. Reference the bridge into the next chapter without spelling it out. Leave the reader wanting to know what happens next.
`.trim(),

  // ── WIN ──────────────────────────────────────────────────────────────────────
  win: `
This is a WIN chapter. Something significant was achieved. The writing job is NOT to just celebrate — shallow wins are boring to read. Connect the win back to the cost of getting there. The reader should feel the weight of what it took alongside the satisfaction of the result.

Structure:
1. HOOK (1 paragraph): Open on the moment just before the win — the last push, the final uncertainty. Create tension before you resolve it.
2. THE COST (1 paragraph): What it took to get here. The struggle, the doubt, the work. Do not skip this. A win without cost is uninteresting.
3. THE WIN (1 paragraph): What happened. Be specific. Vague wins ("things came together") don't land. Name what was achieved.
4. PULL QUOTE: The author's most honest reaction from the retro — not a polished statement, a real one.
5. THE MEANING (1 paragraph): What this win actually means. Not what it means for the metrics — what it means for the author and the story.
6. CLOSE (2–3 sentences): Where this win leads. The next challenge is already visible on the horizon. End with forward motion, not with the trophy.
`.trim(),

  // ── TURN ─────────────────────────────────────────────────────────────────────
  turn: `
This is a TURN chapter. Something changed direction. A pivot happened, or a plan was abandoned, or a new path became clear. The writing job is to honor what was left behind while building genuine momentum toward what's next. A turn is not a failure — it's a recalibration. Make sure the reader understands the difference.

Structure:
1. HOOK (1 paragraph): Open on the original plan — what was being attempted before the turn. Establish what was being left behind. The reader needs to know what was lost to understand what was found.
2. THE TENSION (1 paragraph): What created the pressure to change direction. The signal, the realization, the moment it became clear the original path wasn't working.
3. THE TURN (1 paragraph): The decision and what it meant. Be honest about the cost — not just what was gained.
4. PULL QUOTE: The author's most honest articulation of why they changed course.
5. THE NEW DIRECTION (1 paragraph): Where things are headed now. Written with cautious momentum — not false confidence, but real forward energy.
6. CLOSE (2–3 sentences): The turn is complete. The next chapter begins from here. End with the author standing in a new place, not a better place — just a different and more honest one.
`.trim(),

  // ── FOG ──────────────────────────────────────────────────────────────────────
  fog: `
This is a FOG chapter. Output was low. Uncertainty was high. The writing job is NOT to inflate what happened or frame incompletion as failure. Find the human experience of uncertainty and write toward that. The question to answer is not "what got done" but "what kept them going." Fog chapters are often the most relatable chapters in any author story — write them that way.

Structure:
1. HOOK (1 paragraph): Open directly on the feeling of uncertainty. Do not hide it or soften it. "Some chapters have a clear shape. This wasn't one of them." Start honest.
2. THE ATTEMPT (1 paragraph): What was tried. Keep this brief and honest — low completion rate should be acknowledged, not dwelt on. The work happened, it just didn't resolve the way planned.
3. THE ANCHOR (1 paragraph): The one thing the author held onto. The belief, the small signal, the reason they kept showing up. This is the emotional core of the chapter. Find it in the retro stakes or personal meaning answers.
4. PULL QUOTE: The author's most human moment from the retro — ideally something about perseverance, not accomplishment.
5. CLOSE (2–3 sentences): The fog hasn't fully lifted, but the author is still standing. End with honest forward motion — not false optimism, just the act of continuing. The reader should finish the chapter still rooting for this person.

IMPORTANT FOR FOG: Before publishing, verify: Does this chapter make the reader respect the author more, not less? Is there one human moment that makes it worth reading? Does it end with the reader still rooting for them? If any answer is no, rewrite.
`.trim(),

  // ── REFRAME ──────────────────────────────────────────────────────────────────
  reframe: `
This is a REFRAME chapter. The planned story and the real story diverged. The real story is in the retro learning and surprise answers, not the card completion data. The writing job is to open with the planned story briefly — then pivot to what actually mattered. Discovery, not failure. The chapter should feel like a revelation, not a correction.

Structure:
1. HOOK (1 paragraph): Open on the original intention. What the chapter was supposed to be about. This is deliberate setup — you're establishing the contrast that will pay off.
2. THE PLANNED STORY (1 short paragraph): What was attempted and what the completion rate looked like. Keep this brief — 2–3 sentences max. This is setup, not the main event.
3. THE PIVOT MOMENT (1 paragraph): The specific thing that happened — the conversation, the data point, the realization — that changed the frame. Be as concrete as possible. Vague pivots don't land.
4. THE REAL STORY (1–2 paragraphs): What was actually learned or discovered. Write this with the weight it deserves. This is the longest section because it's where the value lives.
5. PULL QUOTE: Almost always from the learning answer — the moment the author said something they didn't know they believed until they said it.
6. CLOSE (2–3 sentences): A door opening, not closing. The author sees something now they couldn't see at the start of the chapter. End with that new visibility.
`.trim(),
};

// ── Two-chapter stitching notes ───────────────────────────────────────────────
// Injected into Pass 1 prompt when the arc tracker detects a known transition.

export type StitchingPattern = "fog_to_reframe" | "climb_to_win" | "turn_to_rebuild";

export const STITCHING_NOTES: Record<StitchingPattern, string> = {
  fog_to_reframe: `
STITCHING NOTE: The previous chapter was a Fog chapter. The current chapter is a Reframe. This is a significant narrative sequence — the wandering led somewhere. Open this chapter with a single sentence that acknowledges the previous fog without dwelling on it, then move immediately into the discovery. Example: "The last few weeks felt like wandering. It turns out wandering was the point." Do not use that exact sentence — find the version that is true for this author's specific situation.
`.trim(),

  climb_to_win: `
STITCHING NOTE: The previous chapter was a Climb chapter. This chapter is a Win. The reader watched the grind — now they get the payoff. Open with a callback to the effort, then deliver the win. The contrast between the two chapters is the story. Make sure the opening of this chapter references where the author was at the end of the last one.
`.trim(),

  turn_to_rebuild: `
STITCHING NOTE: The previous chapter was a Turn — something changed direction. This chapter is a Climb — the rebuild has begun. Acknowledge the new ground the author is standing on. The reader knows a pivot just happened. This chapter is the "starting over from a more honest place" chapter. Honor the reset without making it feel like a setback.
`.trim(),
};

/** Detect stitching pattern from the last two chapter types in order. */
export function detectStitchingPattern(
  previousType: ChapterType | null,
  currentType: ChapterType,
): StitchingPattern | null {
  if (!previousType) return null;
  if (previousType === "fog" && currentType === "reframe") return "fog_to_reframe";
  if (previousType === "climb" && currentType === "win") return "climb_to_win";
  if (previousType === "turn" && currentType === "climb") return "turn_to_rebuild";
  return null;
}
