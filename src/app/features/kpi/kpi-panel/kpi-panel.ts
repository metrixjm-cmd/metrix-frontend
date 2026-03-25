import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { KpiService } from '../services/kpi.service';
import { KpiSummary, StoreRankingEntry, UserResponsibilityEntry } from '../kpi.models';

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
  imports: [RouterLink, SlicePipe],
  templateUrl: './kpi-panel.html',
})
export class KpiPanel implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly kpiSvc = inject(KpiService);

  readonly selected = signal<string | null>(null);

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

  // ── Signals derivados ─────────────────────────────────────────────

  readonly summary  = this.kpiSvc.summary;
  readonly ranking  = this.kpiSvc.ranking;
  readonly users    = this.kpiSvc.usersResponsibility;
  readonly loading  = this.kpiSvc.loading;

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

  /** Breakdown por sucursal para la métrica seleccionada */
  readonly storeBreakdown = computed(() => {
    const m = this.selectedMetric();
    const r = this.ranking();
    if (!m || !m.getStoreValue || r.length === 0) return [];
    return r
      .map(store => ({
        storeId: store.storeId,
        value:   m.getStoreValue!(store),
        tasks:   store.totalTasks,
      }))
      .sort((a, b) => m.lowerIsBetter ? a.value - b.value : b.value - a.value);
  });

  /** Breakdown por usuario para la métrica seleccionada */
  readonly userBreakdown = computed(() => {
    const m = this.selectedMetric();
    const u = this.users();
    if (!m || !m.getUserValue || u.length === 0) return [];
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
    if (storeId) {
      this.kpiSvc.loadStoreSummary(storeId);
      this.kpiSvc.loadRanking();
      this.kpiSvc.loadUsersResponsibility(storeId);
      this.kpiSvc.loadCorrectionSpeed(storeId);
      this.kpiSvc.loadAnalyticsIgeo();
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
