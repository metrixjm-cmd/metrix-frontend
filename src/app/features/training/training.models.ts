export type TrainingStatus = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'NO_COMPLETADA';
export type TrainingLevel  = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';

export interface TrainingResponse {
  id: string;
  title: string;
  description: string;
  level: TrainingLevel;
  durationHours: number;
  minPassGrade: number;
  assignedUserId: string;
  position: string;
  storeId: string;
  shift: string;
  dueAt: string;
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
  durationHours: number;
  minPassGrade: number;
  assignedUserId: string;
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
