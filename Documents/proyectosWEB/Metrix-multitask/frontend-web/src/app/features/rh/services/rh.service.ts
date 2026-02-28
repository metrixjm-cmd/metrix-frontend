import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CreateUserRequest, UpdateUserRequest, UserProfile } from '../rh.models';

/**
 * Servicio del módulo RH — Sprint 9.
 * Gestiona el CRUD de colaboradores vía signals (mismo patrón que task.service.ts).
 */
@Injectable({ providedIn: 'root' })
export class RhService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

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

  // ── Métodos HTTP ──────────────────────────────────────────────────────────

  loadUsersByStore(storeId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<UserProfile[]>(`${this.apiUrl}`, { params: { storeId } }).subscribe({
      next:  users => { this._users.set(users); this._loading.set(false); },
      error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadUserById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<UserProfile>(`${this.apiUrl}/${id}`).subscribe({
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

  // ── Helper ─────────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al procesar la solicitud';
  }
}
