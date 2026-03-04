import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CorrectionSpeedData, IgeoAnalyticsResponse, KpiSummary, StoreRankingEntry, UserResponsibilityEntry } from '../kpi.models';
import { KpiCard, StoreRanking } from '../../dashboard/dashboard';

/**
 * Servicio de KPIs para METRIX (Sprint 7 — KPI & Analytics).
 *
 * - Expone estado reactivo vía Signals (summary, ranking, loading, error).
 * - Computed signals para las cards del dashboard y el ranking display.
 * - El JWT se inyecta automáticamente por el AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class KpiService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/kpis`;

  // ── Estado reactivo ──────────────────────────────────────────────────────
  private readonly _summary             = signal<KpiSummary | null>(null);
  private readonly _ranking             = signal<StoreRankingEntry[]>([]);
  private readonly _loading             = signal(false);
  private readonly _error               = signal<string | null>(null);
  private readonly _usersResponsibility = signal<UserResponsibilityEntry[]>([]);
  private readonly _correctionSpeed     = signal<CorrectionSpeedData | null>(null);
  private readonly _igeoAnalytics       = signal<IgeoAnalyticsResponse | null>(null);

  readonly summary             = this._summary.asReadonly();
  readonly ranking             = this._ranking.asReadonly();
  readonly loading             = this._loading.asReadonly();
  readonly error               = this._error.asReadonly();
  readonly usersResponsibility = this._usersResponsibility.asReadonly();
  readonly correctionSpeed     = this._correctionSpeed.asReadonly();
  readonly igeoAnalytics       = this._igeoAnalytics.asReadonly();

  // ── Computed signals para el dashboard ──────────────────────────────────

  readonly kpiCards = computed((): KpiCard[] | null => {
    const s        = this._summary();
    if (!s) return null;
    const analytics  = this._igeoAnalytics();
    const igeoValue  = analytics != null ? analytics.data.global.igeo : s.igeo;
    const igeoSource = analytics != null ? 'Analítico (4 pilares)' : 'Índice Global Ejecución';
    return [
      {
        label:    'IGEO',
        value:    igeoValue >= 0 ? igeoValue.toFixed(1) : 'S/D',
        delta:    '',
        deltaUp:  true,
        sub:      igeoSource,
        data:     s.sparklineIgeo.length > 0 ? s.sparklineIgeo : [50],
        color:    '#ea580c',
        accentBg: 'orange',
      },
      {
        label:    'On-Time Rate',
        value:    s.onTimeRate >= 0 ? `${s.onTimeRate.toFixed(1)}%` : 'S/D',
        delta:    '',
        deltaUp:  true,
        sub:      'Tareas completadas a tiempo',
        data:     s.sparklineOnTime.length > 0 ? s.sparklineOnTime : [50],
        color:    '#10b981',
        accentBg: 'emerald',
      },
      {
        label:    'Re-trabajo',
        value:    `${s.reworkRate.toFixed(1)}%`,
        delta:    '',
        deltaUp:  false,
        sub:      'Tareas devueltas / total',
        data:     [Math.max(s.reworkRate, 1)],
        color:    '#f59e0b',
        accentBg: 'amber',
      },
      {
        label:    'Críticas Pend.',
        value:    `${s.criticalPending}`,
        delta:    '',
        deltaUp:  false,
        sub:      'Sin ejecutar este turno',
        data:     [Math.max(s.criticalPending, 1)],
        color:    '#ef4444',
        accentBg: 'red',
      },
      {
        label:    'Capacitación',
        value:    `${(s.trainingCompletionRate ?? 0).toFixed(1)}%`,
        delta:    '',
        deltaUp:  true,
        sub:      'Capacitaciones completadas',
        data:     [Math.max(s.trainingCompletionRate ?? 0, 1)],
        color:    '#8b5cf6',
        accentBg: 'violet',
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
      name:   r.storeId,
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
    this.http.get<KpiSummary>(`${this.apiUrl}/store/${storeId}`).subscribe({
      next:  s   => { this._summary.set(s); this._loading.set(false); },
      error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadMySummary(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<KpiSummary>(`${this.apiUrl}/me`).subscribe({
      next:  s   => { this._summary.set(s); this._loading.set(false); },
      error: err => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  loadRanking(): void {
    this.http.get<StoreRankingEntry[]>(`${this.apiUrl}/ranking`).subscribe({
      next:  r   => this._ranking.set(r),
      error: err => this._error.set(this.extractMessage(err)),
    });
  }

  /** KPI #7: carga ranking de colaboradores de una sucursal. */
  loadUsersResponsibility(storeId: string): void {
    this.http.get<UserResponsibilityEntry[]>(`${this.apiUrl}/store/${storeId}/users`).subscribe({
      next:  r   => this._usersResponsibility.set(r),
      error: err => this._error.set(this.extractMessage(err)),
    });
  }

  /** KPI #9: carga velocidad de corrección de una sucursal. */
  loadCorrectionSpeed(storeId: string): void {
    this.http.get<CorrectionSpeedData>(`${this.apiUrl}/store/${storeId}/correction-speed`).subscribe({
      next:  r   => this._correctionSpeed.set(r),
      error: err => this._error.set(this.extractMessage(err)),
    });
  }

  /**
   * KPI #10 — IGEO Analítico (Sprint 17).
   * Consume el endpoint de Spring Boot que delega al analytics-service Python.
   * Si el analytics-service no está disponible, Spring devuelve 503 y se ignora
   * silenciosamente — el dashboard seguirá mostrando el IGEO calculado en memoria.
   */
  loadAnalyticsIgeo(): void {
    this.http.get<IgeoAnalyticsResponse>(`${this.apiUrl}/analytics/igeo`).subscribe({
      next:  r   => this._igeoAnalytics.set(r),
      error: ()  => { /* analytics-service offline — fallback al IGEO local */ },
    });
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al cargar KPIs';
  }
}
