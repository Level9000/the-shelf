import { z } from "zod";

export const proposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  suggestedColumn: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value || "Do This Week"),
  priority: z.enum(["low", "medium", "high"]).nullable().default(null),
  dueDate: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  confidence: z.number().min(0).max(1).default(0.72),
});

export const aiTaskExtractionSchema = z.object({
  tasks: z.array(proposedTaskSchema).max(12).default([]),
});

export const strategicDialogueMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const strategicTemplateSchema = z.object({
  name: z.string().trim().max(120).default(""),
  triggerPhrase: z.string().trim().max(180).default(""),
  description: z.string().trim().max(500).default(""),
});

export const confirmedStrategicTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  triggerPhrase: z.string().trim().min(1).max(180),
  description: z.string().trim().max(500).default(""),
});

export const aiStrategicDialogueSchema = z.object({
  status: z.enum(["discovery", "template_review", "ready_for_review"]),
  reply: z.string().trim().min(1).max(4000),
  template: strategicTemplateSchema,
  tasks: z.array(proposedTaskSchema).max(12),
});

export const projectOverviewSectionSchema = z.enum([
  "goal",
  "whyItMatters",
  "successLooksLike",
  "doneDefinition",
]);

export const arcSectionSchema = z.enum(["northStar", "accumulativeStory"]);

export const aiArcDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  /** Which path the conversation is currently on. */
  intent: z.enum(["exploring", "northStar", "accumulativeStory", "shareable"]).default("exploring"),
  /** True when a north star or story draft is ready to save. */
  readyForApproval: z.boolean().default(false),
  /** Which project field the draftValue belongs to. */
  draftField: z.enum(["northStar", "accumulativeStory", ""]).default(""),
  /** The field copy to save when readyForApproval is true. */
  draftValue: z.string().trim().max(4000).default(""),
  /** True when the shareable content is ready to present. */
  shareReady: z.boolean().default(false),
  /** The shareable copy when shareReady is true. */
  shareContent: z.string().trim().max(4000).default(""),
});

export type ArcSection = z.infer<typeof arcSectionSchema>;
export type AIArcDialogue = z.infer<typeof aiArcDialogueSchema>;

export const aiProjectOverviewDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  readyForApproval: z.boolean(),
  draftValue: z.string().trim().max(2000).default(""),
});

export const aiWeeklyPlanningDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  readyForApproval: z.boolean(),
  plannedTaskIds: z.array(z.string().trim().min(1)).max(12).default([]),
});

export type AITaskExtraction = z.infer<typeof aiTaskExtractionSchema>;
export type AIStrategicDialogue = z.infer<typeof aiStrategicDialogueSchema>;
export type AIProjectOverviewDialogue = z.infer<
  typeof aiProjectOverviewDialogueSchema
>;
export type AIWeeklyPlanningDialogue = z.infer<
  typeof aiWeeklyPlanningDialogueSchema
>;
export type StrategicDialogueMessage = z.infer<
  typeof strategicDialogueMessageSchema
>;
export const kickoffProposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  source: z.enum(["ai_suggested", "component_library"]),
});

export const aiKickoffDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  goal: z.string().trim().max(2000).default(""),
  whyItMatters: z.string().trim().max(2000).default(""),
  successLooksLike: z.string().trim().max(2000).default(""),
  doneDefinition: z.string().trim().max(2000).default(""),
  openingLine: z.string().trim().max(500).default(""),
  proposedTasks: z.array(kickoffProposedTaskSchema).max(12).default([]),
});

export type AIKickoffDialogue = z.infer<typeof aiKickoffDialogueSchema>;
export type KickoffProposedTask = z.infer<typeof kickoffProposedTaskSchema>;
export type StrategicTemplate = z.infer<typeof strategicTemplateSchema>;
export type ProjectOverviewSection = z.infer<
  typeof projectOverviewSectionSchema
>;

export const kickoffChapterPrefillSchema = z.object({
  goal: z.string().trim().max(2000).default(""),
  value: z.string().trim().max(2000).default(""),
  measure: z.string().trim().max(2000).default(""),
  // AI sometimes returns a boolean for `done` — coerce to string
  done: z.union([z.string(), z.boolean()]).transform((v) => String(v === true ? "true" : v === false ? "" : v)).pipe(z.string().trim().max(2000)).default(""),
});

export const kickoffProposedChapterSchema = z.object({
  // AI sometimes omits chapter_number — default to 0 and let callers re-index
  chapter_number: z.number().int().min(1).optional().default(0),
  title: z.string().trim().min(1).max(120),
  goal: z.string().trim().max(2000).default(""),
  prefill: kickoffChapterPrefillSchema.optional(),
});

export const aiProjectKickoffDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(8000),
  done: z.boolean(),
  north_star: z.string().trim().max(500).default(""),
  project_goal: z.string().trim().max(2000).default(""),
  project_audience: z.string().trim().max(2000).default(""),
  project_success: z.string().trim().max(2000).default(""),
  project_biggest_risk: z.string().trim().max(2000).default(""),
  proposed_chapters: z.array(kickoffProposedChapterSchema).max(8).default([]),
});

export type AIProjectKickoffDialogue = z.infer<typeof aiProjectKickoffDialogueSchema>;
export type KickoffProposedChapter = z.infer<typeof kickoffProposedChapterSchema>;
export type KickoffChapterPrefill = z.infer<typeof kickoffChapterPrefillSchema>;

export const aiRefocusDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  keepTaskIds: z.array(z.string()).default([]),
  deferTaskIds: z.array(z.string()).default([]),
  rationale: z.string().trim().max(1000).default(""),
});

export type AIRefocusDialogue = z.infer<typeof aiRefocusDialogueSchema>;

export const aiFoundationDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  /** Synthesized backstory paragraph — only populated when done is true. */
  foundationSummary: z.string().trim().max(3000).default(""),
});

export type AIFoundationDialogue = z.infer<typeof aiFoundationDialogueSchema>;

export const aiVoiceProfileDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  /** Synthesized voice guide — only populated when done is true. */
  voiceProfile: z.string().trim().max(3000).default(""),
});

export type AIVoiceProfileDialogue = z.infer<typeof aiVoiceProfileDialogueSchema>;

export const aiChapterContextDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  /** Raw material captured this turn — only populated when done is true. */
  capturedNote: z.string().trim().max(3000).default(""),
  /** A concrete paragraph-level rewrite Cass is proposing — shown for accept/reject before it's saved. */
  proposedParagraph: z.object({
    originalText: z.string().trim().min(1),
    newText: z.string().trim().min(1),
  }).nullable().default(null),
  /** Only populated when the author explicitly reframes the chapter's meaning. */
  reframe: z.object({
    newChapterType: z.enum(["climb", "win", "turn", "fog", "reframe"]),
    rationale: z.string().trim().min(1).max(500),
  }).nullable().default(null),
  /** Other chapters this edit may make inconsistent — flagged for later review, never auto-rewritten. */
  affectedChapters: z.array(z.object({
    chapterId: z.string(),
    chapterName: z.string(),
    reason: z.string().trim().min(1).max(300),
  })).default([]),
});

export type AIChapterContextDialogue = z.infer<typeof aiChapterContextDialogueSchema>;

export const aiFragmentExtractionSchema = z.object({
  hasFragment: z.boolean(),
  /** The raw material in the author's own words, not a summary. Empty when hasFragment is false. */
  fragment: z.string().trim().max(2000).default(""),
});

export type AIFragmentExtraction = z.infer<typeof aiFragmentExtractionSchema>;

export const aiBackstoryGapDetectionSchema = z.object({
  hasGap: z.boolean(),
  /** A specific, named gap in plain language — e.g. "Sam is mentioned in three chapters but how they met or what he does is never explained." */
  gap: z.string().trim().max(400).default(""),
});

export type AIBackstoryGapDetection = z.infer<typeof aiBackstoryGapDetectionSchema>;

export const aiChapterPlannerDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  done: z.boolean(),
  chapters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        goal: z.string().trim().max(500).default(""),
      }),
    )
    .max(8)
    .default([]),
});

export type AIChapterPlannerDialogue = z.infer<typeof aiChapterPlannerDialogueSchema>;

export const retroDataSchema = z.object({
  chapter_story: z.string().trim().min(1),
  story_length: z.enum(["short", "long"]),
  pull_quote: z.string().trim().min(1),
  accumulative_paragraph: z.string().trim().min(1),
});

export type RetroData = z.infer<typeof retroDataSchema>;

// ── Cass board drawer ─────────────────────────────────────────────────────────

export const aiCassBoardDialogueSchema = z.object({
  /** chatting: still in conversation. ready_for_review: tasks are ready to add. */
  status: z.enum(["chatting", "ready_for_review"]),
  reply: z.string().trim().min(1).max(4000),
  tasks: z.array(proposedTaskSchema).max(15).default([]),
  /** True when the task set looks like a repeatable workflow worth saving. */
  suggestSaveAsTemplate: z.boolean().default(false),
  /** Draft template to save — only populated when suggestSaveAsTemplate is true. */
  templateDraft: strategicTemplateSchema,
});

export type AICassBoardDialogue = z.infer<typeof aiCassBoardDialogueSchema>;

export const aiTaskChunkingSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  isComplete: z.boolean(),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).default(""),
        priority: z.enum(["low", "medium", "high"]).nullable().default(null),
      }),
    )
    .default([]),
});

export type AITaskChunking = z.infer<typeof aiTaskChunkingSchema>;

// ── Cass schemas ──────────────────────────────────────────────────────────────

// Moment 1 — Cass onboarding: extends kickoff with project_name derived from conversation
export const cassOnboardingDialogueSchema = z.object({
  // reply can be empty when done=true (Cass wraps up silently)
  reply: z.string().trim().max(8000).default(""),
  done: z.boolean(),
  project_name: z.string().trim().max(120).default(""),
  north_star: z.string().trim().max(500).default(""),
  project_goal: z.string().trim().max(2000).default(""),
  project_audience: z.string().trim().max(2000).default(""),
  project_success: z.string().trim().max(2000).default(""),
  project_biggest_risk: z.string().trim().max(2000).default(""),
  proposed_chapters: z.array(kickoffProposedChapterSchema).max(8).default([]),
  proposed_tasks: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    column: z.enum(["Do This Week", "Do Today"]).default("Do This Week"),
    notes: z.string().trim().max(500).optional().default(""),
  })).max(10).default([]),
});

export type CassOnboardingDialogue = z.infer<typeof cassOnboardingDialogueSchema>;

// Moment 2 — Cass chapter kickoff: same schema as standard kickoff
// (reuses aiKickoffDialogueSchema — Cass just uses a different voice in the prompt)

// Moment 3 — Cass retro: same base reply shape, structured data in XML
export const cassRetroDialogueSchema = z.object({
  reply: z.string().trim().min(1).max(8000),
  done: z.boolean().default(false),
  chapter_story: z.string().trim().max(4000).default(""),
  chapter_title: z.string().trim().max(120).default(""),
  accumulative_paragraph: z.string().trim().max(2000).default(""),
});

// ── Authored By: Enhanced Storytelling System schemas ─────────────────────────

// Chapter type enum (used by chapter intelligence + narrative engine)
export const chapterTypeSchema = z.enum(["climb", "win", "turn", "fog", "reframe"]);
export type ChapterType = z.infer<typeof chapterTypeSchema>;

// ── Kickoff beats ─────────────────────────────────────────────────────────────

export const kickoffContextBeatSchema = z.object({
  previous_chapter_summary: z.string().trim().max(2000).default(""),
  incoming_feeling:         z.string().trim().max(1000).default(""),
});

export const kickoffWorkBeatSchema = z.object({
  goal:               z.string().trim().max(2000).default(""),
  why_it_matters:     z.string().trim().max(2000).default(""),
  success_definition: z.string().trim().max(2000).default(""),
  target_completion:  z.string().trim().max(500).default(""),
});

export const kickoffStakesBeatSchema = z.object({
  biggest_risk:    z.string().trim().max(2000).default(""),
  personal_meaning: z.string().trim().max(2000).default(""),
  gut_feeling:     z.string().trim().max(1000).default(""),
});

export const kickoffBeatsSchema = z.object({
  context: kickoffContextBeatSchema,
  work:    kickoffWorkBeatSchema,
  stakes:  kickoffStakesBeatSchema,
  confirmed_thesis: z.string().trim().max(1000).default(""),
});
export type KickoffBeats = z.infer<typeof kickoffBeatsSchema>;

// Enhanced kickoff dialogue output (captures all three beats + thesis)
export const cassEnhancedKickoffDialogueSchema = z.object({
  reply:       z.string().trim().min(1).max(4000),
  done:        z.boolean(),
  currentBeat: z.enum(["context", "work", "stakes", "thesis"]).default("context"),
  // Standard flat fields (kept for backwards compat with board columns)
  goal:             z.string().trim().max(2000).default(""),
  whyItMatters:     z.string().trim().max(2000).default(""),
  successLooksLike: z.string().trim().max(2000).default(""),
  doneDefinition:   z.string().trim().max(2000).default(""),
  openingLine:      z.string().trim().max(500).default(""),
  proposedTasks:    z.array(kickoffProposedTaskSchema).max(12).default([]),
  // Rich beats data
  kickoffBeats:     kickoffBeatsSchema.optional(),
  confirmedThesis:  z.string().trim().max(1000).default(""),
});
export type CassEnhancedKickoffDialogue = z.infer<typeof cassEnhancedKickoffDialogueSchema>;

// ── Retro beats ───────────────────────────────────────────────────────────────

export const retroAccountingBeatSchema = z.object({
  overall_rating:  z.string().trim().max(10).default(""),
  most_proud_of:   z.string().trim().max(2000).default(""),
});

export const retroSurpriseBeatSchema = z.object({
  biggest_surprise:     z.string().trim().max(2000).default(""),
  easier_than_expected: z.string().trim().max(2000).default(""),
  harder_than_expected: z.string().trim().max(2000).default(""),
  unplanned_events:     z.string().trim().max(2000).default(""),
});

export const retroLearningBeatSchema = z.object({
  new_knowledge:        z.string().trim().max(2000).default(""),
  thinking_shift:       z.string().trim().max(2000).default(""),
  would_do_differently: z.string().trim().max(2000).default(""),
});

export const retroEmotionalCloseBeatSchema = z.object({
  gut_feeling_delta:       z.string().trim().max(2000).default(""),
  road_ahead_feeling:      z.string().trim().max(2000).default(""),
  weighing_or_energizing:  z.string().trim().max(2000).default(""),
});

export const retroBeatsSchema = z.object({
  accounting:     retroAccountingBeatSchema,
  surprise:       retroSurpriseBeatSchema,
  learning:       retroLearningBeatSchema,
  emotional_close: retroEmotionalCloseBeatSchema,
});
export type RetroBeats = z.infer<typeof retroBeatsSchema>;

// Enhanced retro dialogue output (collects beats; story written separately)
export const cassEnhancedRetroDialogueSchema = z.object({
  reply:       z.string().trim().min(1).max(8000),
  done:        z.boolean().default(false),
  currentBeat: z.enum(["accounting", "surprise", "learning", "emotional_close", "bridge"])
    .default("accounting"),
  retroBeats:      retroBeatsSchema.optional(),
  bridge_sentence: z.string().trim().max(1000).default(""),
});
export type CassEnhancedRetroDialogue = z.infer<typeof cassEnhancedRetroDialogueSchema>;

// ── Narrative engine output ───────────────────────────────────────────────────

export const narrativeEngineOutputSchema = z.object({
  headline:    z.string().trim().max(120),
  subheadline: z.string().trim().max(300),
  body:        z.string().trim().min(100),
  chapterType: chapterTypeSchema,
});
export type NarrativeEngineOutput = z.infer<typeof narrativeEngineOutputSchema>;

// ── Story health report ───────────────────────────────────────────────────────

export const storyHealthSignalsSchema = z.object({
  type_variety:      z.boolean(),
  emotional_texture: z.boolean(),
  thesis_visible:    z.boolean(),
  stakes_named:      z.boolean(),
  learning_present:  z.boolean(),
});

export const storyHealthReportSchema = z.object({
  chapters_scored:      z.number().int().min(0),
  signals:              storyHealthSignalsSchema,
  failing_signal_count: z.number().int().min(0),
  patterns_detected:    z.array(z.string()).default([]),
  recentering_needed:   z.boolean(),
  recentering_type:     z.string().nullable().default(null),
});
export type StoryHealthReport = z.infer<typeof storyHealthReportSchema>;
