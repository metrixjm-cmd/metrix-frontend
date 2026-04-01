import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import {
  CreateIncidentRequest,
  IncidentResponse,
  IncidentStatus,
  UpdateIncidentStatusRequest,
} from '../incident.models';

/**
 * Servicio del módulo de Contingencias — Sprint 15.
 * Patrón idéntico a training.service.ts: signals + Promise para mutaciones.
 */
@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http       = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl     = `${environment.apiUrl}/incidents`;

  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _incidents        = signal<IncidentResponse[]>([]);
  private readonly _selectedIncident = signal<IncidentResponse | null>(null);
  private readonly _loading          = signal(false);
  private readonly _saving           = signal(false);
  private readonly _error            = signal<string | null>(null);

  readonly incidents        = this._incidents.asReadonly();
  readonly selectedIncident = this._selectedIncident.asReadonly();
  readonly loading          = this._loading.asReadonly();
  readonly saving           = this._saving.asReadonly();
  readonly error            = this._error.asReadonly();

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly openCount = computed(() =>
    this._incidents().filter(i => i.status === 'ABIERTA').length
  );

  readonly inResolutionCount = computed(() =>
    this._incidents().filter(i => i.status === 'EN_RESOLUCION').length
  );

  readonly closedCount = computed(() =>
    this._incidents().filter(i => i.status === 'CERRADA').length
  );

  readonly criticalOpenCount = computed(() =>
    this._incidents().filter(i => i.severity === 'CRITICA' && i.status !== 'CERRADA').length
  );

  readonly criticalOpen = computed(() =>
    this._incidents()
      .filter(i => i.severity === 'CRITICA' && i.status !== 'CERRADA')
      .slice(0, 3)
  );

  // ── Métodos de carga ──────────────────────────────────────────────────────

  loadMyIncidents(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<IncidentResponse[]>(`${this.apiUrl}/my`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  list => { this._incidents.set(list); this._loading.set(false); },
        error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadByStore(storeId: string, status?: IncidentStatus): void {
    this._loading.set(true);
    this._error.set(null);
    const params = status ? { params: { status } } : {};
    this.http.get<IncidentResponse[]>(`${this.apiUrl}/store/${storeId}`, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  list => { this._incidents.set(list); this._loading.set(false); },
        error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<IncidentResponse>(`${this.apiUrl}/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  i   => { this._selectedIncident.set(i); this._loading.set(false); },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  create(req: CreateIncidentRequest): Promise<IncidentResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<IncidentResponse>(this.apiUrl, req).subscribe({
        next: i => {
          this._incidents.update(list => [i, ...list]);
          this._saving.set(false);
          resolve(i);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  uploadEvidence(id: string, file: File): Promise<IncidentResponse> {
    this._saving.set(true);
    this._error.set(null);
    const formData = new FormData();
    formData.append('file', file);
    return new Promise((resolve, reject) => {
      this.http.post<IncidentResponse>(`${this.apiUrl}/${id}/evidence`, formData).subscribe({
        next: i => {
          this._selectedIncident.set(i);
          this._incidents.update(list => list.map(item => item.id === id ? i : item));
          this._saving.set(false);
          resolve(i);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  updateStatus(id: string, req: UpdateIncidentStatusRequest): Promise<IncidentResponse> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.patch<IncidentResponse>(`${this.apiUrl}/${id}/status`, req).subscribe({
        next: i => {
          this._selectedIncident.set(i);
          this._incidents.update(list => list.map(item => item.id === id ? i : item));
          this._saving.set(false);
          resolve(i);
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
