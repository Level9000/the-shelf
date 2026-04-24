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

export const aiStrategicDialogueSchema = z.object({
  status: z.enum(["clarifying", "ready_for_confirmation"]),
  reply: z.string().trim().min(1).max(4000),
  tasks: z.array(proposedTaskSchema).max(12),
});

export type AITaskExtraction = z.infer<typeof aiTaskExtractionSchema>;
export type AIStrategicDialogue = z.infer<typeof aiStrategicDialogueSchema>;
export type StrategicDialogueMessage = z.infer<
  typeof strategicDialogueMessageSchema
>;
