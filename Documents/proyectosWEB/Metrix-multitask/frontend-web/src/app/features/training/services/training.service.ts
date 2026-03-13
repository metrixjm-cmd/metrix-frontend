import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import {
  CreateTrainingRequest,
  TrainingResponse,
  UpdateTrainingProgressRequest,
} from '../training.models';

/**
 * Servicio del módulo Capacitación — Sprint 10.
 * Patrón igual a rh.service.ts: signals + Promise para mutaciones.
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trainings`;

  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _trainings         = signal<TrainingResponse[]>([]);
  private readonly _selectedTraining  = signal<TrainingResponse | null>(null);
  private readonly _loading           = signal(false);
  private readonly _saving            = signal(false);
  private readonly _error             = signal<string | null>(null);

  readonly trainings        = this._trainings.asReadonly();
  readonly selectedTraining = this._selectedTraining.asReadonly();
  readonly loading          = this._loading.asReadonly();
  readonly saving           = this._saving.asReadonly();
  readonly error            = this._error.asReadonly();

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly completedCount = computed(() =>
    this._trainings().filter(t => t.status === 'COMPLETADA').length
  );

  readonly inProgressCount = computed(() =>
    this._trainings().filter(t => t.status === 'EN_CURSO').length
  );

  readonly programmedCount = computed(() =>
    this._trainings().filter(t => t.status === 'PROGRAMADA').length
  );

  // ── Métodos de carga (subscribe) ──────────────────────────────────────────

  /** Solo ADMIN — todas las sucursales. */
  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<TrainingResponse[]>(this.apiUrl).subscribe({
      next:  list => { this._trainings.set(list); this._loading.set(false); },
      error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadMyTrainings(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<TrainingResponse[]>(`${this.apiUrl}/my`).subscribe({
      next:  list => { this._trainings.set(list); this._loading.set(false); },
      error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadByStore(storeId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<TrainingResponse[]>(`${this.apiUrl}/store/${storeId}`).subscribe({
      next:  list => { this._trainings.set(list); this._loading.set(false); },
      error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<TrainingResponse>(`${this.apiUrl}/${id}`).subscribe({
      next:  t   => { this._selectedTraining.set(t); this._loading.set(false); },
      error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  // ── Mutaciones (Promise) ──────────────────────────────────────────────────

  create(req: CreateTrainingRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<TrainingResponse>(this.apiUrl, req).subscribe({
        next: t => {
          this._trainings.update(list => [...list, t]);
          this._saving.set(false);
          resolve(t);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  updateProgress(id: string, req: UpdateTrainingProgressRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.patch<TrainingResponse>(`${this.apiUrl}/${id}/progress`, req).subscribe({
        next: t => {
          this._selectedTraining.set(t);
          this._trainings.update(list => list.map(item => item.id === id ? t : item));
          this._saving.set(false);
          resolve(t);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al procesar la solicitud';
  }
}
