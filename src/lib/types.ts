export type LawKey = "boyle" | "charles" | "gaylussac" | "graham";
export type BlockId = 1 | 2 | 3 | 4;
export type ViewKey = "home" | "student" | "teacher";

export interface Evidence {
  id: string;
  exp: LawKey;
  p: number;
  v: number;
  t: number;
  note: string;
  at: number;
}

export interface Penalty {
  id: string;
  reason: string;
  points: number;
  at: number;
}

export type LogType = "info" | "security" | "teacher" | "answer";

export interface LogEntry {
  id: string;
  type: LogType;
  text: string;
  at: number;
}

export type SoundStatus = "off" | "pending" | "active" | "denied" | "simulated" | "unsupported";

export interface SoundState {
  on: boolean;
  status: SoundStatus;
  db: number;
  peak: number;
  updatedAt: number;
}

export interface TeacherMessage {
  id: string;
  text: string;
  at: number;
  read?: boolean;
}

export interface Session {
  id: string;
  code: string;
  name: string;
  group: string;
  createdAt: number;
  startedAt: number;
  endsAt: number;
  updatedAt: number;
  currentBlock: BlockId;
  unlockedThrough: BlockId;
  teacherUnlocked: boolean;
  finishedAt?: number;
  block1: {
    records: Evidence[];
    laws: Partial<Record<LawKey, LawKey>>;
    conclusion: string;
  };
  block2: {
    answers: Record<string, number>;
    submitted: boolean;
    submittedAt?: number;
  };
  block3: {
    answers: Record<string, string>;
    submitted: boolean;
    submittedAt?: number;
  };
  penalties: Penalty[];
  log: LogEntry[];
  sound: SoundState;
  messages: TeacherMessage[];
  teacherNote?: string;
  isDemo?: boolean;
}

export interface MicCommand {
  on: boolean;
  at: number;
}

export interface ScoreBreakdown {
  block1: number;
  block2: number;
  block3: number;
  penalties: number;
  total: number;
  max: number;
  correctAnswers: number;
}

export interface QuizQuestion {
  id: string;
  competency: string;
  context: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface OpenQuestion {
  id: string;
  title: string;
  context: string;
  prompt: string;
  hint: string;
  minChars: number;
}

export interface LawInfo {
  key: LawKey;
  name: string;
  short: string;
  equation: string;
  condition: string;
  description: string;
  color: string;
  icon: "piston" | "balloon" | "gauge" | "wind";
}
