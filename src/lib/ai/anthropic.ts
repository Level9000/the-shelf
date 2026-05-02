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
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Project kickoff dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const content = payload.content?.find((block) => block.type === "text")?.text;

  if (!content) {
    throw new Error("Project kickoff dialogue returned no content.");
  }

  const cleaned = content
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return aiProjectKickoffDialogueSchema.parse(safeJsonParse(cleaned));
}

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
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Kickoff dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const content = payload.content?.find((block) => block.type === "text")?.text;

  if (!content) {
    throw new Error("Kickoff dialogue returned no content.");
  }

  const cleaned = content
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return aiKickoffDialogueSchema.parse(safeJsonParse(cleaned));
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
