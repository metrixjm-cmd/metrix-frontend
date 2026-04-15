/** Paso de proceso dentro del catalogo de categorias para tareas. */
export interface TaskCategoriaStep {
  title: string;
  description?: string;
  tags?: string[];
  order?: number;
}

/** Contenido multimedia opcional asociado a una categoria/tarea de catalogo. */
export interface TaskCategoriaMedia {
  type: 'IMAGE' | 'VIDEO' | 'LINK' | string;
  url: string;
  title?: string;
  description?: string;
}

/**
 * Entrada enriquecida proveniente de /api/v1/categorias.
 * Se usa para prellenar /tasks/create desde Banco de Informacion > categorias.
 */
export interface TaskCategoriaEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: TaskCategoriaStep[];
  media?: TaskCategoriaMedia[];
  timesUsed: number;
  creatorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload para crear o actualizar una entrada enriquecida de categorias. */
export interface TaskCategoriaRequest {
  title: string;
  description: string;
  category: string;
  steps: TaskCategoriaStep[];
  media?: TaskCategoriaMedia[];
}
