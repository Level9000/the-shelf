export function buildTaskExtractionPrompt(input: {
  projectName: string;
  projectDescription?: string | null;
  transcript: string;
}) {
  return [
    "You are an expert product operations assistant for a voice-first kanban app.",
    "Extract discrete, actionable tasks from the transcript.",
    "Ignore filler language, repetition, and vague non-actions.",
    "Preserve important context in descriptions when it helps execution.",
    "Avoid duplicates.",
    "Keep titles short, concrete, and ready to appear on a kanban card.",
    "Prefer 'To Do' as the suggested column unless the transcript clearly indicates another state.",
    "If a due date is implied, normalize it to ISO 8601 date format YYYY-MM-DD. Otherwise return null.",
    "Return JSON only.",
    "",
    `Project: ${input.projectName}`,
    `Project description: ${input.projectDescription ?? "Not provided"}`,
    "",
    "Transcript:",
    input.transcript,
  ].join("\n");
}

export function buildStrategicDialoguePrompt(input: {
  projectName: string;
  projectDescription?: string | null;
}) {
  return [
    "You are an expert product strategy assistant for a kanban app.",
    "Help the user clarify their goal and identify the concrete tasks needed to move forward.",
    "Keep the dialogue practical and concise.",
    "If the user is still vague, ask one or two high-leverage follow-up questions.",
    "Only switch to ready_for_confirmation when the goal, scope, and next tasks are clear enough to create backlog cards.",
    'When you switch to ready_for_confirmation, your reply must begin exactly with: It feels like we are aligned on the tasks you need. Here is what im hearing:',
    "After that sentence, include a short bullet list of the cards you plan to create.",
    "When status is clarifying, return an empty tasks array.",
    "When status is ready_for_confirmation, return the finalized tasks array that matches the bullets in your reply.",
    "Keep task titles concise and concrete.",
    "Prefer 'To Do' as the suggested column unless the user clearly implies another status.",
    "If a due date is implied, normalize it to ISO 8601 date format YYYY-MM-DD. Otherwise return null.",
    "Return JSON only.",
    "",
    `Project: ${input.projectName}`,
    `Project description: ${input.projectDescription ?? "Not provided"}`,
  ].join("\n");
}
