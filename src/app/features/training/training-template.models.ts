import { TrainingLevel } from './training.models';

// ── Material resuelto dentro de una plantilla ─────────────────────────────────
export interface TemplateMaterialItem {
  materialId:       string;
  order:            number;
  required:         boolean;
  notes:            string | null;
  // datos resueltos del banco
  title:            string;
  description:      string | null;
  type:             'PDF' | 'VIDEO' | 'IMAGE' | 'LINK';
  url:              string;
  originalFileName: string | null;
  fileSizeBytes:    number | null;
  mimeType:         string | null;
  category:         string | null;
  tags:             string[];
}

// ── Plantilla completa (GET /{id}) ────────────────────────────────────────────
export interface TrainingTemplate {
  id:           string;
  version:      number;
  title:        string;
  description:  string | null;
  category:     string | null;
  level:        TrainingLevel;
  durationHours: number;
  minPassGrade:  number;
  materials:    TemplateMaterialItem[];
  tags:         string[];
  createdBy:    string;
  creatorName:  string;
  timesUsed:    number;
  createdAt:    string;
  updatedAt:    string;
}

// ── Page de plantillas ────────────────────────────────────────────────────────
export interface TemplatePage {
  content:       TrainingTemplate[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}

// ── Request de material dentro de la plantilla ────────────────────────────────
export interface TemplateMaterialRequest {
  materialId: string;
  order:      number;
  required:   boolean;
  notes:      string;
}

// ── Request de creación/actualización ────────────────────────────────────────
export interface CreateTrainingTemplateRequest {
  title:         string;
  description:   string;
  category:      string;
  level:         TrainingLevel;
  durationHours: number;
  minPassGrade:  number;
  materials:     TemplateMaterialRequest[];
  tags:          string[];
}
