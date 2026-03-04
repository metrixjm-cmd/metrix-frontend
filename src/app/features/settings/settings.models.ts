/** Respuesta de la API de sucursales — incluye stats calculados */
export interface StoreResponse {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  turnos: string[];
  activo: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  totalUsers: number;
  totalTasks: number;
  totalTrainings: number;
}

/** Payload para crear una sucursal (POST /api/v1/stores) */
export interface CreateStoreRequest {
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  turnos?: string[];
}

/** Payload para editar una sucursal (PUT /api/v1/stores/{id}) */
export interface UpdateStoreRequest {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  turnos?: string[];
}

export const TURNOS_DISPONIBLES = ['MATUTINO', 'VESPERTINO', 'NOCTURNO'] as const;
export type TurnoDisponible = typeof TURNOS_DISPONIBLES[number];
