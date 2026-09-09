import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Entrada pública de la app:
 * - Sin sesión → login (`/auth/login`)
 * - Con sesión → dashboard
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree(auth.isAuthenticated() ? ['/dashboard'] : ['/auth/login']);
};
