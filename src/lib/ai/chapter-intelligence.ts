/**
 * Chapter Intelligence — Authored By
 *
 * Two responsibilities:
 *   1. assembleChapterBrief — builds the structured input brief from all session data
 *   2. detectChapterType   — scores signals and classifies each chapter
 *
 * Runs server-side after the retro is submitted, before the writing job is queued.
 */

import type { ChapterType } from "@/lib/ai/schema";
import type { KickoffBeats, RetroBeats } from "@/lib/ai/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CardSummary {
  title:        string;
  status:       "complete" | "dropped" | "deferred" | "todo" | "in_progress";
  emotional_tag: "excited" | "neutral" | "dreaded" | null;
  added_at:     "kickoff" | "mid_chapter";
}

export interface ArcChapter {
  chapter_type:     ChapterType | null;
  confirmed_thesis: string | null;
  kickoff_beats:    KickoffBeats | null;
  retro_beats:      RetroBeats | null;
}

export interface ChapterBrief {
  // Arc context
  previousChapterSummary: string;
  previousChapterType:    ChapterType | null;
  bridgeSentenceFromLast: string;
  lastFiveChapterTypes:   (ChapterType | null)[];
  storyHealthFlag:        "none" | "recentering_needed";
  seasonName:             string | null;
  foundingThesis:         string | null;

  // Kickoff data
  kickoff: KickoffBeats;

  // Card data
  totalCards:      number;
  completedCards:  string[];
  droppedCards:    string[];
  deferredCards:   string[];
  midChapterCards: string[];
  excitedCards:    string[];
  dreadedCards:    string[];
  completionRate:  number;

  // Retro data
  retro: RetroBeats;
  overallRating: number; // parsed from retro.accounting.overall_rating
}

// ── Brief assembly ────────────────────────────────────────────────────────────

export function assembleChapterBrief(input: {
  previousChapter: {
    summary:       string;
    chapterType:   ChapterType | null;
    bridgeSentence: string;
  } | null;
  arcHistory:      ArcChapter[];
  storyHealthFlag: "none" | "recentering_needed";
  seasonName:      string | null;
  foundingThesis:  string | null;
  kickoffBeats:    KickoffBeats;
  cards:           CardSummary[];
  retroBeats:      RetroBeats;
}): ChapterBrief {
  const completedCards  = input.cards.filter((c) => c.status === "complete").map((c) => c.title);
  const droppedCards    = input.cards.filter((c) => c.status === "dropped").map((c) => c.title);
  const deferredCards   = input.cards.filter((c) => c.status === "deferred").map((c) => c.title);
  const midChapterCards = input.cards.filter((c) => c.added_at === "mid_chapter").map((c) => c.title);
  const excitedCards    = input.cards.filter((c) => c.emotional_tag === "excited").map((c) => c.title);
  const dreadedCards    = input.cards.filter((c) => c.emotional_tag === "dreaded").map((c) => c.title);
  const totalCards      = input.cards.length;
  const completionRate  = totalCards > 0 ? completedCards.length / totalCards : 0;

  const lastFive = input.arcHistory
    .slice(-5)
    .map((ch) => ch.chapter_type);

  const overallRating = parseInt(input.retroBeats.accounting.overall_rating, 10) || 3;

  return {
    previousChapterSummary:  input.previousChapter?.summary ?? "",
    previousChapterType:     input.previousChapter?.chapterType ?? null,
    bridgeSentenceFromLast:  input.previousChapter?.bridgeSentence ?? "",
    lastFiveChapterTypes:    lastFive,
    storyHealthFlag:         input.storyHealthFlag,
    seasonName:              input.seasonName,
    foundingThesis:          input.foundingThesis,
    kickoff:                 input.kickoffBeats,
    totalCards,
    completedCards,
    droppedCards,
    deferredCards,
    midChapterCards,
    excitedCards,
    dreadedCards,
    completionRate,
    retro:                   input.retroBeats,
    overallRating,
  };
}

// ── Signal scoring ────────────────────────────────────────────────────────────

interface ChapterSignals {
  high_completion:        boolean;
  low_completion:         boolean;
  partial_completion:     boolean;
  high_surprise:          boolean;
  surprise_was_unplanned: boolean;
  positive_emotional_delta: boolean;
  negative_emotional_delta: boolean;
  flat_emotional_delta:   boolean;
  high_learning:          boolean;
  direction_changed:      boolean;
}

const PIVOT_KEYWORDS = [
  "pivot", "changed", "realized", "wrong", "unexpected",
  "shifted", "actually", "turns out", "instead", "different",
];

const POSITIVE_SHIFT_KEYWORDS = [
  "better", "clearer", "confident", "relieved",
  "excited", "momentum", "validated", "good",
];

const NEGATIVE_SHIFT_KEYWORDS = [
  "worse", "uncertain", "worried", "stuck",
  "frustrated", "foggy", "unclear", "drained",
];

const LEARNING_SHIFT_KEYWORDS = [
  "realize", "wrong about", "changed my", "fundamentally",
  "actually", "different than", "shifted", "rethink",
];

const DIRECTION_CHANGED_KEYWORDS = [
  "pivot", "changed direction", "shifted", "decided to",
];

function scoreSignals(brief: ChapterBrief): ChapterSignals {
  const { completionRate, retro, previousChapterSummary } = brief;

  // Signal 1: Completion rate
  const high_completion    = completionRate >= 0.7;
  const low_completion     = completionRate < 0.4;
  const partial_completion = completionRate >= 0.4 && completionRate < 0.7;

  // Signal 2: Surprise magnitude
  const surpriseText = retro.surprise.biggest_surprise.toLowerCase();
  const high_surprise = PIVOT_KEYWORDS.some((kw) => surpriseText.includes(kw));
  const surprise_was_unplanned = retro.surprise.unplanned_events.trim().length > 0;

  // Signal 3: Emotional delta
  const gutDelta = retro.emotional_close.gut_feeling_delta.toLowerCase();
  const positive_emotional_delta = POSITIVE_SHIFT_KEYWORDS.some((kw) => gutDelta.includes(kw));
  const negative_emotional_delta = NEGATIVE_SHIFT_KEYWORDS.some((kw) => gutDelta.includes(kw));
  const flat_emotional_delta = !positive_emotional_delta && !negative_emotional_delta;

  // Signal 4: Learning magnitude
  const thinkingShift = retro.learning.thinking_shift.toLowerCase();
  const high_learning = LEARNING_SHIFT_KEYWORDS.some((kw) => thinkingShift.includes(kw));

  // Signal 5: Direction change from previous context
  const prevSummaryLower = previousChapterSummary.toLowerCase();
  const direction_changed = DIRECTION_CHANGED_KEYWORDS.some((kw) => prevSummaryLower.includes(kw));

  return {
    high_completion, low_completion, partial_completion,
    high_surprise, surprise_was_unplanned,
    positive_emotional_delta, negative_emotional_delta, flat_emotional_delta,
    high_learning,
    direction_changed,
  };
}

// ── Chapter type detection ────────────────────────────────────────────────────

export function detectChapterType(brief: ChapterBrief): ChapterType {
  const signals = scoreSignals(brief);
  const goal    = brief.kickoff.work.goal.toLowerCase();

  // REFRAME: High learning + high surprise = planned story diverged from real one
  if (signals.high_learning && signals.high_surprise) {
    if (signals.surprise_was_unplanned || signals.positive_emotional_delta) {
      return "reframe";
    }
  }

  // WIN: High completion + positive emotional shift + milestone language
  if (signals.high_completion && signals.positive_emotional_delta) {
    const milestoneWords = [
      "launched", "shipped", "signed", "closed", "hit",
      "reached", "finished", "completed", "live",
    ];
    const hasMilestone = milestoneWords.some((w) => goal.includes(w));
    if (hasMilestone || brief.overallRating >= 4) {
      return "win";
    }
  }

  // TURN: Direction changed or surprise combined with low completion
  if (signals.direction_changed || (signals.high_surprise && signals.low_completion)) {
    return "turn";
  }

  // FOG: Low completion + no significant learning
  if (signals.low_completion && !signals.high_learning) {
    return "fog";
  }
  if (signals.flat_emotional_delta && signals.low_completion) {
    return "fog";
  }

  // CLIMB: Default — consistent execution toward a known goal
  return "climb";
}

// ── Brief → text (for passing to writer agent) ────────────────────────────────

export function formatBriefForWriter(brief: ChapterBrief): string {
  const pct = Math.round(brief.completionRate * 100);

  return [
    "CHAPTER BRIEF",
    "=============",
    "",
    "CHAPTER CONTEXT",
    `Previous chapter summary: ${brief.previousChapterSummary || "None (this is the first chapter)"}`,
    `Previous chapter type: ${brief.previousChapterType ?? "N/A"}`,
    `Bridge sentence from last retro: ${brief.bridgeSentenceFromLast || "None"}`,
    "",
    "KICKOFF DATA",
    `Previous chapter context: ${brief.kickoff.context.previous_chapter_summary}`,
    `Incoming feeling: ${brief.kickoff.context.incoming_feeling}`,
    `Goal: ${brief.kickoff.work.goal}`,
    `Why it matters: ${brief.kickoff.work.why_it_matters}`,
    `Success definition: ${brief.kickoff.work.success_definition}`,
    `Timeline: ${brief.kickoff.work.target_completion}`,
    `Biggest risk: ${brief.kickoff.stakes.biggest_risk}`,
    `Personal meaning: ${brief.kickoff.stakes.personal_meaning}`,
    `Gut feeling at start: ${brief.kickoff.stakes.gut_feeling}`,
    `Confirmed thesis: ${brief.kickoff.confirmed_thesis}`,
    "",
    "CARD DATA",
    `Completion rate: ${pct}% (${brief.completedCards.length} of ${brief.totalCards} cards)`,
    `Cards completed: ${brief.completedCards.join(", ") || "None"}`,
    `Cards dropped or deferred: ${[...brief.droppedCards, ...brief.deferredCards].join(", ") || "None"}`,
    `Cards added mid-chapter: ${brief.midChapterCards.join(", ") || "None"}`,
    `Emotionally tagged excited: ${brief.excitedCards.join(", ") || "None"}`,
    `Emotionally tagged dreaded: ${brief.dreadedCards.join(", ") || "None"}`,
    "",
    "RETRO DATA",
    `Overall rating: ${brief.retro.accounting.overall_rating}/5`,
    `Most proud of: ${brief.retro.accounting.most_proud_of}`,
    `Biggest surprise: ${brief.retro.surprise.biggest_surprise}`,
    `Easier than expected: ${brief.retro.surprise.easier_than_expected}`,
    `Harder than expected: ${brief.retro.surprise.harder_than_expected}`,
    `Unplanned events: ${brief.retro.surprise.unplanned_events}`,
    `New knowledge: ${brief.retro.learning.new_knowledge}`,
    `Thinking shift: ${brief.retro.learning.thinking_shift}`,
    `Would do differently: ${brief.retro.learning.would_do_differently}`,
    `Gut feeling delta: ${brief.retro.emotional_close.gut_feeling_delta}`,
    `Road ahead feeling: ${brief.retro.emotional_close.road_ahead_feeling}`,
    `Weighing or energizing: ${brief.retro.emotional_close.weighing_or_energizing}`,
    "",
    "ARC CONTEXT",
    `Last 5 chapter types: ${brief.lastFiveChapterTypes.map((t) => t ?? "unknown").join(" → ")}`,
    `Story health flag: ${brief.storyHealthFlag}`,
    brief.seasonName ? `Season: ${brief.seasonName}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
