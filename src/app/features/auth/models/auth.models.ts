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
  storeName:     string;
  turno:         string;
  roles:         string[];
  platformAdmin?: boolean;
  databaseName?: string;
  instanceId?:    string;
  /** null/omitido = sin restricción; [] = plan sin módulos premium */
  licensedFeatures?: string[] | null;
}

/**
 * Representación del usuario en sesión, almacenada en localStorage
 * y expuesta vía Signal desde AuthService.
 */
export interface CurrentUser {
  nombre:        string;
  numeroUsuario: string;
  storeId:       string;
  storeName:     string;
  turno:         string;
  roles:         string[];
  platformAdmin?: boolean;
  databaseName?: string;
  instanceId?:    string;
  licensedFeatures?: string[] | null;
}

/** Roles disponibles en METRIX (deben coincidir con el enum Role del backend). */
export type MetrixRole = 'ADMIN' | 'GERENTE' | 'EJECUTADOR';
