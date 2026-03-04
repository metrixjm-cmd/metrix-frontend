/** Perfil completo de un colaborador — respuesta de /api/v1/users */
export interface UserProfile {
  id: string;
  nombre: string;
  puesto: string;
  storeId: string;
  turno: string;
  numeroUsuario: string;
  roles: string[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload para crear un colaborador (POST /api/v1/users) */
export interface CreateUserRequest {
  nombre: string;
  puesto: string;
  storeId: string;
  turno: string;
  numeroUsuario: string;
  password: string;
  roles: string[];
}

/** Payload para editar un colaborador (PUT /api/v1/users/{id}) */
export interface UpdateUserRequest {
  nombre?: string;
  puesto?: string;
  turno?: string;
  roles?: string[];
}

export const TURNOS = ['MATUTINO', 'VESPERTINO', 'NOCTURNO'] as const;
export type Turno = typeof TURNOS[number];

export const ROL_LABELS: Record<string, string> = {
  ADMIN:      'Administrador',
  GERENTE:    'Gerente',
  EJECUTADOR: 'Operador',
};

export const ROLES_DISPONIBLES = ['ADMIN', 'GERENTE', 'EJECUTADOR'] as const;
