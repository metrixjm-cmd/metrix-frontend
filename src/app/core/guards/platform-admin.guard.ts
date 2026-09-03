import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Solo Admin 0 (platformAdmin). El ADMIN de un restaurante tiene rol ADMIN
 * pero no debe ver /licencias ni /platform.
 */
export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isPlatformAdmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
