import {
  aiArcDialogueSchema,
  aiCassBoardDialogueSchema,
  aiChapterPlannerDialogueSchema,
  aiKickoffDialogueSchema,
  aiProjectKickoffDialogueSchema,
  aiRefocusDialogueSchema,
  aiStrategicDialogueSchema,
  aiTaskChunkingSchema,
  aiTaskExtractionSchema,
  aiProjectOverviewDialogueSchema,
  aiWeeklyPlanningDialogueSchema,
  cassOnboardingDialogueSchema,
  cassRetroDialogueSchema,
  cassEnhancedKickoffDialogueSchema,
  cassEnhancedRetroDialogueSchema,
  type AITaskChunking,
  type ProjectOverviewSection,
  type StrategicDialogueMessage,
  type NarrativeEngineOutput,
} from "@/lib/ai/schema";
import {
  buildCassBoardPrompt,
  buildCassChapterKickoffPrompt,
  buildCassOnboardingPrompt,
  buildCassRetroPrompt,
  buildCassStoryShareRefinementPrompt,
  buildTyChapterKickoffPrompt,
  buildTyRetroPrompt,
  buildTyChroniclePrompt,
  buildPressGapAnalysisPrompt,
  buildPressIntroPrompt,
  buildChapterKickoffPrompt,
  buildChapterOverviewDialoguePrompt,
  buildChapterPlannerPrompt,
  buildChapterRefocusPrompt,
  buildChapterRetroPrompt,
  buildNarrativeEnginePass1Prompt,
  buildNarrativeEnginePass2Prompt,
  buildProjectArcDialoguePrompt,
  buildProjectKickoffPrompt,
  buildProjectOverviewDialoguePrompt,
  buildShareBlogPrompt,
  buildShareEmailPrompt,
  buildShareLinkedInPrompt,
  buildSharePodcastPrompt,
  buildStrategicDialoguePrompt,
  buildTaskChunkingPrompt,
  buildTaskExtractionPrompt,
  buildWeeklyPlanningPrompt,
} from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/utils";
import type { ChapterType } from "@/prompts/chapter-templates";
import type { StitchingPattern } from "@/prompts/chapter-templates";

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
// Extended for 3-beat kickoff: includes currentBeat, confirmedThesis, kickoffBeats.
const KICKOFF_TOOL = {
  name: "kickoff_response",
  description: "Submit the chapter kickoff dialogue response. Always call this tool — never respond in plain text.",
  input_schema: {
    type: "object",
    properties: {
      reply:            { type: "string", description: "Your conversational response to the user." },
      done:             { type: "boolean", description: "True only when all three beats are complete AND thesis is confirmed." },
      currentBeat:      { type: "string", description: "Which beat you are currently on: context | work | stakes | thesis." },
      goal:             { type: "string", description: "The chapter goal from the work beat. Empty string while gathering." },
      whyItMatters:     { type: "string", description: "Why it matters from the work beat. Empty string while gathering." },
      successLooksLike: { type: "string", description: "Success definition from the work beat. Empty string while gathering." },
      doneDefinition:   { type: "string", description: "Target completion / timeline from the work beat. Empty string while gathering." },
      openingLine:      { type: "string", description: "Narrative seed sentence. Empty string until done." },
      confirmedThesis:  { type: "string", description: "The thesis sentence after founder confirms it. Empty string until confirmed." },
      proposedTasks: {
        type: "array",
        description: "4–8 concrete task titles derived from the work and stakes beats. Empty array until done.",
        items: {
          type: "object",
          properties: {
            title:  { type: "string" },
            source: { type: "string", enum: ["ai_suggested"] },
          },
          required: ["title", "source"],
        },
      },
      kickoffBeats: {
        type: "object",
        description: "Full structured beats data. Omit until done=true.",
        properties: {
          context: {
            type: "object",
            properties: {
              previous_chapter_summary: { type: "string" },
              incoming_feeling:         { type: "string" },
            },
            required: ["previous_chapter_summary", "incoming_feeling"],
          },
          work: {
            type: "object",
            properties: {
              goal:               { type: "string" },
              why_it_matters:     { type: "string" },
              success_definition: { type: "string" },
              target_completion:  { type: "string" },
            },
            required: ["goal", "why_it_matters", "success_definition", "target_completion"],
          },
          stakes: {
            type: "object",
            properties: {
              biggest_risk:     { type: "string" },
              personal_meaning: { type: "string" },
              gut_feeling:      { type: "string" },
            },
            required: ["biggest_risk", "personal_meaning", "gut_feeling"],
          },
          confirmed_thesis: { type: "string" },
        },
        required: ["context", "work", "stakes", "confirmed_thesis"],
      },
    },
    required: [
      "reply", "done", "currentBeat", "goal", "whyItMatters",
      "successLooksLike", "doneDefinition", "openingLine",
      "confirmedThesis", "proposedTasks",
    ],
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

// ── Share format generation ──────────────────────────────────────────────────

async function runShareGeneration(input: {
  messages: StrategicDialogueMessage[];
  systemPrompt: string;
}): Promise<{ content: string }> {
  const apiKey = requireAnthropicKey();

  const apiMessages =
    input.messages.length > 0
      ? input.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user" as const, content: "Generate the content now." }];

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
      system: input.systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Share generation failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Share generation returned no content.");

  return { content: text.trim() };
}

export async function runShareEmailGeneration(input: {
  messages: StrategicDialogueMessage[];
  chapterName: string;
  goal: string | null;
  whyItMatters: string | null;
  chapterStory: string | null;
  completedTasks: string[];
  remainingTasks: string[];
  projectName: string;
  projectStory: string | null;
  audienceType: string;
}) {
  return runShareGeneration({
    messages: input.messages,
    systemPrompt: buildShareEmailPrompt(input),
  });
}

export async function runShareBlogGeneration(input: {
  messages: StrategicDialogueMessage[];
  chapterName: string;
  goal: string | null;
  chapterStory: string | null;
  completedTasks: string[];
  projectName: string;
  projectStory: string | null;
}) {
  return runShareGeneration({
    messages: input.messages,
    systemPrompt: buildShareBlogPrompt(input),
  });
}

export async function runShareLinkedInGeneration(input: {
  messages: StrategicDialogueMessage[];
  chapterName: string;
  goal: string | null;
  chapterStory: string | null;
  completedTasks: string[];
  projectName: string;
}) {
  return runShareGeneration({
    messages: input.messages,
    systemPrompt: buildShareLinkedInPrompt(input),
  });
}

export async function runSharePodcastGeneration(input: {
  messages: StrategicDialogueMessage[];
  chapterName: string;
  goal: string | null;
  chapterStory: string | null;
  completedTasks: string[];
  projectName: string;
  projectStory: string | null;
}) {
  return runShareGeneration({
    messages: input.messages,
    systemPrompt: buildSharePodcastPrompt(input),
  });
}

// ── Text AI functions (migrated from openai.ts) ───────────────────────────────

async function runJsonDialogue<T>(
  systemPrompt: string,
  messages: StrategicDialogueMessage[],
  parse: (text: string) => T,
  maxTokens = 2048,
): Promise<T> {
  const apiKey = requireAnthropicKey();

  const apiMessages =
    messages.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user" as const, content: "Begin." }];

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI request failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("AI returned no content.");

  return parse(text);
}

export async function extractTasksFromTranscript(input: {
  transcript: string;
  projectName: string;
  projectDescription?: string | null;
}) {
  return runJsonDialogue(
    buildTaskExtractionPrompt(input),
    [{ role: "user", content: "Extract tasks from the transcript above." }],
    (text) => aiTaskExtractionSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
}

export async function runStrategicTextDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  chapterContext?: {
    name: string;
    goal: string | null;
    whyItMatters: string | null;
    successLooksLike: string | null;
    doneDefinition: string | null;
  } | null;
  existingTasks?: Array<{ title: string; columnName: string }>;
}) {
  return runJsonDialogue(
    buildStrategicDialoguePrompt(input),
    input.messages,
    (text) => aiStrategicDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
}

// Tool definition for Cass board dialogue — forces structured output so the model
// can never return plain prose that fails Zod parsing at the `reply` field.
const BOARD_TOOL = {
  name: "board_response",
  description: "Submit the Cass board dialogue response. Always call this tool — never respond in plain text.",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["chatting", "ready_for_review"],
        description: "chatting while conversing; ready_for_review when tasks are ready to add.",
      },
      reply: { type: "string", description: "Your conversational response to the user." },
      tasks: {
        type: "array",
        description: "Proposed tasks. Empty array while chatting.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            suggestedColumn: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            dueDate: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["title", "suggestedColumn"],
        },
      },
      suggestSaveAsTemplate: {
        type: "boolean",
        description: "True when the task set looks like a repeatable workflow worth saving.",
      },
      templateDraft: {
        type: "object",
        description: "Draft template — only populated when suggestSaveAsTemplate is true.",
        properties: {
          name: { type: "string" },
          triggerPhrase: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "triggerPhrase"],
      },
    },
    required: ["status", "reply", "tasks", "suggestSaveAsTemplate", "templateDraft"],
  },
} as const;

export async function runCassBoardDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  mode: "tasks" | "braindump" | "breakup";
  chapterContext?: {
    name: string;
    goal: string | null;
    whyItMatters: string | null;
    successLooksLike: string | null;
    doneDefinition: string | null;
  } | null;
  existingTasks?: Array<{ title: string; columnName: string }>;
  existingTemplates?: Array<{ name: string; triggerPhrase: string; steps: string[] }>;
  breakupTask?: {
    title: string;
    description: string | null;
    columnName: string;
  } | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildCassBoardPrompt(input);

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
      tools: [BOARD_TOOL],
      tool_choice: { type: "any" },
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Cass board dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
  };

  const toolUse = payload.content?.find(
    (block) => block.type === "tool_use" && block.name === "board_response",
  );

  if (!toolUse?.input) {
    throw new Error("Cass board dialogue did not return a tool call.");
  }

  // Normalise nullable fields that the tool schema can't enforce
  const raw = toolUse.input as Record<string, unknown>;
  const tasks = Array.isArray(raw.tasks)
    ? (raw.tasks as Array<Record<string, unknown>>).map((t) => ({
        ...t,
        description: t.description ?? "",
        priority: t.priority ?? null,
        dueDate: t.dueDate ?? null,
        confidence: t.confidence ?? 0.72,
      }))
    : [];

  return aiCassBoardDialogueSchema.parse({ ...raw, tasks });
}

export async function runProjectOverviewDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  currentSection: ProjectOverviewSection;
  existingValues: {
    goal?: string | null;
    whyItMatters?: string | null;
    successLooksLike?: string | null;
    doneDefinition?: string | null;
  };
}) {
  return runJsonDialogue(
    buildProjectOverviewDialoguePrompt(input),
    input.messages,
    (text) => aiProjectOverviewDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
}

export async function runChapterOverviewDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  projectOverview: {
    goal?: string | null;
    whyItMatters?: string | null;
    successLooksLike?: string | null;
    doneDefinition?: string | null;
  };
  chapterName: string;
  currentSection: ProjectOverviewSection;
  existingValues: {
    goal?: string | null;
    whyItMatters?: string | null;
    successLooksLike?: string | null;
    doneDefinition?: string | null;
  };
}) {
  return runJsonDialogue(
    buildChapterOverviewDialoguePrompt(input),
    input.messages,
    (text) => aiProjectOverviewDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
}

export async function runWeeklyPlanningDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  chapterName: string;
  chapterGoal?: string | null;
  chapterSuccessLooksLike?: string | null;
  backlogTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    dueDate?: string | null;
  }>;
  currentWeekTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    dueDate?: string | null;
  }>;
}) {
  return runJsonDialogue(
    buildWeeklyPlanningPrompt(input),
    input.messages,
    (text) => aiWeeklyPlanningDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
}

// Tool definition for chapter refocus — forces structured task split output.
const REFOCUS_TOOL = {
  name: "refocus_response",
  description: "Submit the chapter refocus dialogue response. Always call this tool — never respond in plain text.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Your conversational response to the user." },
      done: { type: "boolean", description: "True only when you have enough context to propose the keep/defer split." },
      keepTaskIds: {
        type: "array",
        description: "Task IDs to keep in this chapter. Empty array while conversing.",
        items: { type: "string" },
      },
      deferTaskIds: {
        type: "array",
        description: "Task IDs to defer to the next chapter. Empty array while conversing.",
        items: { type: "string" },
      },
      rationale: { type: "string", description: "One sentence explaining the principle behind the split. Empty string while conversing." },
    },
    required: ["reply", "done", "keepTaskIds", "deferTaskIds", "rationale"],
  },
} as const;

export async function runChapterRefocusDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  chapterName: string;
  ageDays: number;
  openingLine: string | null;
  goal: string | null;
  incompleteTasks: Array<{ id: string; title: string; columnName: string }>;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildChapterRefocusPrompt(input);

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
      tools: [REFOCUS_TOOL],
      tool_choice: { type: "any" },
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Refocus dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
  };

  const toolUse = payload.content?.find(
    (block) => block.type === "tool_use" && block.name === "refocus_response",
  );

  if (!toolUse?.input) {
    throw new Error("Refocus dialogue did not return a tool call.");
  }

  return aiRefocusDialogueSchema.parse(toolUse.input);
}

export async function runProjectArcDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  projectDescription?: string | null;
  existingValues: {
    northStar?: string | null;
    accumulativeStory?: string | null;
  };
  chapters: Array<{
    index: number;
    name: string;
    goal?: string | null;
    openingLine?: string | null;
    status: "upcoming" | "active" | "complete";
  }>;
}) {
  return runJsonDialogue(
    buildProjectArcDialoguePrompt(input),
    input.messages,
    (text) => aiArcDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
    3072,
  );
}

export async function runChapterPlannerDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  accumulativeStory?: string | null;
  existingChapters: Array<{
    name: string;
    goal?: string | null;
    status: "completed" | "working_on_it" | "planned";
  }>;
  avatar?: string | null;
}) {
  const normalizedChapters = input.existingChapters.map((ch) => ({
    name:   ch.name,
    goal:   ch.goal ?? null,
    status: ch.status,
  }));

  const systemPrompt =
    input.avatar === "ty"
      ? buildTyChroniclePrompt({ ...input, existingChapters: normalizedChapters })
      : buildChapterPlannerPrompt(input);

  return runJsonDialogue(
    systemPrompt,
    input.messages,
    (text) => aiChapterPlannerDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
    2048,
  );
}

const CHUNK_TOOL = {
  name: "chunk_response",
  description:
    "Submit the task chunking dialogue response. Always call this tool — never respond in plain text.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Conversational response to the user." },
      isComplete: {
        type: "boolean",
        description: "True only when the user has confirmed the final task breakdown.",
      },
      tasks: {
        type: "array",
        description: "Empty array while chatting; the confirmed subtask list when isComplete=true.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short, specific task title." },
            description: { type: "string", description: "Brief context or next step." },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", ""],
              description: "Task priority, or empty string for none.",
            },
          },
          required: ["title", "description", "priority"],
        },
      },
    },
    required: ["reply", "isComplete", "tasks"],
  },
} as const;

export async function runTaskChunkingDialogue(input: {
  messages: StrategicDialogueMessage[];
  taskTitle: string;
  taskDescription: string | null;
  columnName: string;
  chapterName: string;
}): Promise<AITaskChunking> {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildTaskChunkingPrompt(input);

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
      tools: [CHUNK_TOOL],
      tool_choice: { type: "any" },
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Task chunking dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
  };

  const toolUse = payload.content?.find(
    (block) => block.type === "tool_use" && block.name === "chunk_response",
  );

  if (!toolUse?.input) {
    throw new Error("Task chunking dialogue returned no structured response.");
  }

  const raw = toolUse.input as {
    reply: string;
    isComplete: boolean;
    tasks: Array<{ title: string; description: string; priority: string }>;
  };

  return aiTaskChunkingSchema.parse({
    ...raw,
    tasks: (raw.tasks ?? []).map((t) => ({ ...t, priority: t.priority || null })),
  });
}

// ── Cass AI functions ─────────────────────────────────────────────────────────

export async function runCassOnboardingDialogue(input: {
  messages: StrategicDialogueMessage[];
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildCassOnboardingPrompt();

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
    throw new Error(`Cass onboarding dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const rawText = payload.content?.find((block) => block.type === "text")?.text;
  if (!rawText) throw new Error("Cass onboarding returned no content.");

  const parsed = cassOnboardingDialogueSchema.safeParse(safeJsonParse(extractJsonObject(rawText)));

  if (parsed.success) return parsed.data;

  // Schema validation failed — extract reply text and continue the conversation
  // rather than crashing. The AI may have returned malformed structured data
  // (e.g. booleans where strings expected) but the reply text is usually fine.
  const rawObj = safeJsonParse(extractJsonObject(rawText)) as Record<string, unknown> | null;
  const reply = typeof rawObj?.reply === "string" && rawObj.reply.trim()
    ? rawObj.reply.trim()
    : rawText.replace(/\{[\s\S]*\}/, "").trim() || "Let me think about that for a second.";

  console.warn("Cass onboarding schema validation failed, falling back to reply-only:", parsed.error.message);

  return {
    reply,
    done: false,
    project_name: "",
    north_star: "",
    project_goal: "",
    project_audience: "",
    project_success: "",
    project_biggest_risk: "",
    proposed_chapters: [],
  };
}

export async function runCassChapterKickoffDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  projectGoal?: string | null;
  chapterNumber: number;
  chapterName: string;
  previousChapterGoal?: string | null;
  previousChapterStory?: string | null;
  previousChapterBridgeSentence?: string | null;
  recenteringType?: string | null;
  foundingThesis?: string | null;
  prefill?: {
    goal?: string | null;
    value?: string | null;
    measure?: string | null;
    done?: string | null;
  } | null;
  avatar?: string | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt =
    input.avatar === "ty"
      ? buildTyChapterKickoffPrompt(input)
      : buildCassChapterKickoffPrompt(input);

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
    throw new Error(`Cass chapter kickoff failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
  };

  const toolUse = payload.content?.find(
    (block) => block.type === "tool_use" && block.name === "kickoff_response",
  );

  // Fallback: if no tool call, try to extract plain text reply so the
  // conversation can continue rather than hard-failing.
  if (!toolUse?.input) {
    const fallbackText = payload.content?.find((b) => b.type === "text")?.text?.trim();
    if (fallbackText) {
      console.warn("[kickoff] tool call missing — returning raw text fallback");
      return { reply: fallbackText, done: false, goal: "", whyItMatters: "", successLooksLike: "", doneDefinition: "", openingLine: "", proposedTasks: [], currentBeat: "context" as const };
    }
    throw new Error("Cass chapter kickoff did not return a tool call.");
  }

  // Try enhanced schema first (includes beats + thesis), fall back to standard
  const enhanced = cassEnhancedKickoffDialogueSchema.safeParse(toolUse.input);
  if (enhanced.success) return enhanced.data;
  const standard = aiKickoffDialogueSchema.safeParse(toolUse.input);
  if (standard.success) return standard.data;

  // Both schemas failed — return minimal safe response rather than crashing
  console.warn("[kickoff] schema parse failed — returning partial fallback");
  const raw = toolUse.input as Record<string, unknown>;
  return { reply: String(raw.reply ?? "Let's keep going — what were you saying?"), done: false, goal: "", whyItMatters: "", successLooksLike: "", doneDefinition: "", openingLine: "", proposedTasks: [], currentBeat: "context" as const };
}

export async function runCassRetroDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  accumulativeStory?: string | null;
  chapter: {
    number: number;
    name: string;
    goal?: string | null;
    whyItMatters?: string | null;
    successLooksLike?: string | null;
    doneDefinition?: string | null;
    kickoffGutFeeling?: string | null;
    confirmedThesis?: string | null;
  };
  completedTasks: Array<{ title: string; context?: string | null }>;
  incompleteTasks: Array<{ title: string }>;
  recenteringType?: string | null;
  avatar?: string | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt =
    input.avatar === "ty"
      ? buildTyRetroPrompt(input)
      : buildCassRetroPrompt(input);

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
    throw new Error(`Cass retro dialogue failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const rawText = payload.content?.find((block) => block.type === "text")?.text;
  if (!rawText) throw new Error("Cass retro returned no content.");

  // Try enhanced schema first (includes beats + bridge), fall back to legacy
  const enhanced = cassEnhancedRetroDialogueSchema.safeParse(
    safeJsonParse(extractJsonObject(rawText)),
  );
  if (enhanced.success) return enhanced.data;

  const legacy = cassRetroDialogueSchema.safeParse(
    safeJsonParse(extractJsonObject(rawText)),
  );
  if (legacy.success) return legacy.data;

  // Both schemas failed — AI returned malformed/missing JSON.
  // Return the raw text as a reply so the conversation can continue
  // rather than crashing the session and losing everything.
  console.warn("[retro] JSON parse failed — returning raw text fallback");
  const cleanText = rawText.replace(/<retro_data>[\s\S]*?<\/retro_data>/g, "").trim();
  return { reply: cleanText.slice(0, 4000) || "Sorry, I lost my train of thought. What were you saying?", done: false, currentBeat: "accounting" as const };
}

// ── Narrative Engine ──────────────────────────────────────────────────────────

/**
 * Pass 1: Draft the chapter from the assembled brief using the type-specific template.
 * Returns raw text (headline + subheadline + body).
 */
export async function runNarrativeEnginePass1(input: {
  chapterBriefText: string;
  chapterType: ChapterType;
  stitchingPattern: StitchingPattern | null;
}): Promise<string> {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildNarrativeEnginePass1Prompt(input);

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
      messages: [{ role: "user", content: "Write the chapter now." }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Narrative engine Pass 1 failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("Narrative engine Pass 1 returned no content.");

  return text;
}

/**
 * Pass 2: Editorial review — rewrites only the sections that fail quality criteria.
 * Returns the final chapter text (headline + subheadline + body).
 */
export async function runNarrativeEnginePass2(input: {
  pass1Draft: string;
  chapterBriefText: string;
}): Promise<string> {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildNarrativeEnginePass2Prompt(input);

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
      messages: [{ role: "user", content: "Review and finalize the chapter now." }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Narrative engine Pass 2 failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("Narrative engine Pass 2 returned no content.");

  return text;
}

/**
 * Parses the final chapter text into structured fields.
 * Expected format:
 *   Line 1: HEADLINE
 *   Line 2: SUBHEADLINE
 *   (blank line)
 *   BODY...
 */
export function parseNarrativeEngineOutput(
  rawText: string,
  chapterType: ChapterType,
): NarrativeEngineOutput {
  const lines = rawText.split("\n");

  // First non-empty line = headline
  const headlineIndex = lines.findIndex((l) => l.trim().length > 0);
  const headline = lines[headlineIndex]?.trim() ?? "";

  // Second non-empty line = subheadline
  const subheadlineIndex = lines.findIndex(
    (l, i) => i > headlineIndex && l.trim().length > 0,
  );
  const subheadline = lines[subheadlineIndex]?.trim() ?? "";

  // Everything after subheadline = body
  const bodyLines = lines.slice(subheadlineIndex + 1);
  const body = bodyLines.join("\n").trim();

  return { headline, subheadline, body, chapterType };
}

/**
 * Full narrative engine: Pass 1 → Pass 2 → parse output.
 */
export async function runNarrativeEngine(input: {
  chapterBriefText: string;
  chapterType: ChapterType;
  stitchingPattern: StitchingPattern | null;
}): Promise<NarrativeEngineOutput> {
  const pass1Draft = await runNarrativeEnginePass1(input);
  const finalText  = await runNarrativeEnginePass2({
    pass1Draft,
    chapterBriefText: input.chapterBriefText,
  });
  return parseNarrativeEngineOutput(finalText, input.chapterType);
}

export async function runCassStoryShareRefinement(input: {
  projectName: string;
  chapterName: string;
  chapterGoal?: string | null;
  currentStory: string;
  instruction: string;
}): Promise<string> {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildCassStoryShareRefinementPrompt(input);

  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: input.instruction,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Story refinement failed: ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const refined = payload.content?.find((b) => b.type === "text")?.text?.trim();
  if (!refined) throw new Error("Story refinement returned no content.");

  return refined;
}

// ── Press gap analysis ────────────────────────────────────────────────────────

export async function runPressGapAnalysis(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  outputType: string;
  chapters: Array<{
    name: string;
    goal: string | null;
    story: string | null;
    status: string;
  }>;
}) {
  return runJsonDialogue(
    buildPressGapAnalysisPrompt(input),
    input.messages,
    (text) => {
      const parsed = safeJsonParse(extractJsonObject(text)) as {
        reply?: string;
        done?: boolean;
        has_sufficient_data?: boolean;
        gaps?: string[];
        ready_to_generate?: boolean;
      };
      return {
        reply:               parsed.reply ?? "",
        done:                parsed.done ?? false,
        has_sufficient_data: parsed.has_sufficient_data ?? false,
        gaps:                parsed.gaps ?? [],
        ready_to_generate:   parsed.ready_to_generate ?? false,
      };
    },
    1024,
  );
}

// ── Press introduction ────────────────────────────────────────────────────────

export async function runPressIntroDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  completedChapters: Array<{
    name: string;
    goal: string | null;
    story: string | null;
  }>;
  totalChapters: number;
}) {
  return runJsonDialogue(
    buildPressIntroPrompt(input),
    input.messages,
    (text) => {
      const parsed = safeJsonParse(extractJsonObject(text)) as {
        reply?: string;
        done?: boolean;
        ready_for_press?: boolean;
      };
      return {
        reply:           parsed.reply ?? "",
        done:            parsed.done ?? false,
        ready_for_press: parsed.ready_for_press ?? false,
      };
    },
    1024,
  );
}
