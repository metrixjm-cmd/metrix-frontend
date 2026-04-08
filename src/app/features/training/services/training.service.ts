import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { KpiService } from '../../kpi/services/kpi.service';
import { AuthService } from '../../auth/services/auth.service';
import {
  CreateFromTemplateRequest,
  CreateTrainingRequest,
  TrainingResponse,
  TrainingTemplateSummary,
  UpdateTrainingRequest,
  UpdateTrainingProgressRequest,
} from '../training.models';

type LoadScope =
  | { type: 'all' }
  | { type: 'store'; storeId: string }
  | { type: 'my' };

/**
 * Training Store — single source of truth para estado de capacitaciones.
 *
 * Arquitectura refactorizada:
 * - UN solo Map-cache en lugar de _trainings + _myTrainings
 * - myTrainings y selectedTraining son computed derivados
 * - Mutaciones tocan upsert() o remove() — 1 punto de sync
 * - KPI se invalida automáticamente tras cambios de progreso
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http       = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kpiSvc     = inject(KpiService);
  private readonly authSvc    = inject(AuthService);
  private readonly apiUrl     = `${environment.apiUrl}/trainings`;

  // ── Single source of truth ────────────────────────────────────────────
  private readonly _cache          = signal(new Map<string, TrainingResponse>());
  private readonly _myTrainingIds  = signal(new Set<string>());
  private readonly _selectedId     = signal<string | null>(null);
  private readonly _loading        = signal(false);
  private readonly _saving         = signal(false);
  private readonly _error          = signal<string | null>(null);
  private readonly _templates      = signal<TrainingTemplateSummary[]>([]);
  private readonly _lastLoadScope  = signal<LoadScope | null>(null);

  // ── Readonly exports ──────────────────────────────────────────────────
  readonly loading   = this._loading.asReadonly();
  readonly saving    = this._saving.asReadonly();
  readonly error     = this._error.asReadonly();
  readonly templates = this._templates.asReadonly();

  /** Lista plana derivada del cache. */
  readonly trainings = computed(() => [...this._cache().values()]);

  /**
   * Capacitaciones asignadas al usuario en sesión.
   * Se alimenta de los IDs devueltos por el endpoint /my (backend filtra por ObjectId).
   * Resuelve desde el cache compartido para mantener single source of truth.
   */
  readonly myTrainings = computed(() => {
    const user = this.authSvc.currentUser();
    if (!user) return [] as TrainingResponse[];
    const ids = this._myTrainingIds();
    if (ids.size === 0) return [] as TrainingResponse[];
    const cache = this._cache();
    return [...ids].map(id => cache.get(id)).filter((t): t is TrainingResponse => t != null);
  });

  /** Training seleccionado (para detail view). */
  readonly selectedTraining = computed(() => {
    const id = this._selectedId();
    return id ? this._cache().get(id) ?? null : null;
  });

  // ── Computed stats (UNA sola pasada) ──────────────────────────────────
  readonly completedCount  = computed(() => this.trainings().filter(t => t.status === 'COMPLETADA').length);
  readonly inProgressCount = computed(() => this.trainings().filter(t => t.status === 'EN_CURSO').length);
  readonly programmedCount = computed(() => this.trainings().filter(t => t.status === 'PROGRAMADA').length);

  clearError(): void { this._error.set(null); }

  // ── Primitivas de cache ───────────────────────────────────────────────

  private upsert(t: TrainingResponse): void {
    this._cache.update(m => {
      const next = new Map(m);
      next.set(t.id, t);
      return next;
    });
  }

  private upsertMany(list: TrainingResponse[]): void {
    this._cache.update(m => {
      const next = new Map(m);
      list.forEach(t => next.set(t.id, t));
      return next;
    });
  }

  private removeById(id: string): void {
    this._cache.update(m => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }

  private removeByGroup(groupId: string): void {
    this._cache.update(m => {
      const next = new Map(m);
      for (const [k, v] of next) {
        if (v.assignmentGroupId === groupId) next.delete(k);
      }
      return next;
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────

  /** Solo ADMIN — todas las sucursales. */
  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    const scope: LoadScope = { type: 'all' };
    this.http.get<TrainingResponse[]>(this.apiUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.replaceCache(list);
          this._myTrainingIds.set(new Set());
          this._lastLoadScope.set(scope);
          this._loading.set(false);
        },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadMyTrainings(): void {
    this._loading.set(true);
    this._error.set(null);
    const scope: LoadScope = { type: 'my' };
    this.http.get<TrainingResponse[]>(`${this.apiUrl}/my`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.replaceCache(list);
          this._myTrainingIds.set(new Set(list.map(t => t.id)));
          this._lastLoadScope.set(scope);
          this._loading.set(false);
        },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  /** Obtiene mis capacitaciones sin reemplazar el cache global. */
  listMyTrainings(): Promise<TrainingResponse[]> {
    return new Promise((resolve, reject) => {
      this.http.get<TrainingResponse[]>(`${this.apiUrl}/my`).subscribe({
        next: list => {
          this.upsertMany(list);
          this._myTrainingIds.set(new Set(list.map(t => t.id)));
          resolve(list);
        },
        error: err => reject(err),
      });
    });
  }

  loadByStore(storeId: string): void {
    this._loading.set(true);
    this._error.set(null);
    const scope: LoadScope = { type: 'store', storeId };
    this.http.get<TrainingResponse[]>(`${this.apiUrl}/store/${storeId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.replaceCache(list);
          this._lastLoadScope.set(scope);
          this._loading.set(false);
        },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadById(id: string): void {
    this._selectedId.set(id);
    this._loading.set(true);
    this._error.set(null);
    this.http.get<TrainingResponse>(`${this.apiUrl}/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: t => {
          this.upsert(t);
          this._loading.set(false);
        },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  getByAssignmentGroup(groupId: string): Promise<TrainingResponse[]> {
    return new Promise((resolve, reject) => {
      this.http.get<TrainingResponse[]>(`${this.apiUrl}/group/${groupId}`).subscribe({
        next: list => resolve(list),
        error: err => reject(err),
      });
    });
  }

  // ── Commands (mutaciones) ─────────────────────────────────────────────

  async create(req: CreateTrainingRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const t = await firstValueFrom(this.http.post<TrainingResponse>(this.apiUrl, req));
      this.upsert(t);
      return t;
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  async update(id: string, req: UpdateTrainingRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const t = await firstValueFrom(this.http.put<TrainingResponse>(`${this.apiUrl}/${id}`, req));
      this.upsert(t);
      return t;
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  async delete(id: string): Promise<void> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const cache = this._cache();
      const target = cache.get(id);
      const groupId = target?.assignmentGroupId ?? null;
      const removedIds = groupId
        ? [...cache.values()]
            .filter(item => item.assignmentGroupId === groupId)
            .map(item => item.id)
        : [id];
      await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
      groupId ? this.removeByGroup(groupId) : this.removeById(id);
      this._myTrainingIds.update(ids => {
        const next = new Set(ids);
        removedIds.forEach(removedId => next.delete(removedId));
        return next;
      });
      if (this._selectedId() === id) this._selectedId.set(null);
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  async updateProgress(id: string, req: UpdateTrainingProgressRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const t = await firstValueFrom(
        this.http.patch<TrainingResponse>(`${this.apiUrl}/${id}/progress`, req)
      );
      this.upsert(t);
      this.invalidateKpi();
      return t;
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  loadTemplateSummaries(): void {
    this.http.get<TrainingTemplateSummary[]>(
      `${environment.apiUrl}/training-templates/summaries`
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  list => this._templates.set(list),
      error: ()   => {},
    });
  }

  async createFromTemplate(templateId: string, req: CreateFromTemplateRequest): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const t = await firstValueFrom(
        this.http.post<TrainingResponse>(`${this.apiUrl}/from-template/${templateId}`, req)
      );
      this.upsert(t);
      return t;
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  async markMaterialViewed(trainingId: string, materialId: string): Promise<TrainingResponse> {
    this._saving.set(true);
    this._error.set(null);
    try {
      const t = await firstValueFrom(
        this.http.patch<TrainingResponse>(
          `${this.apiUrl}/${trainingId}/materials/${materialId}/view`, {})
      );
      this.upsert(t);
      if (t.status === 'COMPLETADA') {
        this.invalidateKpi();
      }
      return t;
    } catch (err) {
      this._error.set(this.extractMessage(err));
      throw err;
    } finally {
      this._saving.set(false);
    }
  }

  // ── Invalidación ──────────────────────────────────────────────────────

  /** Recarga el último scope para refrescar datos. */
  reload(): void {
    const scope = this._lastLoadScope();
    if (!scope) return;
    switch (scope.type) {
      case 'all':   this.loadAll(); break;
      case 'store': this.loadByStore(scope.storeId); break;
      case 'my':    this.loadMyTrainings(); break;
    }
  }

  private invalidateKpi(): void {
    const user = this.authSvc.currentUser();
    if (!user) return;
    if (user.roles.includes('ADMIN') || user.roles.includes('GERENTE')) {
      if (user.storeId) this.kpiSvc.loadStoreSummary(user.storeId);
    } else {
      this.kpiSvc.loadMySummary();
    }
  }

  private replaceCache(list: TrainingResponse[]): void {
    const next = new Map<string, TrainingResponse>();
    list.forEach(t => next.set(t.id, t));
    // Conserva mis capacitaciones ya cargadas por /my para evitar perderlas
    // cuando una carga por sucursal termina después (race condition).
    const previous = this._cache();
    this._myTrainingIds().forEach(id => {
      const existing = previous.get(id);
      if (existing && !next.has(id)) {
        next.set(id, existing);
      }
    });
    this._cache.set(next);
  }

  // ── Helper ────────────────────────────────────────────────────────────

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
