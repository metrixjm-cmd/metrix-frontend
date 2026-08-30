import { computed, DestroyRef, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CorrectionSpeedData, ExamKpi, IgeoAnalyticsResponse, IgeoGlobalResult, IncidentKpi, KpiSummary, StoreRankingEntry, TrainingKpi, UserResponsibilityEntry } from '../kpi.models';
import { KpiCard, StoreRanking } from '../../dashboard/dashboard';
import { AuthService } from '../../auth/services/auth.service';

/**
 * Servicio de KPIs para METRIX (Sprint 7 — KPI & Analytics).
 *
 * - Expone estado reactivo vía Signals (summary, ranking, loading, error).
 * - Computed signals para las cards del dashboard y el ranking display.
 * - El JWT se inyecta automáticamente por el AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class KpiService {
  private readonly http       = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth       = inject(AuthService);
  private readonly apiUrl     = `${environment.apiUrl}/kpis`;

  // ── Estado reactivo ──────────────────────────────────────────────────────
  private readonly _summary             = signal<KpiSummary | null>(null);
  private readonly _ranking             = signal<StoreRankingEntry[]>([]);
  private readonly _loading             = signal(false);
  private readonly _error               = signal<string | null>(null);
  private readonly _usersResponsibility = signal<UserResponsibilityEntry[]>([]);
  private readonly _correctionSpeed     = signal<CorrectionSpeedData | null>(null);
  private readonly _igeoAnalytics       = signal<IgeoAnalyticsResponse | null>(null);
  private readonly _incidents           = signal<IncidentKpi | null>(null);
  private readonly _trainings           = signal<TrainingKpi | null>(null);
  private readonly _exams               = signal<ExamKpi | null>(null);

  readonly summary             = this._summary.asReadonly();
  readonly ranking             = this._ranking.asReadonly();
  readonly loading             = this._loading.asReadonly();
  readonly error               = this._error.asReadonly();
  readonly usersResponsibility = this._usersResponsibility.asReadonly();
  readonly correctionSpeed     = this._correctionSpeed.asReadonly();
  readonly igeoAnalytics       = this._igeoAnalytics.asReadonly();
  readonly incidents           = this._incidents.asReadonly();
  readonly trainings           = this._trainings.asReadonly();
  readonly exams               = this._exams.asReadonly();

  // ── Computed signals para el dashboard ──────────────────────────────────

  /**
   * Over-all analítico ya acotado al alcance del usuario.
   * <p>
   * El endpoint devuelve {@code data.global} (toda la cadena) y
   * {@code data.by_store[]}. Antes se usaba siempre el global, así que un
   * GERENTE veía el número de la cadena entera mezclado con el resto de sus
   * tarjetas, que sí son de su sucursal (auditoría 2026-08-01).
   * <p>
   * Devuelve null si no hay analytics o si el usuario no es ADMIN y su sucursal
   * no viene en la respuesta: en ese caso el llamador cae a la fórmula de
   * respaldo del summary, que sí está correctamente acotada.
   */
  private readonly scopedAnalyticsIgeo = computed((): IgeoGlobalResult | null => {
    const analytics = this._igeoAnalytics();
    if (analytics == null) return null;
    if (this.auth.hasRole('ADMIN')) return analytics.data.global;
    const storeId = this.auth.currentUser()?.storeId;
    if (!storeId) return null;
    return analytics.data.by_store.find(s => s.store_id === storeId) ?? null;
  });

  /** Pilares del Over-all analítico en el alcance del usuario; null si no aplica. */
  readonly igeoPillars = computed(() => this.scopedAnalyticsIgeo()?.pillar_scores ?? null);

  /**
   * Over-all analítico del alcance del usuario; null si el analytics-service no
   * respondió o su sucursal no viene en la respuesta. Cuando es null, la UI debe
   * usar el `igeo` del summary (fórmula de respaldo) y decirlo.
   */
  readonly analyticsIgeoValue = computed(() => this.scopedAnalyticsIgeo()?.igeo ?? null);

  readonly kpiCards = computed((): KpiCard[] | null => {
    const s        = this._summary();
    if (!s) return null;
    const scoped     = this.scopedAnalyticsIgeo();
    const igeoValue  = scoped != null ? scoped.igeo : s.igeo;
    const igeoSource = scoped != null
      ? 'Analítico · 4 pilares'
      : 'Respaldo · on-time, re-trabajo y calidad';
    return [
      {
        label:    'Over-all',
        value:    igeoValue >= 0 ? igeoValue.toFixed(1) : 'S/D',
        delta:    '',
        deltaUp:  true,
        sub:      igeoSource,
        // Sin histórico se manda vacío, no un 50 de relleno: la tarjeta ya
        // muestra "sin histórico" cuando hay <2 puntos, y un valor inventado
        // aquí solo confunde a quien lea el código (auditoría 2026-08-01).
        data:     s.sparklineIgeo,
        taskTitles: s.sparklineIgeo.length > 0 ? s.sparklineTaskTitles : [],
        viz:      'trend',
        color:    '#005a9c',
        accentBg: 'brand',
      },
      {
        label:    'On-Time Rate',
        value:    s.onTimeRate >= 0 ? `${s.onTimeRate.toFixed(1)}%` : 'S/D',
        delta:    '',
        deltaUp:  true,
        // El denominador son las tareas cerradas (completadas + fallidas), no
        // solo las completadas — ver KpiServiceImpl.computeOnTimeRate.
        sub:      'Tareas cerradas dentro de plazo',
        data:     s.sparklineOnTime,
        taskTitles: s.sparklineOnTime.length > 0 ? s.sparklineTaskTitles : [],
        viz:      'trend',
        color:    '#10b981',
        accentBg: 'emerald',
      },
      {
        label:    'Re-trabajo',
        value:    `${s.reworkRate.toFixed(1)}%`,
        delta:    '',
        deltaUp:  false,
        sub:      'Tareas devueltas / total',
        // Valor real, sin el Math.max(…, 1) que traía de cuando esto se pintaba
        // como sparkline: en el tacómetro ese piso mostraría 1% con 0% real.
        data:     [s.reworkRate],
        viz:      'gauge',
        color:    '#e31717',
        accentBg: 'red',
      },
      {
        label:    'Críticas Pend.',
        value:    `${s.criticalPending}`,
        delta:    '',
        deltaUp:  false,
        // No está acotado al turno: cuenta todas las críticas sin completar del
        // alcance (sucursal o global). El rótulo anterior decía "este turno".
        sub:      'Críticas sin completar',
        data:     [s.criticalPending],
        viz:      'counter',
        color:    '#ef4444',
        accentBg: 'red',
      },
    ];
  });

  readonly pipelineCounts = computed(() => {
    const s = this._summary();
    if (!s) return null;
    return {
      pending:    s.pipelinePending,
      inProgress: s.pipelineInProgress,
      completed:  s.pipelineCompleted,
      failed:     s.pipelineFailed,
    };
  });

  readonly rankingForDisplay = computed((): StoreRanking[] =>
    this._ranking().map(r => ({
      rank:   r.rank,
      name:   r.storeName || r.storeId,
      igeo:   r.igeo,
      onTime: r.onTimeRate,
      tasks:  r.totalTasks,
      trend:  'same' as const,
    }))
  );

  // ── Métodos HTTP ─────────────────────────────────────────────────────────

  loadStoreSummary(storeId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<KpiSummary>(`${this.apiUrl}/store/${storeId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  s   => { this._summary.set(s); this._loading.set(false); },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  /** KPIs globales de todo el sistema (todas las sucursales). Solo ADMIN. */
  loadGlobalSummary(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<KpiSummary>(`${this.apiUrl}/summary`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  s   => { this._summary.set(s); this._loading.set(false); },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  /** KPI #7 global: ranking de TODOS los colaboradores del sistema. Solo ADMIN. */
  loadUsersResponsibilityGlobal(): void {
    this.http.get<UserResponsibilityEntry[]>(`${this.apiUrl}/users`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => this._usersResponsibility.set(r),
        error: err => this._error.set(this.extractMessage(err)),
      });
  }

  loadMySummary(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<KpiSummary>(`${this.apiUrl}/me`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  s   => { this._summary.set(s); this._loading.set(false); },
        error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadRanking(): void {
    this.http.get<StoreRankingEntry[]>(`${this.apiUrl}/ranking`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => this._ranking.set(r),
        error: err => this._error.set(this.extractMessage(err)),
      });
  }

  /** KPI #7: carga ranking de colaboradores de una sucursal. */
  loadUsersResponsibility(storeId: string): void {
    this.http.get<UserResponsibilityEntry[]>(`${this.apiUrl}/store/${storeId}/users`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => this._usersResponsibility.set(r),
        error: err => this._error.set(this.extractMessage(err)),
      });
  }

  /** KPI #9: carga velocidad de corrección de una sucursal. */
  loadCorrectionSpeed(storeId: string): void {
    this.http.get<CorrectionSpeedData>(`${this.apiUrl}/store/${storeId}/correction-speed`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => this._correctionSpeed.set(r),
        error: err => this._error.set(this.extractMessage(err)),
      });
  }

  /**
   * KPI #10 — Over-all Analítico (Sprint 17).
   * Consume el endpoint de Spring Boot que delega al analytics-service Python.
   * Si el analytics-service no está disponible, Spring devuelve 503 y se ignora
   * silenciosamente — el dashboard seguirá mostrando el Over-all calculado en memoria.
   */
  loadAnalyticsIgeo(): void {
    this.http.get<IgeoAnalyticsResponse>(`${this.apiUrl}/analytics/igeo`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => this._igeoAnalytics.set(r),
        error: ()  => { /* analytics-service offline — fallback al Over-all local */ },
      });
  }

  // ── KPIs por dominio ─────────────────────────────────────────────────────
  //
  // Cada dominio tiene dos alcances: por sucursal (GERENTE) y global (ADMIN,
  // que no tiene sucursal asignada). El backend usa la misma fórmula en ambos;
  // solo cambia el conjunto de datos de entrada.

  loadIncidentKpis(storeId: string): void { this.fetchInto(`/incidents/store/${storeId}`, this._incidents); }
  loadGlobalIncidentKpis(): void          { this.fetchInto('/incidents/summary', this._incidents); }

  loadTrainingKpis(storeId: string): void { this.fetchInto(`/trainings/store/${storeId}`, this._trainings); }
  loadGlobalTrainingKpis(): void          { this.fetchInto('/trainings/summary', this._trainings); }

  loadExamKpis(storeId: string): void     { this.fetchInto(`/exams/store/${storeId}`, this._exams); }
  loadGlobalExamKpis(): void              { this.fetchInto('/exams/summary', this._exams); }

  private fetchInto<T>(path: string, target: WritableSignal<T | null>): void {
    this.http.get<T>(`${this.apiUrl}${path}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  r   => target.set(r),
        error: err => this._error.set(this.extractMessage(err)),
      });
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al cargar KPIs';
  }
}
