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

export type AITaskExtraction = z.infer<typeof aiTaskExtractionSchema>;
export type AIStrategicDialogue = z.infer<typeof aiStrategicDialogueSchema>;
export type StrategicDialogueMessage = z.infer<
  typeof strategicDialogueMessageSchema
>;
export type StrategicTemplate = z.infer<typeof strategicTemplateSchema>;
