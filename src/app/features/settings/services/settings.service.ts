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
      next:  stores => { this._stores.set(stores.map(store => this.normalizeStore(store))); this._loading.set(false); },
      error: err    => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<StoreResponse>(`${this.apiUrl}/${id}`).subscribe({
      next:  store => { this._selectedStore.set(this.normalizeStore(store)); this._loading.set(false); },
      error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  create(req: CreateStoreRequest): Promise<StoreResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<StoreResponse>(this.apiUrl, req).subscribe({
        next: store => {
          const normalized = this.normalizeStore(store);
          this._stores.update(list => [...list, normalized]);
          this._saving.set(false);
          resolve(normalized);
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
          const normalized = this.normalizeStore(store);
          this._selectedStore.set(normalized);
          this._stores.update(list => list.map(s => s.id === id ? normalized : s));
          this._saving.set(false);
          resolve(normalized);
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

  private normalizeStore(store: StoreResponse): StoreResponse {
    return {
      ...store,
      nombre: this.normalizeText(store.nombre),
      codigo: this.normalizeText(store.codigo),
      direccion: store.direccion ? this.normalizeText(store.direccion) : store.direccion,
      telefono: store.telefono ? this.normalizeText(store.telefono) : store.telefono,
      turnos: store.turnos.map(turno => this.normalizeText(turno)),
    };
  }

  private normalizeText(value: string): string {
    if (!value) return value;

    // Only try to recover text when it looks like mojibake (UTF-8 shown as Latin-1).
    if (!/[ÃÂâ]/.test(value)) return value;

    try {
      const bytes = Uint8Array.from(value, char => char.charCodeAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return decoded || value;
    } catch {
      return value
        .replaceAll('Ã‚Â·', '·')
        .replaceAll('Ã¡', 'á')
        .replaceAll('Ã©', 'é')
        .replaceAll('Ã­', 'í')
        .replaceAll('Ã³', 'ó')
        .replaceAll('Ãº', 'ú')
        .replaceAll('Ã±', 'ñ')
        .replaceAll('Ã', 'Á')
        .replaceAll('Ã‰', 'É')
        .replaceAll('Ã', 'Í')
        .replaceAll('Ã“', 'Ó')
        .replaceAll('Ãš', 'Ú')
        .replaceAll('Ã‘', 'Ñ')
        .replaceAll('Â', '');
    }
  }
}
