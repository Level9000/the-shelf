export type Priority = "low" | "medium" | "high" | null;

export type VoiceCaptureStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed";

export type AppUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type OnboardingDraft = {
  step: number; // 0–4 = which question; 5 = brief review; 6 = chapter plan
  journeyStage: string; // "origin" | "midjourney" | "retrospective" | custom text
  wantPrelude: boolean; // user opted to add a Prelude chapter
  answers: {
    project_goal: string;
    north_star: string;
    project_audience: string;
    project_success: string;
    project_biggest_risk: string;
  };
  project_name: string;
  proposed_chapters: Array<{
    chapter_number: number;
    title: string;
    goal: string;
    prefill?: { goal: string; value: string; measure: string; done: string } | null;
  }>;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  updatedAt: string;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  onboardingDraft: OnboardingDraft | null;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  goal: string | null;
  whyItMatters: string | null;
  successLooksLike: string | null;
  doneDefinition: string | null;
  northStar: string | null;
  projectGoal: string | null;
  projectAudience: string | null;
  projectSuccess: string | null;
  projectBiggestRisk: string | null;
  projectKickoffConversation: Array<{ role: string; content: string }> | null;
  projectKickoffCompletedAt: string | null;
  planningConversations: Array<{
    completedAt: string;
    messages: Array<{ role: string; content: string }>;
  }>;
  accumulativeStory: string | null;
  storyUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProposedChapter = {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string;
  goal: string | null;
  accepted: boolean;
  createdAt: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  email: string;
  displayName: string | null;
  invitedBy: string | null;
  role: "owner" | "author" | "contributor";
  createdAt: string;
};

export type BoardConversationEntry = {
  id: string;
  mode: "tasks" | "braindump" | "breakup";
  label: string;
  completedAt: string;
  messages: Array<{ role: string; content: string }>;
  taskCount: number;
};

export type Board = {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  whyItMatters: string | null;
  successLooksLike: string | null;
  doneDefinition: string | null;
  openingLine: string | null;
  kickoffCompletedAt: string | null;
  kickoffPrefilledAt: string | null;
  kickoffConversation: Array<{ role: string; content: string }> | null;
  retroConversation: Array<{ role: string; content: string }> | null;
  chapterStory: string | null;
  storyLength: "short" | "long" | null;
  retroCompletedAt: string | null;
  sharedAt: string | null;
  shareSlug: string | null;
  position: number;
  createdAt: string;
  boardConversations: BoardConversationEntry[];
  confirmedThesis: string | null;
  kickoffBeats: Record<string, unknown> | null;
};

export type Chapter = Board;

export type BoardColumn = {
  id: string;
  boardId: string;
  name: string;
  position: number;
};

export type Task = {
  id: string;
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeName: string | null;
  priority: Priority;
  dueDate: string | null;
  position: number;
  sourceVoiceCaptureId: string | null;
  sourceTemplateId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sourceTranscript: string | null;
  context: string | null;
  rawQuote: string | null;
  createdVia: "form" | "brain_dump" | "voice" | "ai_suggestion" | "template" | null;
};

export type VoiceCapture = {
  id: string;
  userId: string;
  projectId: string;
  audioPath: string | null;
  transcript: string | null;
  aiParsedJson: { tasks: ProposedTask[] } | null;
  status: VoiceCaptureStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type ProposedTask = {
  id: string;
  title: string;
  description: string;
  assigneeName?: string | null;
  suggestedColumn: string;
  priority: Priority;
  dueDate: string | null;
  confidence: number;
};

export type WorkflowTemplateStep = {
  id: string;
  templateId: string;
  position: number;
  title: string;
  description: string;
  suggestedColumn: string;
  priority: Priority;
  dueDate: string | null;
};

export type WorkflowTemplate = {
  id: string;
  userId: string;
  name: string;
  triggerPhrase: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowTemplateStep[];
};

export type BoardSnapshot = {
  currentUser: AppUser;
  project: Project;
  projectMembers: ProjectMember[];
  board: Board;
  columns: BoardColumn[];
  tasks: Task[];
  voiceCaptures: VoiceCapture[];
  workflowTemplates: WorkflowTemplate[];
};

export type ProjectWithChapters = Project & {
  chapters: Chapter[];
};
