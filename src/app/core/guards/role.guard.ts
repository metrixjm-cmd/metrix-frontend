import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Guard funcional de rol.
 *
 * Uso en routes:
 *   canActivate: [roleGuard('ADMIN', 'GERENTE')]
 *
 * Si el usuario no tiene ninguno de los roles permitidos → redirige a /dashboard.
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    const userRoles = auth.currentUser()?.roles ?? [];
    const hasRole   = allowedRoles.some(r => userRoles.includes(r));

    if (hasRole) return true;

    return router.createUrlTree(['/dashboard']);
  };
}
