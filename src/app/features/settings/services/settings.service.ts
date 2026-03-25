import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CreateStoreRequest, StoreResponse, UpdateStoreRequest } from '../settings.models';

/**
 * Servicio del módulo Configuración (Sucursales) — Sprint 11.
 * Patrón idéntico a rh.service.ts: signals + Promise para mutaciones.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/stores`;

  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _stores        = signal<StoreResponse[]>([]);
  private readonly _selectedStore = signal<StoreResponse | null>(null);
  private readonly _loading       = signal(false);
  private readonly _saving        = signal(false);
  private readonly _error         = signal<string | null>(null);

  readonly stores        = this._stores.asReadonly();
  readonly selectedStore = this._selectedStore.asReadonly();
  readonly loading       = this._loading.asReadonly();
  readonly saving        = this._saving.asReadonly();
  readonly error         = this._error.asReadonly();

  // ── Métodos HTTP ──────────────────────────────────────────────────────────

  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<StoreResponse[]>(this.apiUrl).subscribe({
      next:  stores => { this._stores.set(stores); this._loading.set(false); },
      error: err    => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<StoreResponse>(`${this.apiUrl}/${id}`).subscribe({
      next:  store => { this._selectedStore.set(store); this._loading.set(false); },
      error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  create(req: CreateStoreRequest): Promise<StoreResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<StoreResponse>(this.apiUrl, req).subscribe({
        next: store => {
          this._stores.update(list => [...list, store]);
          this._saving.set(false);
          resolve(store);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  update(id: string, req: UpdateStoreRequest): Promise<StoreResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.put<StoreResponse>(`${this.apiUrl}/${id}`, req).subscribe({
        next: store => {
          this._selectedStore.set(store);
          this._stores.update(list => list.map(s => s.id === id ? store : s));
          this._saving.set(false);
          resolve(store);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  deactivate(id: string): Promise<void> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {}).subscribe({
        next: () => {
          this._selectedStore.update(s => s ? { ...s, activo: false } : s);
          this._stores.update(list => list.filter(s => s.id !== id));
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
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al procesar la solicitud';
  }
}
