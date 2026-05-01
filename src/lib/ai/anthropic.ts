import {
  aiKickoffDialogueSchema,
  type StrategicDialogueMessage,
} from "@/lib/ai/schema";
import { buildChapterKickoffPrompt } from "@/lib/ai/prompts";
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

export async function runChapterKickoffDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  projectStory?: {
    goal?: string | null;
    whyItMatters?: string | null;
  };
  previousChapters?: Array<{ name: string; goal?: string | null }>;
  chapterName: string;
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
