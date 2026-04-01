/** Payload enviado al endpoint POST /auth/login */
export interface LoginRequest {
  numeroUsuario: string;
  password:      string;
}

/**
 * Respuesta del backend METRIX tras autenticación exitosa.
 * Contiene el JWT más claims opcionales para evitar una petición extra al /me.
 */
export interface AuthResponse {
  token:         string;
  numeroUsuario: string;
  nombre:        string;
  storeId:       string;
  turno:         string;
  roles:         string[];
}

/**
 * Representación del usuario en sesión, almacenada en localStorage
 * y expuesta vía Signal desde AuthService.
 */
export interface CurrentUser {
  nombre:        string;
  numeroUsuario: string;
  storeId:       string;
  turno:         string;
  roles:         string[];
}

/** Roles disponibles en METRIX (deben coincidir con el enum Role del backend). */
export type MetrixRole = 'ADMIN' | 'GERENTE' | 'EJECUTADOR';
