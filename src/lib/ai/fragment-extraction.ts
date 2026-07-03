import type { SupabaseClient } from "@supabase/supabase-js";
import { extractFragmentFromTranscript } from "@/lib/ai/anthropic";

export interface ConversationMessage {
  role: string;
  content: string;
}

function formatTranscript(messages: ConversationMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Author" : "Cass"}: ${m.content}`)
    .join("\n");
}

/**
 * Scans a finished conversation for raw material that isn't already captured as a task,
 * and saves it as a story_fragments row if something genuine turns up. Used both as a
 * standing hook (every time a board conversation is saved) and for one-time backfills
 * over existing conversation history.
 */
export async function extractFragmentFromConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: {
    userId: string;
    projectId: string;
    chapterId: string | null;
    source: string;
    messages: ConversationMessage[];
  },
): Promise<{ saved: boolean }> {
  const transcript = formatTranscript(input.messages);
  if (!transcript.trim()) return { saved: false };

  const result = await extractFragmentFromTranscript({ transcript });
  if (!result.hasFragment || !result.fragment.trim()) return { saved: false };

  const { error } = await supabase.from("story_fragments").insert({
    user_id: input.userId,
    project_id: input.projectId,
    chapter_id: input.chapterId,
    source: input.source,
    content: result.fragment,
    conversation: input.messages,
  });

  if (error) {
    console.error("extractFragmentFromConversation: failed to save fragment", error);
    return { saved: false };
  }

  return { saved: true };
}
