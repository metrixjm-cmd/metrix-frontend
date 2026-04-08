import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';
import { MetrixRole } from '../../features/auth/models/auth.models';

/**
 * Fuente única de permisos UI por rol.
 *
 * En lugar de que cada componente re-implemente:
 *   `isAdmin = computed(() => authSvc.hasRole('ADMIN'))`
 * todos inyectan RoleContext y consumen signals pre-computados.
 *
 * Reglas canónicas:
 * - ADMIN → ve todo, asigna a GERENTE
 * - GERENTE → ve su sucursal, asigna a EJECUTADOR
 * - EJECUTADOR → ve solo lo suyo, no asigna
 */
@Injectable({ providedIn: 'root' })
export class RoleContext {
  private readonly auth = inject(AuthService);

  // ── Roles base ──────────────────────────────────────────────────────
  readonly isAdmin      = computed(() => this.auth.hasRole('ADMIN'));
  readonly isGerente    = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isOnlyGerente = computed(() => this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'));
  readonly isEjecutador = computed(() => !this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  // ── Permisos de negocio ─────────────────────────────────────────────
  readonly canAssign       = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly canCreateTraining = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly canViewKpi      = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly canManageRh     = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  /** Rol al que puede asignar el usuario actual. null si no puede asignar. */
  readonly targetRole = computed((): MetrixRole | null => {
    if (this.auth.hasRole('ADMIN')) return 'GERENTE';
    if (this.auth.hasRole('GERENTE')) return 'EJECUTADOR';
    return null;
  });

  /** storeId del usuario actual. */
  readonly currentStoreId = computed(() => this.auth.currentUser()?.storeId ?? null);

  /** numeroUsuario del usuario actual. */
  readonly currentNumeroUsuario = computed(() => this.auth.currentUser()?.numeroUsuario ?? null);
}
