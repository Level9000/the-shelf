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
  type AITaskChunking,
  type ProjectOverviewSection,
  type StrategicDialogueMessage,
} from "@/lib/ai/schema";
import {
  buildCassBoardPrompt,
  buildCassChapterKickoffPrompt,
  buildCassOnboardingPrompt,
  buildCassRetroPrompt,
  buildCassStoryShareRefinementPrompt,
  buildChapterKickoffPrompt,
  buildChapterOverviewDialoguePrompt,
  buildChapterPlannerPrompt,
  buildChapterRefocusPrompt,
  buildChapterRetroPrompt,
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
      goal: { type: "string", description: "The bet — the hypothesis being acted on, as a complete conviction statement. Empty string while gathering." },
      whyItMatters: { type: "string", description: "Why now — the urgency or window behind this chapter. Empty string while gathering." },
      successLooksLike: { type: "string", description: "What has to be true — specific conditions that need to hold; primary source for task generation. Empty string while gathering." },
      doneDefinition: { type: "string", description: "The proof point — the tangible thing that will exist at the end. Empty string while gathering." },
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
  return runJsonDialogue(
    buildCassBoardPrompt(input),
    input.messages,
    (text) => aiCassBoardDialogueSchema.parse(safeJsonParse(extractJsonObject(text))),
  );
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
}) {
  return runJsonDialogue(
    buildChapterPlannerPrompt(input),
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

  return cassOnboardingDialogueSchema.parse(safeJsonParse(extractJsonObject(rawText)));
}

export async function runCassChapterKickoffDialogue(input: {
  messages: StrategicDialogueMessage[];
  projectName: string;
  northStar?: string | null;
  projectGoal?: string | null;
  chapterNumber: number;
  chapterName: string;
  previousChapterGoal?: string | null;
  prefill?: {
    goal?: string | null;
    value?: string | null;
    measure?: string | null;
    done?: string | null;
  } | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildCassChapterKickoffPrompt(input);

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

  if (!toolUse?.input) {
    throw new Error("Cass chapter kickoff did not return a tool call.");
  }

  return aiKickoffDialogueSchema.parse(toolUse.input);
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
  };
  completedTasks: Array<{ title: string; context?: string | null }>;
  incompleteTasks: Array<{ title: string }>;
  standoutCard?: string | null;
}) {
  const apiKey = requireAnthropicKey();
  const systemPrompt = buildCassRetroPrompt(input);

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

  return cassRetroDialogueSchema.parse(safeJsonParse(extractJsonObject(rawText)));
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
