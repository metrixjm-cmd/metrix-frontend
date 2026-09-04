import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Entrada pública de la app:
 * - Sin sesión → catálogo de planes (`/productos`)
 * - Con sesión → dashboard
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree(auth.isAuthenticated() ? ['/dashboard'] : ['/productos']);
};
