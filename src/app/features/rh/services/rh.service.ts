import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CreateUserRequest, UpdateUserRequest, UserProfile } from '../rh.models';
import { AuthService } from '../../auth/services/auth.service';

/**
 * Servicio del módulo RH — Sprint 9.
 * Gestiona el CRUD de colaboradores vía signals (mismo patrón que task.service.ts).
 */
@Injectable({ providedIn: 'root' })
export class RhService {
  private readonly http       = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc    = inject(AuthService);
  private readonly apiUrl     = `${environment.apiUrl}/users`;
  private readonly _scopeUserKey = signal<string | null>(null);

  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _users        = signal<UserProfile[]>([]);
  private readonly _selectedUser = signal<UserProfile | null>(null);
  private readonly _loading      = signal(false);
  private readonly _saving       = signal(false);
  private readonly _error        = signal<string | null>(null);

  readonly users        = this._users.asReadonly();
  readonly selectedUser = this._selectedUser.asReadonly();
  readonly loading      = this._loading.asReadonly();
  readonly saving       = this._saving.asReadonly();
  readonly error        = this._error.asReadonly();

  constructor() {
    effect(() => {
      const key = this.authSvc.currentUser()?.numeroUsuario ?? null;
      if (this._scopeUserKey() === key) return;
      this._scopeUserKey.set(key);
      this.resetSessionState();
    });
  }

  // ── Métodos HTTP ──────────────────────────────────────────────────────────

  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<UserProfile[]>(`${this.apiUrl}/all`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  users => { this._users.set(users); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadUsersByStore(storeId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<UserProfile[]>(`${this.apiUrl}`, { params: { storeId } })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  users => { this._users.set(users); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadUserById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<UserProfile>(`${this.apiUrl}/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  user => { this._selectedUser.set(user); this._loading.set(false); },
        error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  createUser(req: CreateUserRequest): Promise<UserProfile> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<UserProfile>(this.apiUrl, req).subscribe({
        next: user => {
          this._users.update(list => [...list, user]);
          this._saving.set(false);
          resolve(user);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  updateUser(id: string, req: UpdateUserRequest): Promise<UserProfile> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.put<UserProfile>(`${this.apiUrl}/${id}`, req).subscribe({
        next: user => {
          this._selectedUser.set(user);
          this._users.update(list => list.map(u => u.id === id ? user : u));
          this._saving.set(false);
          resolve(user);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  deactivateUser(id: string): Promise<void> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {}).subscribe({
        next: () => {
          this._selectedUser.update(u => u ? { ...u, activo: false } : u);
          this._users.update(list => list.filter(u => u.id !== id));
          this._saving.set(false);
          resolve();
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  deleteUser(id: string): Promise<void> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          this._selectedUser.set(null);
          this._users.update(list => list.filter(u => u.id !== id));
          this._saving.set(false);
          resolve();
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as unknown;
      if (body && typeof body === 'object') {
        const payload = body as { error?: string; message?: string; details?: Record<string, string> };
        if (payload.error) return payload.error;
        if (payload.message) return payload.message;
        if (payload.details) {
          const first = Object.values(payload.details)[0];
          if (first) return first;
        }
      }
      if (typeof body === 'string' && body.trim().length > 0) return body;
      if (err.status === 0) return 'No se pudo conectar con el servidor.';
      if (err.statusText) return `Error ${err.status}: ${err.statusText}`;
    }

    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al procesar la solicitud';
  }

  private resetSessionState(): void {
    this._users.set([]);
    this._selectedUser.set(null);
    this._loading.set(false);
    this._saving.set(false);
    this._error.set(null);
  }
}
