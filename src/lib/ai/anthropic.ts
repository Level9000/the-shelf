import {
  aiKickoffDialogueSchema,
  aiProjectKickoffDialogueSchema,
  type StrategicDialogueMessage,
} from "@/lib/ai/schema";
import {
  buildChapterKickoffPrompt,
  buildChapterRetroPrompt,
  buildProjectKickoffPrompt,
} from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/utils";

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

function requireAnthropicKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  return apiKey;
}

// Extract the JSON object from a response that may have surrounding prose.
// Finds the outermost { ... } block regardless of what the model says before or after.
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Response did not contain a JSON object: ${text.slice(0, 120)}`);
  }
  return text.slice(start, end + 1);
}

export async function runProjectKickoffDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildProjectKickoffPrompt(input);

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Project kickoff dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const rawText = payload.content?.find((block) => block.type === "text")?.text;

  if (!rawText) {
    throw new Error("Project kickoff dialogue returned no content.");
  }

  return aiProjectKickoffDialogueSchema.parse(safeJsonParse(extractJsonObject(rawText)));
}

// Tool definition for chapter kickoff — forces the model to always return structured JSON.
// With tool_choice "any", the model cannot respond in plain prose.
const KICKOFF_TOOL = {
  name: "kickoff_response",
  description: "Submit the chapter kickoff dialogue response. Always call this tool — never respond in plain text.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Your conversational response to the user." },
      done: { type: "boolean", description: "True only when you have collected all four answers and are ready to propose tasks." },
      goal: { type: "string", description: "Chapter goal as a complete commitment. Empty string while gathering." },
      whyItMatters: { type: "string", description: "Why the chapter matters. Empty string while gathering." },
      successLooksLike: { type: "string", description: "What success looks like. Empty string while gathering." },
      doneDefinition: { type: "string", description: "Done definition. Empty string while gathering." },
      openingLine: { type: "string", description: "The narrative seed sentence. Empty string while gathering." },
      proposedTasks: {
        type: "array",
        description: "Proposed backlog tasks. Empty array while gathering.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            source: { type: "string", enum: ["ai_suggested"] },
          },
          required: ["title", "source"],
        },
      },
    },
    required: ["reply", "done", "goal", "whyItMatters", "successLooksLike", "doneDefinition", "openingLine", "proposedTasks"],
  },
} as const;

export async function runChapterKickoffDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  northStar?: string | null;
  projectWhyItMatters?: string | null;
  projectStory?: {
    goal?: string | null;
    whyItMatters?: string | null;
  };
  projectKickoff?: {
    northStar?: string | null;
    projectGoal?: string | null;
    projectAudience?: string | null;
    projectSuccess?: string | null;
    projectBiggestRisk?: string | null;
  };
  previousChapters?: Array<{
    name: string;
    goal?: string | null;
    openingLine?: string | null;
  }>;
  chapterName: string;
  prefill?: {
    goal?: string | null;
    value?: string | null;
    measure?: string | null;
    done?: string | null;
  } | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildChapterKickoffPrompt(input);

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: [KICKOFF_TOOL],
      tool_choice: { type: "any" },
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Kickoff dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
  };

  // With tool_choice "any", the model always returns a tool_use block.
  const toolUse = payload.content?.find((block) => block.type === "tool_use" && block.name === "kickoff_response");

  if (!toolUse?.input) {
    throw new Error("Kickoff dialogue did not return a tool call.");
  }

  return aiKickoffDialogueSchema.parse(toolUse.input);
}

export async function runChapterRetroDialogue(input: {
  messages: StrategicDialogueMessage[];
  chapter: {
    goal: string | null;
    whyItMatters: string | null;
    successLooksLike: string | null;
    doneDefinition: string | null;
    openingLine: string | null;
  };
  completedTasks: Array<{ title: string }>;
  remainingTasks: Array<{ title: string }>;
  projectStory: string | null;
  previousChapters: Array<{ name: string; chapterStory?: string | null }>;
}): Promise<{ reply: string }> {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildChapterRetroPrompt(input);

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Retro dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const content = payload.content?.find((block) => block.type === "text")?.text;

  if (!content) {
    throw new Error("Retro dialogue returned no content.");
  }

  return { reply: content };
}
