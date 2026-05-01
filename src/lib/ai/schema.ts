import { z } from "zod";

export const proposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  suggestedColumn: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value || "To Do"),
  priority: z.enum(["low", "medium", "high"]).nullable().default(null),
  dueDate: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  confidence: z.number().min(0).max(1).default(0.72),
});

export const aiTaskExtractionSchema = z.object({
  tasks: z.array(proposedTaskSchema).max(12),
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
  done: z.string().trim().max(2000).default(""),
});

export const kickoffProposedChapterSchema = z.object({
  chapter_number: z.number().int().min(1),
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

export const retroDataSchema = z.object({
  chapter_story: z.string().trim().min(1),
  story_length: z.enum(["short", "long"]),
  pull_quote: z.string().trim().min(1),
  accumulative_paragraph: z.string().trim().min(1),
});

export type RetroData = z.infer<typeof retroDataSchema>;
