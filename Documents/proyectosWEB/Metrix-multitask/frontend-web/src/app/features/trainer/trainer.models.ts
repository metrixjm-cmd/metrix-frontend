// ── Trainer module models (Sprint 19) ──────────────────────────────────

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface ExamQuestion {
  id: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  correctOptionIndex: number;
  points: number;
}

/** Vista completa del examen — incluye respuestas correctas (solo ADMIN/GERENTE). */
export interface ExamResponse {
  id: string;
  title: string;
  description?: string;
  trainingId?: string;
  storeId: string;
  questions: ExamQuestion[];
  passingScore: number;
  timeLimitMinutes?: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  passRate: number; // 0–100
}

/** Vista del examen para responder — SIN respuestas correctas. */
export interface QuestionForTake {
  id: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  points: number;
}

export interface ExamForTakeResponse {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMinutes?: number;
  questionCount: number;
  questions: QuestionForTake[];
}

export interface QuestionResult {
  questionText: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
  pointsEarned: number;
  pointsMax: number;
}

export interface ExamSubmissionResponse {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  userNumero: string;
  storeId: string;
  score: number;
  passed: boolean;
  passingScore: number;
  timeTakenSeconds?: number;
  submittedAt: string;
  /** Solo presente inmediatamente después de enviar. */
  questionResults?: QuestionResult[];
}

/** DTO para crear un examen. */
export interface CreateExamQuestionDto {
  questionText: string;
  type: QuestionType;
  options: string[];
  correctOptionIndex: number;
  points: number;
}

export interface CreateExamRequest {
  title: string;
  description?: string;
  trainingId?: string;
  storeId: string;
  questions: CreateExamQuestionDto[];
  passingScore: number;
  timeLimitMinutes?: number;
}

export interface SubmitExamRequest {
  answers: number[];
  timeTakenSeconds?: number;
}
