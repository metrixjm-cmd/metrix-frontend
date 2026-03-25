// ── Trainer module models (Sprint 19 + E2) ─────────────────────────────

export type QuestionType =
  | 'MULTIPLE_CHOICE'  // radio — 1 correcta
  | 'TRUE_FALSE'       // radio — Verdadero / Falso
  | 'MULTI_SELECT'     // checkboxes — N correctas
  | 'OPEN_TEXT';       // textarea — keyword matching

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Opción múltiple',
  TRUE_FALSE:      'Verdadero / Falso',
  MULTI_SELECT:    'Selección múltiple',
  OPEN_TEXT:       'Respuesta abierta',
};

/** Respuesta unificada por pregunta para SubmitExamRequest. */
export interface ExamAnswer {
  selectedIndex?:   number;    // MULTIPLE_CHOICE, TRUE_FALSE
  selectedIndexes?: number[];  // MULTI_SELECT
  textAnswer?:      string;    // OPEN_TEXT
}

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
  maxAttempts: number;
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
  maxAttempts: number;
  questionCount: number;
  questions: QuestionForTake[];
}

export interface AttemptInfo {
  attemptCount: number;
  maxAttempts:  number;
  canAttempt:   boolean;
  remainingAttempts: number; // -1 = ilimitado
}

export interface QuestionResult {
  questionText:     string;
  type:             QuestionType;
  options:          string[];
  // MULTIPLE_CHOICE / TRUE_FALSE
  selectedIndex:    number;
  correctIndex:     number;
  // MULTI_SELECT
  selectedIndexes?: number[];
  correctIndexes?:  number[];
  // OPEN_TEXT
  textAnswer?:      string;
  acceptedKeywords?: string[];
  pendingReview?:   boolean;
  // Comunes
  correct:          boolean;
  pointsEarned:     number;
  pointsMax:        number;
  explanation?:     string;
}

export interface ExamSubmissionResponse {
  id:               string;
  examId:           string;
  examTitle:        string;
  userName:         string;
  userNumero:       string;
  storeId:          string;
  score:            number;
  passed:           boolean;
  passingScore:     number;
  hasPendingReview: boolean;
  reviewed:         boolean;
  fraudFlags:       string[];
  timeTakenSeconds?: number;
  submittedAt:      string;
  questionResults?: QuestionResult[];
}

export interface ReviewOpenTextItem {
  questionIndex: number;
  approved: boolean;
}

export interface ReviewOpenTextRequest {
  reviews: ReviewOpenTextItem[];
}

export interface ScoreRange {
  label:      string;
  count:      number;
  percentage: number;
}

export interface QuestionFailRate {
  questionIndex: number;
  questionText:  string;
  failCount:     number;
  totalCount:    number;
  failRate:      number;
}

export interface ExamStats {
  examId:           string;
  examTitle:        string;
  totalSubmissions: number;
  passedCount:      number;
  passRate:         number;
  avgScore:         number;
  minScore:         number;
  maxScore:         number;
  range0_49:        ScoreRange;
  range50_69:       ScoreRange;
  range70_89:       ScoreRange;
  range90_100:      ScoreRange;
  avgTimeSecs:      number;
  minTimeSecs:      number;
  maxTimeSecs:      number;
  pendingReviewCount: number;
  questionFailRates: QuestionFailRate[];
}

/** DTO para crear un examen. */
export interface CreateExamQuestionDto {
  questionText:         string;
  type:                 QuestionType;
  options?:             string[];
  correctOptionIndex?:  number;
  correctOptionIndexes?: number[];
  acceptedKeywords?:    string[];
  explanation?:         string;
  points:               number;
}

export interface CreateExamRequest {
  title: string;
  description?: string;
  trainingId?: string;
  storeId: string;
  questions: CreateExamQuestionDto[];
  passingScore: number;
  timeLimitMinutes?: number;
  maxAttempts?: number;
}

export interface SubmitExamRequest {
  answers: ExamAnswer[];
  timeTakenSeconds?: number;
}

// ── Banco de preguntas ─────────────────────────────────────────────────────

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  EASY:   'Fácil',
  MEDIUM: 'Medio',
  HARD:   'Difícil',
};

export const DIFFICULTY_COLORS: Record<QuestionDifficulty, string> = {
  EASY:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HARD:   'bg-red-50 text-red-700 border-red-200',
};

export interface BankQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndexes: number[];
  acceptedKeywords: string[];
  explanation?: string;
  points: number;
  category?: string;
  difficulty: QuestionDifficulty;
  tags: string[];
  creatorName: string;
  storeId?: string;
  usageCount: number;
}

// ── Plantillas de examen ───────────────────────────────────────────────────

export interface ExamTemplateSummary {
  id: string;
  title: string;
  description?: string;
  category?: string;
  passingScore: number;
  timeLimitMinutes?: number;
  questionCount: number;
  tags: string[];
  timesUsed: number;
}

export interface ExamTemplateQuestionResponse {
  questionId: string;
  order: number;
  pointsOverride: number;
  question: BankQuestion;
}

export interface ExamTemplateDetail {
  id: string;
  title: string;
  description?: string;
  category?: string;
  passingScore: number;
  timeLimitMinutes?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  questions: ExamTemplateQuestionResponse[];
  tags: string[];
  timesUsed: number;
}

export interface CreateFromTemplateRequest {
  storeId: string;
  passingScore?: number;
  timeLimitMinutes?: number;
}

// ── Requests de creación ───────────────────────────────────────────────────

export interface CreateBankQuestionRequest {
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctOptionIndex?: number;
  correctOptionIndexes?: number[];
  acceptedKeywords?: string[];
  explanation?: string;
  points: number;
  category?: string;
  difficulty: QuestionDifficulty;
  tags?: string[];
  storeId?: string;
}

export interface ExamTemplateQuestionRequest {
  questionId: string;
  order: number;
  pointsOverride?: number;
}

export interface CreateExamTemplateRequest {
  title: string;
  description?: string;
  category?: string;
  passingScore: number;
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number;
  questions: ExamTemplateQuestionRequest[];
  tags?: string[];
  storeId?: string;
}
