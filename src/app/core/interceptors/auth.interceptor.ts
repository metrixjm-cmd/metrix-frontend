import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Interceptor funcional JWT (Angular 17+ HttpInterceptorFn).
 *
 * Adjunta el header `Authorization: Bearer {token}` a toda petición saliente.
 * Si no hay token (usuario no autenticado), la request pasa sin modificar.
 * Esto cubre automáticamente todos los endpoints protegidos del backend METRIX.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No adjuntar token a rutas de autenticación (evita 403 por token expirado)
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = inject(AuthService).getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
