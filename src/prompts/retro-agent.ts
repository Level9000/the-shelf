/**
 * Retro Facilitator Agent — Authored By
 *
 * Conducted by Cass. Moves through four beats after the chapter ends:
 *   Beat 1 — Honest Accounting : what got done, rating, proud of
 *   Beat 2 — The Surprise      : where reality diverged from plan
 *   Beat 3 — The Learning      : what changed in their thinking
 *   Beat 4 — Emotional Close   : gut feeling delta, road ahead
 *
 * Ends with AI-generated bridge sentence → founder confirmation.
 *
 * NOTE: This session does NOT write the chapter story.
 * The Narrative Engine (see writer-agent.ts) does that from the collected beats.
 */

export const RETRO_AGENT_PERSONA = `
You are Cass — the story guide inside Authored By. You are running a chapter retrospective. Your job is to help founders reflect honestly on a chapter that just happened. You are warm, direct, and genuinely curious. You ask one question at a time. You are not looking for a polished summary — you are looking for the truth. The gap between what was planned and what actually happened is the most interesting thing in any retro. So are surprises, frustrations, unexpected wins, and shifts in thinking. Ask follow-up questions when answers are thin. Never accept "it went fine" as a complete answer. The raw material you collect here is what the storytelling system uses to write a chapter worth reading.

Do not use filler phrases like "Great!", "Absolutely!", or "Certainly!". Do not reflect answers back as bullet lists. Do not rush through the beats. Ask one question at a time.
`.trim();

// ── Beat 1 — Honest Accounting ────────────────────────────────────────────────

export const retroAccountingOpener = (
  completedCount: number,
  totalCount: number,
  completedTitles: string[],
  droppedTitles: string[],
): string => {
  const completedLine =
    completedTitles.length > 0
      ? ` You completed: ${completedTitles.slice(0, 4).join(", ")}${completedTitles.length > 4 ? ", and more" : ""}.`
      : "";
  const droppedLine =
    droppedTitles.length > 0
      ? ` Left behind: ${droppedTitles.slice(0, 3).join(", ")}${droppedTitles.length > 3 ? ", and others" : ""}.`
      : "";
  return `Okay, let's look at how this chapter actually went. You completed ${completedCount} of ${totalCount} cards.${completedLine}${droppedLine}\n\nOn a scale of 1–5, how would you rate this chapter overall?`;
};

export const RETRO_BEAT_1_PROUD = "What are you most proud of from this period?";
export const RETRO_BEAT_1_PROUD_PROBE = "Not what got done — what are you personally proud of? Even if it's something small.";

// ── Beat 2 — The Surprise ─────────────────────────────────────────────────────

export const RETRO_BEAT_2_QUESTIONS = {
  biggest_surprise:     "What surprised you most this chapter — good or bad?",
  easier_than_expected: "What did you expect to be hard that turned out to be easier than you thought?",
  harder_than_expected: "What did you expect to be easy that turned out to be harder?",
  unplanned_events:     "Did anything happen that wasn't on a card at all?",
} as const;

export const RETRO_BEAT_2_PROBES = [
  "Tell me more about that surprise. What made it unexpected?",
  "How did that change what you did?",
  "Did it change how you think about the product or the work?",
] as const;

// ── Beat 3 — The Learning ─────────────────────────────────────────────────────

export const RETRO_BEAT_3_QUESTIONS = {
  new_knowledge:        "What do you know now that you didn't know when you started this chapter?",
  thinking_shift:       "Did your thinking change at all — about the product, the market, or yourself?",
  would_do_differently: "If you ran this chapter again with what you know now, what would you do differently?",
} as const;

export const RETRO_BEAT_3_PROBES = [
  "Is that a tactical thing or something more fundamental?",
  "Has this changed how you think about the next chapter?",
] as const;

// ── Beat 4 — Emotional Close ──────────────────────────────────────────────────

export const retroGutFeelDelta = (kickoffGutFeeling: string): string =>
  `At kickoff you said your gut feeling going in was: "${kickoffGutFeeling}". How does that compare to how you feel now that the chapter is done?`;

export const RETRO_BEAT_4_QUESTIONS = {
  road_ahead:           "How are you feeling about the road ahead coming out of this chapter?",
  weighing_or_energizing: "Is there anything weighing on you, or anything that's energizing you, as you head into the next one?",
} as const;

export const RETRO_BEAT_4_PROBES = [
  "Say more about that. What's driving that feeling?",
  "Is this a different kind of confidence/uncertainty than when you started?",
] as const;

// ── Bridge sentence generation (internal, not shown to founder) ───────────────

export const BRIDGE_GENERATION_INSTRUCTION = `
Based on the retro conversation above, write a single sentence that captures what the next chapter is really about. It should follow naturally from what this chapter revealed. It should create forward momentum without being falsely optimistic. It should feel like the beginning of the next story beat, not a summary of this one.

Output only the bridge sentence. No explanation.
`.trim();

export const retroBridgeConfirmation = (bridge: string): string =>
  `Based on everything you just told me, it sounds like the next chapter is really about: "${bridge}". Does that feel right as a starting point for next time?`;

// ── Re-centering injections (added when fog_spiral flag is set) ───────────────

export const RECENTERING_RETRO_INJECTIONS = {
  fog_spiral_accounting: `After the honest accounting beat, add:\n\n"I want to make sure we don't miss anything in this one. Even in a quiet chapter, there are usually moments that matter more than they seem. Was there a moment this chapter — even a small one — where something made you think differently? A conversation, something you read, a decision that felt harder than it should have?"`,

  fog_spiral_learning: `After the learning beat, add:\n\n"Let me ask you something directly. How are you actually feeling about where things are right now? Not the progress — you. Because sometimes the most important chapter is the one that captures what it costs to keep going."`,
} as const;

// ── Season reset prompt (injected when drift recentering reveals new direction)

export const seasonResetPrompt = (
  previousSeasonTheme: string,
  newDirection: string,
): string =>
  `What I'm hearing sounds less like a new chapter and more like the beginning of a new season. The last season was really about: "${previousSeasonTheme}". It sounds like this next one is really about: "${newDirection}". Do you want to name this new season before we go further?`;
