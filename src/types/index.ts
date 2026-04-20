import { Timestamp } from "firebase/firestore";

export interface Test {
  id: string;
  title: string;
  answerKey: Record<string, string>;
  totalQuestions: number;
  timerMinutes: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Attempt {
  id: string;
  userId: string;
  testId: string;
  answers: Record<string, string>;
  revealedQuestions: string[];
  score: number | null;
  status: "in-progress" | "submitted";
  timerMinutes: number;
  startedAt: Timestamp;
  submittedAt: Timestamp | null;
}
