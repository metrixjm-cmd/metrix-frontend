import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { KpiService } from '../services/kpi.service';
import { KpiSummary, LabelCount, StoreRankingEntry, UserResponsibilityEntry } from '../kpi.models';
import { RadialGauge } from '../../../shared/components/charts/radial-gauge';
import { CategoryDonut } from '../../../shared/components/charts/category-donut';
import { TrendLine } from '../../../shared/components/charts/trend-line';
import { DistributionBar } from '../../../shared/components/charts/distribution-bar';
import { ChartDatum, PALETTE } from '../../../shared/components/charts/chart-core';

/** Pestañas del panel de KPIs por módulo de evaluación. */
export type KpiTab = 'tareas' | 'incidencias' | 'capacitaciones' | 'examenes';

/** Definición de una métrica para el panel */
interface MetricDef {
  key:    string;
  label:  string;
  icon:   string;
  color:  string;
  bg:     string;
  unit:   string;
  desc:   string;
  getValue: (s: KpiSummary) => number;
  format:   (v: number) => string;
  /** Extrae el valor de esta métrica desde un StoreRankingEntry */
  getStoreValue?: (r: StoreRankingEntry) => number;
  /** Extrae el valor de esta métrica desde un UserResponsibilityEntry */
  getUserValue?: (u: UserResponsibilityEntry) => number;
  /** true si valores más bajos son mejores (ej: rework, exec time) */
  lowerIsBetter?: boolean;
}

@Component({
  selector: 'app-kpi-panel',
  standalone: true,
  imports: [RouterLink, RadialGauge, CategoryDonut, TrendLine, DistributionBar],
  templateUrl: './kpi-panel.html',
})
export class KpiPanel implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly kpiSvc = inject(KpiService);

  readonly selected = signal<string | null>(null);

  // ── Desglose por dimensión (Sucursal / Colaborador / Turno) ────────
  readonly breakdownDimension = signal<'store' | 'user' | 'shift'>('store');
  readonly breakdownDims: { key: 'store' | 'user' | 'shift'; label: string }[] = [
    { key: 'store', label: 'Sucursal' },
    { key: 'user',  label: 'Colaborador' },
    { key: 'shift', label: 'Turno' },
  ];

  // ── Tabs ──────────────────────────────────────────────────────────
  readonly activeTab = signal<KpiTab>('tareas');
  readonly tabs: { key: KpiTab; label: string }[] = [
    { key: 'tareas',         label: 'Tareas' },
    { key: 'incidencias',    label: 'Incidencias' },
    { key: 'capacitaciones', label: 'Capacitaciones' },
    { key: 'examenes',       label: 'Exámenes' },
  ];

  setTab(tab: KpiTab): void { this.activeTab.set(tab); }

  // ── Definición de métricas ─────────────────────────────────────────

  readonly metrics: MetricDef[] = [
    {
      key: 'igeo', label: 'Over-all', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', unit: '%',
      desc: 'Índice Global de Ejecución Operativa — combina cumplimiento, tiempo, calidad y consistencia.',
      getValue: s => s.igeo, format: v => v >= 0 ? v.toFixed(1) : 'S/D',
      getStoreValue: r => r.igeo, getUserValue: u => u.igeo,
    },
    {
      key: 'ontime', label: 'On-Time Rate', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', unit: '%',
      desc: 'Porcentaje de tareas completadas antes de su fecha límite.',
      getValue: s => s.onTimeRate, format: v => v >= 0 ? v.toFixed(1) : 'S/D',
      getStoreValue: r => r.onTimeRate, getUserValue: u => u.onTimeRate,
    },
    {
      key: 'rework', label: 'Re-trabajo', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      color: 'text-red-700', bg: 'bg-red-50 border-red-200', unit: '%',
      desc: 'Porcentaje de tareas que fallaron y fueron reasiganadas. Menor es mejor.',
      getValue: s => s.reworkRate, format: v => v.toFixed(1),
      getStoreValue: r => r.reworkRate, getUserValue: u => u.reworkRate,
      lowerIsBetter: true,
    },
    {
      key: 'quality', label: 'Calidad Promedio', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', unit: '/5',
      desc: 'Calificación promedio otorgada por gerentes a tareas completadas.',
      getValue: s => s.avgQualityRating, format: v => v >= 0 ? v.toFixed(1) : 'S/D',
    },
    {
      key: 'delegation', label: 'Delegación Efectiva', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', unit: '%',
      desc: 'Porcentaje de tareas delegadas que se completaron exitosamente.',
      getValue: s => s.delegacionEfectiva, format: v => v >= 0 ? v.toFixed(1) : 'S/D',
    },
    {
      key: 'exectime', label: 'Tiempo Promedio', icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', unit: 'min',
      desc: 'Tiempo promedio de ejecución desde inicio hasta completar una tarea.',
      getValue: s => s.avgExecutionMinutes, format: v => v >= 0 ? v.toFixed(0) : 'S/D',
      getUserValue: u => u.avgExecMinutes,
      lowerIsBetter: true,
    },
    {
      key: 'critical', label: 'Críticas Pendientes', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', unit: '',
      desc: 'Tareas marcadas como críticas que aún no se han completado.',
      getValue: s => s.criticalPending, format: v => v.toString(),
      lowerIsBetter: true,
    },
    {
      key: 'training', label: 'Capacitación', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', unit: '%',
      desc: 'Porcentaje de capacitaciones programadas que fueron completadas.',
      getValue: s => s.trainingCompletionRate, format: v => (v ?? 0).toFixed(1),
    },
  ];

  /** Hex por métrica para las gráficas Chart.js (las clases Tailwind de `metrics` no sirven ahí). */
  private readonly metricHexMap: Record<string, string> = {
    igeo: PALETTE.brand, ontime: PALETTE.emerald, rework: PALETTE.red,
    quality: PALETTE.amber, delegation: PALETTE.violet, exectime: PALETTE.cyan,
    critical: PALETTE.rose, training: PALETTE.violet,
  };
  metricHex(m: MetricDef): string { return this.metricHexMap[m.key] ?? PALETTE.brand; }
  absVal(n: number): number { return Math.abs(n); }

  // ── Signals derivados ─────────────────────────────────────────────

  readonly summary  = this.kpiSvc.summary;
  readonly ranking  = this.kpiSvc.ranking;
  readonly users    = this.kpiSvc.usersResponsibility;
  readonly loading  = this.kpiSvc.loading;

  // ── Datos por módulo ──────────────────────────────────────────────
  readonly incidents = this.kpiSvc.incidents;
  readonly trainings = this.kpiSvc.trainings;
  readonly exams     = this.kpiSvc.exams;

  // ── Tareas: gauges y tendencia ────────────────────────────────────
  readonly taskGauges = computed(() => {
    const s = this.summary();
    if (!s) return null;
    return {
      igeo:    s.igeo,
      onTime:  s.onTimeRate,
      rework:  s.reworkRate,
      trend:   s.sparklineIgeo.length > 0 ? s.sparklineIgeo : [s.igeo >= 0 ? s.igeo : 0],
    };
  });

  /** Delta del Over-all vs el punto anterior del sparkline (≈ "vs ayer"). null si no hay ≥2 puntos. */
  readonly igeoDelta = computed(() => {
    const t = this.taskGauges()?.trend;
    if (!t || t.length < 2) return null;
    return Math.round((t[t.length - 1] - t[t.length - 2]) * 10) / 10;
  });

  /** Leyenda del pipeline de tareas (para la tarjeta "Resumen de Ejecución"). */
  readonly pipelineLegend = computed(() => {
    const p = this.pipeline();
    if (!p || p.total === 0) return [];
    const pct = (n: number) => Math.round((n / p.total) * 1000) / 10;
    return [
      { label: 'Completadas', value: p.completed,   pct: pct(p.completed),   color: PALETTE.emerald },
      { label: 'En Progreso', value: p.inProgress,  pct: pct(p.inProgress),  color: PALETTE.cyan },
      { label: 'Pendientes',  value: p.pending,     pct: pct(p.pending),     color: PALETTE.amber },
      { label: 'Fallidas',    value: p.failed,      pct: pct(p.failed),      color: PALETTE.red },
    ];
  });

  /** Métrica que alimenta el desglose por dimensión — Over-all por defecto si no hay selección. */
  readonly breakdownMetric = computed(() => this.selectedMetric() ?? this.metrics[0]);

  readonly breakdownTitle = computed(() => {
    if (this.breakdownDimension() === 'shift') return 'Desempeño por Turno · On-Time Rate';
    const dimLabel = this.breakdownDimension() === 'store' ? 'Sucursal' : 'Colaborador';
    return `Desempeño por ${dimLabel} · ${this.breakdownMetric().label}`;
  });

  /** Datos ya formateados para <app-distribution-bar> según la dimensión activa. */
  readonly breakdownChartData = computed<ChartDatum[]>(() => {
    const dim = this.breakdownDimension();
    if (dim === 'shift') {
      return this.shiftBreakdown().map(s => ({
        label: s.shift, value: s.onTimeRate >= 0 ? s.onTimeRate : 0, color: PALETTE.cyan,
      }));
    }
    const color = this.metricHex(this.breakdownMetric());
    if (dim === 'store') {
      return this.storeBreakdown().slice(0, 8).map(s => ({ label: s.storeName, value: s.value, color }));
    }
    return this.userBreakdown().slice(0, 8).map(u => ({ label: u.name, value: u.value, color }));
  });

  /**
   * Máximo fijo del eje para el desglose — sin esto, cuando casi todos los
   * valores son 0 (ej. rework=0 en la mayoría), Chart.js auto-escala a un
   * máximo diminuto y las barras se ven "rotas"/invisibles.
   */
  readonly breakdownMax = computed<number | null>(() => {
    if (this.breakdownDimension() === 'shift') return 100; // onTimeRate siempre %
    return this.breakdownMetric().unit === '%' ? 100 : null;
  });

  // ── Incidencias: view-models para gráficas ────────────────────────
  readonly incidentStatusData = computed<ChartDatum[]>(() => {
    const i = this.incidents();
    if (!i || i.total === 0) return [];
    return [
      { label: 'Abiertas',      value: i.abiertas,     color: PALETTE.red },
      { label: 'En resolución', value: i.enResolucion, color: PALETTE.amber },
      { label: 'Cerradas',      value: i.cerradas,     color: PALETTE.emerald },
    ];
  });

  /** Severidad de mejor a peor: BAJA→ALTA→CRITICA. */
  private readonly severityColors: Record<string, string> = {
    BAJA: PALETTE.emerald, MEDIA: PALETTE.amber, ALTA: PALETTE.red, CRITICA: PALETTE.rose,
  };
  readonly incidentSeverityData = computed<ChartDatum[]>(() =>
    this.labelsToData(this.incidents()?.bySeverity, l => this.severityColors[l.label]));

  readonly incidentCategoryData = computed<ChartDatum[]>(() =>
    this.labelsToData(this.incidents()?.byCategory?.filter(c => c.count > 0)));

  // ── Capacitaciones: view-models ───────────────────────────────────
  readonly trainingStatusData = computed<ChartDatum[]>(() => {
    const t = this.trainings();
    if (!t || t.total === 0) return [];
    return [
      { label: 'Programadas',    value: t.programadas,   color: PALETTE.slate },
      { label: 'En curso',       value: t.enCurso,       color: PALETTE.cyan },
      { label: 'Completadas',    value: t.completadas,   color: PALETTE.emerald },
      { label: 'No completadas', value: t.noCompletadas, color: PALETTE.red },
    ];
  });
  readonly trainingCategoryData = computed<ChartDatum[]>(() =>
    this.labelsToData(this.trainings()?.byCategory));

  // ── Exámenes: view-models ─────────────────────────────────────────
  /** Distribución de puntajes coloreada por desempeño (0-49 rojo … 90-100 esmeralda). */
  private readonly scoreColors = [PALETTE.red, PALETTE.amber, PALETTE.cyan, PALETTE.emerald];
  readonly examScoreData = computed<ChartDatum[]>(() => {
    const e = this.exams();
    if (!e) return [];
    return e.scoreDistribution.map((l, idx) => ({
      label: l.label, value: l.count, color: this.scoreColors[idx] ?? PALETTE.brand,
    }));
  });
  readonly examRows = computed(() => this.exams()?.perExam ?? []);
  readonly examUserRows = computed(() => this.exams()?.perUser ?? []);

  /** Mapea LabelCount[] → ChartDatum[] usando count como valor. */
  private labelsToData(items?: LabelCount[], colorFn?: (l: LabelCount) => string | undefined): ChartDatum[] {
    if (!items) return [];
    return items.map(l => ({ label: l.label, value: l.count, color: colorFn?.(l) }));
  }

  readonly selectedMetric = computed(() => {
    const key = this.selected();
    return key ? this.metrics.find(m => m.key === key) ?? null : null;
  });

  readonly metricValue = computed(() => {
    const s = this.summary();
    const m = this.selectedMetric();
    if (!s || !m) return 'S/D';
    return m.format(m.getValue(s));
  });

  /** Breakdown por sucursal para la métrica activa (seleccionada, u Over-all por defecto) */
  readonly storeBreakdown = computed(() => {
    const m = this.breakdownMetric();
    const r = this.ranking();
    if (!m.getStoreValue || r.length === 0) return [];
    return r
      .map(store => ({
        storeId:   store.storeId,
        storeName: store.storeName || store.storeId,
        value:     m.getStoreValue!(store),
        tasks:     store.totalTasks,
      }))
      .sort((a, b) => m.lowerIsBetter ? a.value - b.value : b.value - a.value);
  });

  /** Breakdown por usuario para la métrica activa (seleccionada, u Over-all por defecto) */
  readonly userBreakdown = computed(() => {
    const m = this.breakdownMetric();
    const u = this.users();
    if (!m.getUserValue || u.length === 0) return [];
    return u
      .map(user => ({
        name:     user.nombre,
        position: user.position,
        turno:    user.turno,
        value:    m.getUserValue!(user),
        tasks:    user.totalTasks,
      }))
      .sort((a, b) => m.lowerIsBetter ? a.value - b.value : b.value - a.value);
  });

  /** Desglose por turno del summary */
  readonly shiftBreakdown = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return s.shiftBreakdown;
  });

  /** Pipeline counts */
  readonly pipeline = computed(() => {
    const s = this.summary();
    if (!s) return null;
    return {
      pending: s.pipelinePending, inProgress: s.pipelineInProgress,
      completed: s.pipelineCompleted, failed: s.pipelineFailed,
      total: s.pipelinePending + s.pipelineInProgress + s.pipelineCompleted + s.pipelineFailed,
    };
  });

  // ── Lifecycle ─────────────────────────────────────────────────────

  ngOnInit(): void {
    const storeId = this.auth.currentUser()?.storeId;
    const isAdmin = this.auth.hasRole('ADMIN');

    if (isAdmin) {
      // ADMIN: métricas globales del sistema — no dependen de tener sucursal asignada
      this.kpiSvc.loadGlobalSummary();
      this.kpiSvc.loadRanking();
      this.kpiSvc.loadUsersResponsibilityGlobal();
      this.kpiSvc.loadAnalyticsIgeo();
    } else if (storeId) {
      this.kpiSvc.loadStoreSummary(storeId);
      this.kpiSvc.loadUsersResponsibility(storeId);
      this.kpiSvc.loadAnalyticsIgeo();
    }

    // KPIs que el backend solo expone por sucursal
    if (storeId) {
      this.kpiSvc.loadCorrectionSpeed(storeId);
      this.kpiSvc.loadIncidentKpis(storeId);
      this.kpiSvc.loadTrainingKpis(storeId);
      this.kpiSvc.loadExamKpis(storeId);
    }
  }

  select(key: string): void {
    this.selected.set(this.selected() === key ? null : key);
  }

  // ── Helpers de UI ─────────────────────────────────────────────────

  barWidth(value: number, metric: MetricDef): number {
    if (metric.unit === '/5') return (value / 5) * 100;
    if (metric.unit === 'min') return Math.min((value / 1500) * 100, 100);
    if (metric.unit === '') return Math.min(value * 10, 100);
    return Math.min(Math.max(value, 0), 100);
  }

  barColor(value: number, metric: MetricDef): string {
    if (metric.lowerIsBetter) {
      if (value <= 10) return 'bg-emerald-500';
      if (value <= 25) return 'bg-amber-500';
      return 'bg-red-500';
    }
    if (metric.unit === '/5') {
      if (value >= 4) return 'bg-emerald-500';
      if (value >= 3) return 'bg-amber-500';
      return 'bg-red-500';
    }
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  }

  valueClass(value: number, metric: MetricDef): string {
    if (value < 0) return 'text-stone-400';
    if (metric.lowerIsBetter) {
      if (value <= 10) return 'text-emerald-700';
      if (value <= 25) return 'text-amber-700';
      return 'text-red-700';
    }
    if (metric.unit === '/5') {
      if (value >= 4) return 'text-emerald-700';
      if (value >= 3) return 'text-amber-700';
      return 'text-red-700';
    }
    if (value >= 80) return 'text-emerald-700';
    if (value >= 60) return 'text-amber-700';
    return 'text-red-700';
  }
}
