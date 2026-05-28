/**
 * Story Health System — Authored By
 *
 * Runs silently after every chapter is filed. Scores the last 3–5 chapters
 * against five signals. If 3+ signals fail, sets recentering_needed = true
 * and classifies the re-centering type.
 *
 * The flag persists until the next chapter's kickoff or retro injects the
 * re-centering questions. Cleared after injection.
 */

import type { ChapterType, StoryHealthReport } from "@/lib/ai/schema";
import type { KickoffBeats, RetroBeats } from "@/lib/ai/schema";

// ── Input shape ───────────────────────────────────────────────────────────────

export interface HealthCheckChapter {
  chapter_type:    ChapterType | null;
  confirmed_thesis: string | null;
  kickoff_beats:   KickoffBeats | null;
  retro_beats:     RetroBeats | null;
}

// ── Keyword banks ─────────────────────────────────────────────────────────────

const EMOTIONAL_KEYWORDS = [
  "feel", "felt", "worried", "excited", "frustrated",
  "proud", "uncertain", "confident", "drained", "energized",
  "doubt", "believe", "fear", "hope", "surprised",
];

// ── Health check algorithm ────────────────────────────────────────────────────

export function runStoryHealthCheck(
  chapterHistory: HealthCheckChapter[],
  foundingThesis: string | null,
  n = 5,
): StoryHealthReport {
  const recent = chapterHistory.slice(-n);

  if (recent.length === 0) {
    return {
      chapters_scored:      0,
      signals:              {
        type_variety:      true,
        emotional_texture: true,
        thesis_visible:    true,
        stakes_named:      true,
        learning_present:  true,
      },
      failing_signal_count: 0,
      patterns_detected:    [],
      recentering_needed:   false,
      recentering_type:     null,
    };
  }

  // Signal 1: Chapter type variety — at least 2 different types in recent set
  const types       = recent.map((ch) => ch.chapter_type).filter(Boolean) as ChapterType[];
  const uniqueTypes = new Set(types);
  const type_variety = uniqueTypes.size >= 2;

  // Signal 2: Emotional texture — at least 50% of recent retros have emotional language
  let emotionalChapters = 0;
  for (const ch of recent) {
    if (!ch.retro_beats) continue;
    const retroText = [
      ch.retro_beats.emotional_close.gut_feeling_delta,
      ch.retro_beats.emotional_close.road_ahead_feeling,
      ch.retro_beats.surprise.biggest_surprise,
    ].join(" ").toLowerCase();
    if (EMOTIONAL_KEYWORDS.some((kw) => retroText.includes(kw))) {
      emotionalChapters++;
    }
  }
  const emotional_texture = emotionalChapters >= recent.length * 0.5;

  // Signal 3: Original (season) thesis visibility in recent kickoff goals/thesis
  let thesis_visible = false;
  if (foundingThesis) {
    const thesisKeywords = foundingThesis
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    for (const ch of recent) {
      if (!ch.kickoff_beats) continue;
      const chapterText = [
        ch.confirmed_thesis ?? "",
        ch.kickoff_beats.work.goal,
      ].join(" ").toLowerCase();
      if (thesisKeywords.some((kw) => chapterText.includes(kw))) {
        thesis_visible = true;
        break;
      }
    }
  } else {
    // No founding thesis recorded — can't evaluate, pass by default
    thesis_visible = true;
  }

  // Signal 4: Stakes named in recent kickoffs (personal_meaning > 20 chars + gut_feeling > 10)
  let stakesPresent = 0;
  for (const ch of recent) {
    if (!ch.kickoff_beats) continue;
    if (
      ch.kickoff_beats.stakes.personal_meaning.length > 20 &&
      ch.kickoff_beats.stakes.gut_feeling.length > 10
    ) {
      stakesPresent++;
    }
  }
  const stakes_named = stakesPresent >= recent.length * 0.5;

  // Signal 5: Learning or surprise present in recent retros
  let learningPresent = 0;
  for (const ch of recent) {
    if (!ch.retro_beats) continue;
    if (
      ch.retro_beats.learning.new_knowledge.length > 20 ||
      ch.retro_beats.surprise.biggest_surprise.length > 20
    ) {
      learningPresent++;
    }
  }
  const learning_present = learningPresent >= recent.length * 0.5;

  const signals = { type_variety, emotional_texture, thesis_visible, stakes_named, learning_present };
  const failing_signal_count = Object.values(signals).filter((v) => !v).length;
  const recentering_needed = failing_signal_count >= 3;

  // ── Re-centering type classification ─────────────────────────────────────────
  let recentering_type: string | null = null;

  if (recentering_needed) {
    const typesList = types;
    const climbCount = typesList.filter((t) => t === "climb").length;
    const fogCount   = typesList.filter((t) => t === "fog").length;

    if (climbCount >= 3) {
      recentering_type = "flatline";
    } else if (fogCount >= 2) {
      recentering_type = "fog_spiral";
    } else if (!thesis_visible) {
      recentering_type = "drift";
    } else if (!stakes_named) {
      recentering_type = "shrinking_stakes";
    } else {
      recentering_type = "missing_antagonist";
    }
  }

  // ── Pattern detection (for narrative stitching) ───────────────────────────────
  const patterns_detected: string[] = [];
  const recentTypes = types;

  if (recentTypes.length >= 2) {
    const prev = recentTypes[recentTypes.length - 2];
    const curr = recentTypes[recentTypes.length - 1];

    if (prev === "fog"   && curr === "reframe") patterns_detected.push("fog_to_reframe");
    if (prev === "climb" && curr === "win")     patterns_detected.push("climb_to_win");
    if (prev === "turn"  && curr === "climb")   patterns_detected.push("turn_to_rebuild");
  }

  return {
    chapters_scored:      recent.length,
    signals,
    failing_signal_count,
    patterns_detected,
    recentering_needed,
    recentering_type,
  };
}
