// ── Tipos ─────────────────────────────────────────────────────────────────────

export type IncidentStatus   = 'ABIERTA' | 'EN_RESOLUCION' | 'CERRADA';
export type IncidentCategory = 'EQUIPO' | 'INSUMOS' | 'PERSONAL' | 'SEGURIDAD' | 'OPERACION' | 'OTRO';
export type IncidentSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

// ── Response del backend ──────────────────────────────────────────────────────

export interface IncidentResponse {
  id:          string;
  title:       string;
  description: string;
  category:    IncidentCategory;
  severity:    IncidentSeverity;
  taskId:      string | null;

  reporterUserId:   string;
  reporterName:     string;
  reporterPosition: string;
  storeId:          string;
  shift:            string;

  implicados:          string[];
  followUpResponsible: string | null;

  status:           IncidentStatus;
  resolvedByUserId: string | null;
  closedByName:     string | null;
  closedByNumero:   string | null;
  resolutionNotes:  string | null;
  resolvedAt:       string | null;

  evidenceUrls: string[];

  createdAt: string;
  updatedAt: string;
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface CreateIncidentRequest {
  title:               string;
  description:         string;
  category:            IncidentCategory;
  severity:            IncidentSeverity;
  taskId?:             string;
  storeId:             string;
  shift:               string;
  implicados?:         string[];
  followUpResponsible?: string;
}

export interface UpdateIncidentStatusRequest {
  newStatus:        IncidentStatus;
  resolutionNotes?: string;
  closedByName?:    string;
  notes?:           string;
}

// ── Labels de UI ─────────────────────────────────────────────────────────────

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  ABIERTA:       'Abierta',
  EN_RESOLUCION: 'En Resolución',
  CERRADA:       'Cerrada',
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  EQUIPO:    'Equipo',
  INSUMOS:   'Insumos',
  PERSONAL:  'Personal',
  SEGURIDAD: 'Seguridad',
  OPERACION: 'Operación',
  OTRO:      'Otro',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  BAJA:    'Baja',
  MEDIA:   'Media',
  ALTA:    'Alta',
  CRITICA: 'Crítica',
};

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'EQUIPO', 'INSUMOS', 'PERSONAL', 'SEGURIDAD', 'OPERACION', 'OTRO',
];

export const INCIDENT_SEVERITIES: IncidentSeverity[] = [
  'BAJA', 'MEDIA', 'ALTA', 'CRITICA',
];
