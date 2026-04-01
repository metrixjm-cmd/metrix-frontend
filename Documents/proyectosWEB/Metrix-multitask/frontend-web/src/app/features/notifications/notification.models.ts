// ── Tipos ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_REOPENED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_IN_RESOLUTION'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_REOPENED'
  | 'TASK_DEADLINE_WARNING'
  | 'TASK_OVERDUE'
  | 'DAILY_IGEO_ALERT';

export type NotificationSeverity = 'critical' | 'warning' | 'info';

// ── Payload del backend (JSON dentro del campo data del evento SSE) ───────────

export interface NotificationEvent {
  id:        string;
  type:      NotificationType;
  severity:  NotificationSeverity;
  title:     string;
  body:      string;
  taskId:     string | null;
  incidentId: string | null;
  storeId:    string;
  timestamp: string; // ISO-8601
}

// ── Modelo de UI (agrega campo local `read`) ──────────────────────────────────

export interface AppNotification extends NotificationEvent {
  read:     boolean;
  timeAgo:  string; // texto relativo calculado en el servicio
}
