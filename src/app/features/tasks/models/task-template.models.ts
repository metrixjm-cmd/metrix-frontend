/** Paso de proceso dentro de una plantilla de tarea */
export interface TaskTemplateStep {
  title: string;
  description?: string;
  tags?: string[];
  order?: number;
}

/**
 * Plantilla de tarea proveniente del Banco de Tareas.
 * Mapea directamente el `TaskTemplateResponse` del backend.
 */
export interface TaskTemplateEntry {
  id: string;
  title: string;
  description: string;
  /** Valor de categoría del catálogo CATEGORIA (ej. "LIMPIEZA"). */
  category: string;
  steps: TaskTemplateStep[];
  timesUsed: number;
  creatorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload para crear o actualizar una plantilla */
export interface TaskTemplateRequest {
  title: string;
  description: string;
  category: string;
  steps: TaskTemplateStep[];
}
