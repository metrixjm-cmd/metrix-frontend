import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Guard funcional de autenticación (Angular 17+ functional guard API).
 *
 * - Si el usuario tiene sesión activa → permite navegación.
 * - Si no está autenticado → redirige a /auth/login preservando la URL
 *   intentada en el query param `returnUrl` para post-login redirect.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
