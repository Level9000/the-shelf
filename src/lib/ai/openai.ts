import {
  aiStrategicDialogueSchema,
  aiTaskExtractionSchema,
  type StrategicDialogueMessage,
} from "@/lib/ai/schema";
import {
  buildStrategicDialoguePrompt,
  buildTaskExtractionPrompt,
} from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/utils";

const OPENAI_API_BASE = process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1";
const CHAT_MODEL = process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini";
const TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";

function requireOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return apiKey;
}

export async function transcribeAudioFile(file: File) {
  const apiKey = requireOpenAiKey();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", TRANSCRIPTION_MODEL);

  const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Transcription failed: ${message}`);
  }

  const payload = (await response.json()) as { text?: string };

  if (!payload.text?.trim()) {
    throw new Error("Transcription returned an empty result.");
  }

  return payload.text.trim();
}

export async function extractTasksFromTranscript(input: {
  transcript: string;
  projectName: string;
  projectDescription?: string | null;
}) {
  const apiKey = requireOpenAiKey();
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Return valid JSON that matches the provided schema exactly. Do not include markdown.",
        },
        {
          role: "user",
          content: buildTaskExtractionPrompt(input),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "voice_task_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "title",
                    "description",
                    "suggestedColumn",
                    "priority",
                    "dueDate",
                    "confidence",
                  ],
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 120 },
                    description: { type: "string", maxLength: 1000 },
                    suggestedColumn: { type: "string", maxLength: 32 },
                    priority: {
                      type: ["string", "null"],
                      enum: ["low", "medium", "high", null],
                    },
                    dueDate: { type: ["string", "null"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Task parsing failed: ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Task parser returned no content.");
  }

  return aiTaskExtractionSchema.parse(safeJsonParse(content));
}

export async function runStrategicTextDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
}) {
  const apiKey = requireOpenAiKey();
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Return valid JSON that matches the provided schema exactly. Do not include markdown fences.",
        },
        {
          role: "system",
          content: buildStrategicDialoguePrompt(input),
        },
        ...input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "strategic_text_dialogue",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["status", "reply", "tasks"],
            properties: {
              status: {
                type: "string",
                enum: ["clarifying", "ready_for_confirmation"],
              },
              reply: { type: "string", minLength: 1, maxLength: 4000 },
              tasks: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "title",
                    "description",
                    "suggestedColumn",
                    "priority",
                    "dueDate",
                    "confidence",
                  ],
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 120 },
                    description: { type: "string", maxLength: 1000 },
                    suggestedColumn: { type: "string", maxLength: 32 },
                    priority: {
                      type: ["string", "null"],
                      enum: ["low", "medium", "high", null],
                    },
                    dueDate: { type: ["string", "null"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Strategic dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Strategic dialogue returned no content.");
  }

  return aiStrategicDialogueSchema.parse(safeJsonParse(content));
}
