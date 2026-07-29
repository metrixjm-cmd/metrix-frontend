import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Interceptor de sesión expirada.
 *
 * El JWT de METRIX expira a las 24h (`JWT_EXPIRATION_MS`) y el backend no
 * expone refresh token. Sin este interceptor, un 401 por token vencido deja
 * al usuario con la sesión "activa" en el frontend pero con todas las
 * peticiones fallando en silencio (ver dashboard: "Error cargando KPIs"
 * indefinido hasta que el usuario cierra sesión manualmente).
 *
 * Ante un 401 en una ruta protegida (no `/auth/*`) con sesión activa,
 * fuerza logout + redirect a login con aviso de sesión expirada.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.includes('/auth/') &&
        authService.isAuthenticated()
      ) {
        authService.logout({ sessionExpired: true });
      }
      return throwError(() => err);
    }),
  );
};
