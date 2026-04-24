export type Priority = "low" | "medium" | "high" | null;

export type VoiceCaptureStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed";

export type AppUser = {
  id: string;
  email: string | null;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  createdAt: string;
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
  priority: Priority;
  dueDate: string | null;
  position: number;
  sourceVoiceCaptureId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sourceTranscript: string | null;
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
  suggestedColumn: string;
  priority: Priority;
  dueDate: string | null;
  confidence: number;
};

export type BoardSnapshot = {
  project: Project;
  board: Board;
  columns: BoardColumn[];
  tasks: Task[];
  voiceCaptures: VoiceCapture[];
};

export type ProjectWithChapters = Project & {
  chapters: Chapter[];
};
