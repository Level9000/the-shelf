// One-off script: scan existing board_conversations history for raw material
// (stray realizations, customer comments, doubts, backstory) that never made
// it into a task or a chapter, and save it as story_fragments rows.
//
// This is the retroactive half of fragment capture — the forward-looking half
// runs automatically now whenever a board conversation is saved (see
// extractFragmentFromConversation, wired into saveBoardConversationAction).
//
// Idempotent by board: skips any board that already has at least one
// story_fragments row with source = "board_conversation", so it's safe to
// re-run if it gets interrupted partway through.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... ANTHROPIC_API_KEY=... \
//     node scripts/backfill-board-fragments.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
      }
    }
  } catch {
    // file not found — fine, env may already be set
  }
}

loadEnvFile(new URL("../.env", import.meta.url));
loadEnvFile(new URL("../.env.local", import.meta.url));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function formatTranscript(messages) {
  return messages.map((m) => `${m.role === "user" ? "Founder" : "Cass"}: ${m.content}`).join("\n");
}

function buildPrompt(transcript) {
  return [
    "You are scanning a conversation transcript between a founder and Cass (an AI assistant) for raw material",
    "worth keeping that isn't already captured elsewhere as a task.",
    "",
    "Look for: stray realizations, customer comments or quotes, doubts, backstory, a detail that matters but",
    "doesn't belong on a task list. Things a founder would be glad weren't lost.",
    "",
    "Do NOT extract: task logistics, scheduling chatter, the tasks themselves, generic acknowledgements,",
    "or anything that's purely about what to build next. The board already captures that.",
    "",
    "Most conversations have nothing worth extracting. That's the expected, normal result. Only flag something",
    "if it's genuinely there, specific, and would be lost otherwise. When in doubt, return hasFragment: false.",
    "",
    "If you do find something, write it in the founder's own words and voice, not a paraphrase that loses specifics.",
    "",
    'Return a JSON object with exactly this shape: {"hasFragment": boolean, "fragment": "..."}',
    'If nothing qualifies, return {"hasFragment": false, "fragment": ""}.',
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return '{"hasFragment": false, "fragment": ""}';
  return text.slice(start, end + 1);
}

async function extractFragment(transcript) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: buildPrompt(transcript),
      messages: [{ role: "user", content: "Scan the transcript above for anything worth keeping." }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${await response.text()}`);
  }

  const payload = await response.json();
  const text = payload.content?.find((b) => b.type === "text")?.text;
  if (!text) return { hasFragment: false, fragment: "" };

  try {
    return JSON.parse(extractJsonObject(text));
  } catch {
    return { hasFragment: false, fragment: "" };
  }
}

async function main() {
  const { data: boards, error: boardsError } = await supabase
    .from("boards")
    .select("id, project_id, board_conversations")
    .not("board_conversations", "is", null);

  if (boardsError) {
    console.error("Failed to load boards:", boardsError.message);
    process.exit(1);
  }

  const candidateBoards = (boards ?? []).filter(
    (b) => Array.isArray(b.board_conversations) && b.board_conversations.length > 0,
  );

  console.log(`Found ${candidateBoards.length} board(s) with conversation history.`);

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, user_id");

  if (projectsError) {
    console.error("Failed to load projects:", projectsError.message);
    process.exit(1);
  }

  const userIdByProject = new Map((projects ?? []).map((p) => [p.id, p.user_id]));

  let savedCount = 0;
  let skippedCount = 0;

  for (const board of candidateBoards) {
    const { data: existing } = await supabase
      .from("story_fragments")
      .select("id")
      .eq("chapter_id", board.id)
      .eq("source", "board_conversation")
      .limit(1);

    if (existing && existing.length > 0) {
      skippedCount++;
      continue;
    }

    const userId = userIdByProject.get(board.project_id);
    if (!userId) continue;

    for (const entry of board.board_conversations) {
      const messages = entry.messages ?? [];
      const transcript = formatTranscript(messages);
      if (!transcript.trim()) continue;

      try {
        const result = await extractFragment(transcript);
        if (!result.hasFragment || !result.fragment?.trim()) continue;

        const { error: insertError } = await supabase.from("story_fragments").insert({
          user_id: userId,
          project_id: board.project_id,
          chapter_id: board.id,
          source: "board_conversation",
          content: result.fragment,
          conversation: messages,
        });

        if (insertError) {
          console.error(`Failed to save fragment for board ${board.id}:`, insertError.message);
        } else {
          savedCount++;
          console.log(`Saved fragment for board ${board.id}: "${result.fragment.slice(0, 80)}..."`);
        }
      } catch (err) {
        console.error(`Extraction failed for board ${board.id}:`, err.message);
      }
    }
  }

  console.log(`\nDone. Saved ${savedCount} fragment(s). Skipped ${skippedCount} already-backfilled board(s).`);
}

main();
