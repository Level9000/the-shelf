import { z } from "zod";

const proposedTaskSchema = z.object({
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

export type AITaskExtraction = z.infer<typeof aiTaskExtractionSchema>;
