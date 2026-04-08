export type TrainingStatus = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'NO_COMPLETADA';
export type TrainingLevel  = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
export type MaterialType   = 'PDF' | 'VIDEO' | 'IMAGE' | 'LINK';

// ── Material resuelto dentro de una Training ──────────────────────────────────
export interface TrainingMaterialRef {
  materialId:       string;
  order:            number;
  required:         boolean;
  notes:            string | null;
  viewed:           boolean;
  viewedAt:         string | null;
  // datos del banco
  title:            string;
  description:      string | null;
  type:             MaterialType;
  url:              string;
  originalFileName: string | null;
  fileSizeBytes:    number | null;
  mimeType:         string | null;
  category:         string | null;
  tags:             string[];
}

// ── Resumen de plantilla para selector ───────────────────────────────────────
export interface TrainingTemplateSummary {
  id:           string;
  title:        string;
  description:  string | null;
  category:     string | null;
  level:        TrainingLevel;
  timesUsed:    number;
  durationHours?: number;
  minPassGrade?:  number;
  materials?:   { materialId: string; order: number; required: boolean; notes: string | null }[];
  tags?:        string[];
}

export interface TrainingResponse {
  id: string;
  title: string;
  description: string;
  level: TrainingLevel;
  durationHours: number;
  minPassGrade: number;
  assignedUserId: string;
  assignedUserName?: string;
  position: string;
  storeId: string;
  shift: string;
  dueAt: string;
  assignmentGroupId?: string | null;
  // plantilla y materiales
  templateId: string | null;
  materials:  TrainingMaterialRef[];
  category:   string | null;
  tags:       string[];
  // progreso aplanado
  status: TrainingStatus;
  startedAt: string | null;
  completedAt: string | null;
  onTime: boolean | null;
  percentage: number;
  grade: number | null;
  passed: boolean | null;
  comments: string | null;
  // auditoría
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingRequest {
  title: string;
  description: string;
  level: TrainingLevel;
  assignedUserId: string;
  storeId: string;
  shift: string;
  dueAt: string;
  // opcionales
  assignmentGroupId?: string;
  templateId?:  string;
  materialIds?: string[];
  category?:    string;
  tags?:        string[];
}

export interface CreateFromTemplateRequest {
  assignedUserId: string;
  storeId:        string;
  shift:          string;
  dueAt:          string;
  assignmentGroupId?: string;
}

export interface UpdateTrainingRequest {
  title: string;
  description: string;
  level: TrainingLevel;
  storeId: string;
  shift: string;
  dueAt: string;
}

export interface UpdateTrainingProgressRequest {
  newStatus: TrainingStatus;
  percentage?: number;
  grade?: number;
  comments?: string;
}

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  PROGRAMADA:    'Programada',
  EN_CURSO:      'En Curso',
  COMPLETADA:    'Completada',
  NO_COMPLETADA: 'No Completada',
};

export const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  BASICO:      'Básico',
  INTERMEDIO:  'Intermedio',
  AVANZADO:    'Avanzado',
};

export const TRAINING_LEVELS: TrainingLevel[] = ['BASICO', 'INTERMEDIO', 'AVANZADO'];

export const MATERIAL_TYPE_ICONS: Record<MaterialType, string> = {
  PDF:   '📄',
  VIDEO: '🎬',
  IMAGE: '🖼',
  LINK:  '🔗',
};

export const MATERIAL_TYPE_COLORS: Record<MaterialType, string> = {
  PDF:   'bg-red-100 text-red-700',
  VIDEO: 'bg-purple-100 text-purple-700',
  IMAGE: 'bg-blue-100 text-blue-700',
  LINK:  'bg-teal-100 text-teal-700',
};
