// ── Enumeraciones ────────────────────────────────────────────────────────────

export type TaskStatus   = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type TaskCategory = 'OPERACIONES' | 'RH' | 'CAPACITACION';
export type TaskShift    = 'MATUTINO' | 'VESPERTINO' | 'NOCTURNO';

// ── Response del backend ─────────────────────────────────────────────────────

export interface TaskResponse {
  id:          string;
  title:       string;
  description: string;
  category:    TaskCategory;
  isCritical:  boolean;

  assignedToId:   string;
  assignedToName: string;
  position:       string;
  storeId:        string;
  shift:          TaskShift;
  dueAt:          string; // ISO-8601

  status:     TaskStatus;
  startedAt:  string | null;
  finishedAt: string | null;
  onTime:     boolean | null;

  evidenceImages: string[];
  evidenceVideos: string[];

  reworkCount:   number;
  qualityRating: number | null;
  comments:      string | null;

  createdBy: string;
  createdAt: string;
}

// ── Response: Upload de evidencia ────────────────────────────────────────────

export interface EvidenceUploadResponse {
  taskId: string;
  type:   'IMAGE' | 'VIDEO';
  url:    string;
}

// ── Request: Crear tarea ─────────────────────────────────────────────────────

export interface CreateTaskRequest {
  title:       string;
  description: string;
  category:    TaskCategory;
  isCritical:  boolean;

  assignedToId: string;
  position:     string;
  storeId:      string;
  shift:        TaskShift;
  dueAt:        string; // ISO-8601
}

// ── Request: Actualizar status ───────────────────────────────────────────────

export interface UpdateStatusRequest {
  newStatus:     TaskStatus;
  qualityRating?: number;   // Requerido en COMPLETED
  comments?:     string;    // Requerido en FAILED
}

// ── Helpers de UI ────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  OPERACIONES:  'Operaciones',
  RH:           'Recursos Humanos',
  CAPACITACION: 'Capacitación',
};

export const SHIFT_LABELS: Record<TaskShift, string> = {
  MATUTINO:   'Matutino',
  VESPERTINO: 'Vespertino',
  NOCTURNO:   'Nocturno',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED:   'Completada',
  FAILED:      'Fallida',
};
