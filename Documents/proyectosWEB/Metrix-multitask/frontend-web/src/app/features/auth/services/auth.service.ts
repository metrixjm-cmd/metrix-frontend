import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthResponse, CurrentUser, LoginRequest, MetrixRole } from '../models/auth.models';

const TOKEN_KEY = 'metrix_token';
const USER_KEY  = 'metrix_user';

/**
 * Servicio de autenticación para METRIX.
 *
 * - Gestiona la sesión JWT (localStorage).
 * - Expone estado reactivo via Signals para que los componentes lean
 *   el usuario actual sin suscripciones manuales.
 * - El AuthInterceptor consume getToken() para inyectar el Bearer header.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // ── Estado reactivo (Signal API de Angular 17+) ──────────────────────
  private readonly _user = signal<CurrentUser | null>(this.loadFromStorage());

  /** Usuario en sesión. null si no hay sesión activa. */
  readonly currentUser = this._user.asReadonly();

  /** true si existe una sesión con token válido en localStorage. */
  readonly isAuthenticated = computed(() => this._user() !== null);

  // ── Acciones ─────────────────────────────────────────────────────────

  /**
   * Autentica contra el backend METRIX.
   * Almacena el JWT y los datos del usuario en localStorage.
   * Actualiza el signal _user para que todos los consumidores reaccionen.
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.persistSession(response);
          this._user.set({
            nombre:        response.nombre,
            numeroUsuario: response.numeroUsuario,
            storeId:       response.storeId,
            turno:         response.turno,
            roles:         response.roles,
          });
        }),
      );
  }

  /**
   * Cierra la sesión: limpia localStorage, resetea el signal y
   * redirige al login.
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  // ── Helpers de consulta ──────────────────────────────────────────────

  /** Devuelve el JWT almacenado o null si no hay sesión. */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Verifica si el usuario tiene un rol específico. */
  hasRole(role: MetrixRole): boolean {
    return this._user()?.roles?.includes(role) ?? false;
  }

  /** Verifica si el usuario tiene alguno de los roles indicados. */
  hasAnyRole(...roles: MetrixRole[]): boolean {
    const userRoles = this._user()?.roles ?? [];
    return roles.some(r => userRoles.includes(r));
  }

  // ── Persistencia ─────────────────────────────────────────────────────

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    const user: CurrentUser = {
      nombre:        response.nombre,
      numeroUsuario: response.numeroUsuario,
      storeId:       response.storeId,
      turno:         response.turno,
      roles:         response.roles,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Intenta recuperar la sesión de localStorage al iniciar la app.
   * Si no existe token o el JSON es inválido, devuelve null.
   */
  private loadFromStorage(): CurrentUser | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;

    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}
