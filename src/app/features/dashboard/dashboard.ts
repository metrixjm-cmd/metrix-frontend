import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../auth/services/auth.service';
import { IgeoAnalyticsResponse } from '../kpi/kpi.models';
import { TaskService } from '../tasks/services/task.service';
import { KpiService } from '../kpi/services/kpi.service';
import { GamificationService } from '../gamification/services/gamification.service';
import { IncidentService } from '../incidents/services/incident.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

export interface KpiCard {
  label:    string;
  value:    string;
  delta:    string;
  deltaUp:  boolean;
  sub:      string;
  data:     number[];
  color:    string;
  accentBg: string;
}

export interface StoreRanking {
  rank:   number;
  name:   string;
  igeo:   number;
  onTime: number;
  tasks:  number;
  trend:  'up' | 'down' | 'same';
}

export interface LiveEvent {
  id:       string;
  time:     string;
  actor:    string;
  action:   'assigned' | 'started' | 'completed' | 'failed';
  taskName: string;
  store:    string;
  shift:    string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe, StatusBadgeComponent],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  readonly auth     = inject(AuthService);
  readonly taskSvc  = inject(TaskService);
  readonly kpiSvc   = inject(KpiService);
  readonly gamifSvc    = inject(GamificationService);
  readonly incidentSvc = inject(IncidentService);

  // ── Roles ─────────────────────────────────────────────────────────────────
  readonly isAdmin       = computed(() => this.auth.hasRole('ADMIN'));
  readonly isManagerView = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isEjecutador  = computed(() => !this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  readonly dashboardTitle = computed(() => {
    if (this.isAdmin())       return 'Dashboard Ejecutivo';
    if (this.isManagerView()) return 'Dashboard Gerencial';
    return 'Mi Turno';
  });

  // ── KPI cards fallback ────────────────────────────────────────────────────
  private readonly fallbackKpis: KpiCard[] = [
    { label: 'IGEO',         value: '—', delta: '', deltaUp: true,  sub: 'Índice Global Ejecución',     data: [50,50,50,50,50,50,50,50,50,50], color: '#ea580c', accentBg: 'orange'  },
    { label: 'On-Time Rate', value: '—', delta: '', deltaUp: true,  sub: 'Tareas completadas a tiempo', data: [50,50,50,50,50,50,50,50,50,50], color: '#10b981', accentBg: 'emerald' },
    { label: 'Re-trabajo',   value: '—', delta: '', deltaUp: false, sub: 'Tareas devueltas / total',    data: [1],                             color: '#f59e0b', accentBg: 'amber'   },
    { label: 'Críticas Pend.',value: '—',delta: '', deltaUp: false, sub: 'Sin ejecutar este turno',     data: [1],                             color: '#ef4444', accentBg: 'red'     },
    { label: 'Capacitación', value: '—', delta: '', deltaUp: true,  sub: 'Capacitaciones completadas',  data: [1],                             color: '#8b5cf6', accentBg: 'violet'  },
  ];

  private readonly fallbackRanking: StoreRanking[] = [
    { rank: 1, name: 'Suc. Centro Histórico', igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
    { rank: 2, name: 'Suc. Plaza Mayor',      igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
    { rank: 3, name: 'Suc. Torres Norte',     igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
  ];

  // ── KPI signals desde servicio ────────────────────────────────────────────
  readonly kpis = computed(() => this.kpiSvc.kpiCards() ?? this.fallbackKpis);

  readonly ranking = computed(() =>
    this.kpiSvc.rankingForDisplay().length > 0
      ? this.kpiSvc.rankingForDisplay()
      : this.fallbackRanking
  );

  readonly pipelineSteps = computed(() => {
    const c = this.kpiSvc.pipelineCounts();
    return [
      { label: 'Asignada',    color: 'text-stone-500',   bg: 'bg-stone-200',   count: c?.pending    ?? 0 },
      { label: 'En Progreso', color: 'text-blue-600',    bg: 'bg-blue-100',    count: c?.inProgress ?? 0 },
      { label: 'Completada',  color: 'text-emerald-700', bg: 'bg-emerald-100', count: c?.completed  ?? 0 },
      { label: 'Fallida',     color: 'text-red-600',     bg: 'bg-red-100',     count: c?.failed     ?? 0 },
    ];
  });

  // ── GERENTE: Tabla de equipo (KPI #7 top-5) ───────────────────────────────
  readonly teamRanking = computed(() =>
    this.kpiSvc.usersResponsibility().slice(0, 5)
  );

  // ── GERENTE: Desglose por turno (KPI #5) ──────────────────────────────────
  readonly shiftBreakdown = computed(() =>
    this.kpiSvc.summary()?.shiftBreakdown ?? []
  );

  // ── GERENTE: Tasa de capacitación ─────────────────────────────────────────
  readonly trainingRate = computed(() =>
    this.kpiSvc.summary()?.trainingCompletionRate ?? 0
  );

  // ── ADMIN: Sucursales en alerta (IGEO < 70) ───────────────────────────────
  readonly storesInAlert = computed(() =>
    this.kpiSvc.rankingForDisplay().filter(s => s.igeo > 0 && s.igeo < 70)
  );

  // ── Incidencias activas (ADMIN + GERENTE) ─────────────────────────────────
  readonly openIncidentsCount    = computed(() => this.incidentSvc.openCount());
  readonly criticalOpenIncidents = computed(() => this.incidentSvc.criticalOpen());

  // ── EJECUTADOR: Resumen de gamificación ───────────────────────────────────
  readonly gamifSummary = computed(() => this.gamifSvc.summary());

  // ── Live feed derivado de tareas reales ──────────────────────────────────
  private readonly _actionMap: Record<string, LiveEvent['action']> = {
    PENDING:     'assigned',
    IN_PROGRESS: 'started',
    COMPLETED:   'completed',
    FAILED:      'failed',
  };

  readonly liveFeed = computed<LiveEvent[]>(() => {
    const tasks = this.taskSvc.tasks();
    if (!tasks.length) return [];

    return [...tasks]
      .sort((a, b) => {
        const ta = a.finishedAt ?? a.startedAt ?? a.createdAt;
        const tb = b.finishedAt ?? b.startedAt ?? b.createdAt;
        return new Date(tb).getTime() - new Date(ta).getTime();
      })
      .slice(0, 6)
      .map(task => {
        const ts   = task.finishedAt ?? task.startedAt ?? task.createdAt;
        const d    = new Date(ts);
        const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        return {
          id:       task.id,
          time,
          actor:    task.assignedToName,
          action:   this._actionMap[task.status] ?? 'assigned',
          taskName: task.title,
          store:    task.storeId,
          shift:    task.shift,
        } satisfies LiveEvent;
      });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const storeId = this.auth.currentUser()?.storeId ?? '';

    if (this.isAdmin()) {
      if (storeId) {
        this.taskSvc.loadTasksByStore(storeId);
        this.kpiSvc.loadStoreSummary(storeId);
        this.kpiSvc.loadRanking();
        this.kpiSvc.loadUsersResponsibility(storeId);
        this.kpiSvc.loadAnalyticsIgeo();
        this.incidentSvc.loadByStore(storeId);
      }
    } else if (this.isManagerView()) {
      // GERENTE
      if (storeId) {
        this.taskSvc.loadTasksByStore(storeId);
        this.kpiSvc.loadStoreSummary(storeId);
        this.kpiSvc.loadUsersResponsibility(storeId);
        this.kpiSvc.loadAnalyticsIgeo();
        this.incidentSvc.loadByStore(storeId);
      }
    } else {
      // EJECUTADOR
      this.taskSvc.loadMyTasks();
      this.kpiSvc.loadMySummary();
      this.gamifSvc.loadMySummary();
    }
  }

  // ── Sparkline helpers ─────────────────────────────────────────────────────

  sparklinePath(data: number[], w = 120, h = 36): string {
    const min   = Math.min(...data);
    const max   = Math.max(...data);
    const range = max - min || 1;
    const xs    = data.map((_, i) => (i / (data.length - 1)) * w);
    const ys    = data.map(v => h - ((v - min) / range) * (h - 4) - 2);
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  }

  sparklineFill(data: number[], w = 120, h = 36): string {
    return `${this.sparklinePath(data, w, h)} L ${w},${h} L 0,${h} Z`;
  }

  // ── Live feed helpers ─────────────────────────────────────────────────────

  actionLabel(action: LiveEvent['action']): string {
    return ({ assigned: 'asignó', started: 'inició', completed: 'completó', failed: 'reportó falla en' })[action];
  }

  actionDotClass(action: LiveEvent['action']): string {
    return ({ assigned: 'bg-slate-500', started: 'bg-blue-400 animate-pulse', completed: 'bg-emerald-400', failed: 'bg-red-400' })[action];
  }

  actionTextClass(action: LiveEvent['action']): string {
    return ({ assigned: 'text-slate-400', started: 'text-blue-400', completed: 'text-emerald-400', failed: 'text-red-400' })[action];
  }

  // ── Ranking helpers ───────────────────────────────────────────────────────

  rankMedalClass(rank: number): string {
    if (rank === 1) return 'bg-amber-100 text-amber-700 border border-amber-300 font-bold';
    if (rank === 2) return 'bg-stone-100 text-stone-500 border border-stone-300 font-bold';
    if (rank === 3) return 'bg-orange-100 text-orange-600 border border-orange-300 font-bold';
    return 'bg-stone-50 text-stone-400 border border-stone-200';
  }

  igeoBarClass(igeo: number): string {
    if (igeo >= 90) return 'bg-emerald-500';
    if (igeo >= 80) return 'bg-indigo-500';
    if (igeo >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  }

  trendIcon(trend: StoreRanking['trend']): string {
    if (trend === 'up')   return 'M5 10l7-7m0 0l7 7m-7-7v18';
    if (trend === 'down') return 'M19 14l-7 7m0 0l-7-7m7 7V3';
    return 'M20 12H4';
  }

  trendClass(trend: StoreRanking['trend']): string {
    if (trend === 'up')   return 'text-emerald-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-slate-500';
  }

  // ── Team / shift helpers ──────────────────────────────────────────────────

  igeoTextClass(igeo: number): string {
    if (igeo >= 80) return 'text-emerald-600 font-bold';
    if (igeo >= 60) return 'text-amber-600 font-bold';
    return 'text-red-600 font-bold';
  }

  shiftBarColor(otr: number): string {
    if (otr >= 80) return 'bg-emerald-500';
    if (otr >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  }

  otrLabel(otr: number): string {
    return otr < 0 ? 'S/D' : `${otr.toFixed(1)}%`;
  }

  // ── IGEO analítico helpers ─────────────────────────────────────────────────

  igeoPillarArray(igeo: IgeoAnalyticsResponse): { n: string; v: number }[] {
    const p = igeo.data.global.pillar_scores;
    return [
      { n: 'Cumpl.',   v: p.cumplimiento },
      { n: 'Tiempo',   v: p.tiempo },
      { n: 'Calidad',  v: p.calidad },
      { n: 'Consist.', v: p.consistencia },
    ];
  }
}
