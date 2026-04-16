// ── Enumeraciones ────────────────────────────────────────────────────────────

export type TaskStatus   = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
/** Ahora dinámico vía catálogo — se mantiene el alias por compatibilidad */
export type TaskCategory = string;
export type TaskShift    = 'MATUTINO' | 'VESPERTINO' | 'NOCTURNO';
export type WeekDay      = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

export const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'LUN', label: 'Lunes' },
  { value: 'MAR', label: 'Martes' },
  { value: 'MIE', label: 'Miércoles' },
  { value: 'JUE', label: 'Jueves' },
  { value: 'VIE', label: 'Viernes' },
  { value: 'SAB', label: 'Sábado' },
  { value: 'DOM', label: 'Domingo' },
];

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

  processes:          ProcessStepResponse[];

  isRecurring:        boolean;
  recurrenceDays:     string[];
  recurrenceStartTime: string | null;
  recurrenceEndTime:   string | null;

  createdBy: string;
  createdAt: string;
}

// ── Procesos (checklist por tags) ────────────────────────────────────────────

export interface ProcessStepResponse {
  stepId:      string;
  title:       string;
  description: string | null;
  tags:        string[];
  completed:   boolean;
  completedAt: string | null;
  notes:       string | null;
  order:       number;
}

export interface ProcessStepRequest {
  title:       string;
  description?: string;
  tags:        string[];
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
  storeId:      string;
  shift:        TaskShift;
  dueAt:        string; // ISO-8601

  processes?:           ProcessStepRequest[];

  isRecurring?:         boolean;
  recurrenceDays?:      string[];
  recurrenceStartTime?: string;
  recurrenceEndTime?:   string;
}

// ── Request: Actualizar status ───────────────────────────────────────────────

export interface UpdateStatusRequest {
  newStatus:     TaskStatus;
  comments?:     string;    // Requerido en FAILED
}

// ── Helpers de UI ────────────────────────────────────────────────────────────

/** Labels conocidos — categorías dinámicas del catálogo se muestran tal cual */
export const CATEGORY_LABELS: Record<string, string> = {
  OPERACIONES:  'Operaciones',
  RH:           'Capital Humano',
  CAPACITACION: 'Capacitación',
};

export const SHIFT_LABELS: Record<TaskShift, string> = {
  MATUTINO:   'Matutino',
  VESPERTINO: 'Vespertino',
  NOCTURNO:   'Nocturno',
};

export const PROCESS_TAGS = [
  'ADMIN', 'GERENTE', 'EJECUTADOR', 'COCINA', 'CAJA', 'ALMACEN', 'LIMPIEZA', 'SERVICIO', 'QA',
] as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED:   'Completada',
  FAILED:      'Fallida',
};
