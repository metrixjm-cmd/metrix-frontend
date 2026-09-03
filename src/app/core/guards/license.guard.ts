import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Exige al menos uno de los módulos del plan (TRAININGS, EXAMS, …).
 * Admin 0 / demo sin instanceId no restringen.
 */
export function licenseGuard(...requiredFeatures: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasAnyLicensedFeature(...requiredFeatures)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
