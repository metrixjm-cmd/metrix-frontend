import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../auth/services/auth.service';
import { TaskService } from '../tasks/services/task.service';
import { KpiService } from '../kpi/services/kpi.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { TaskResponse } from '../tasks/models/task.models';

export interface KpiCard {
  label:     string;
  value:     string;
  delta:     string;
  deltaUp:   boolean;
  sub:       string;
  data:      number[];
  color:     string;
  accentBg:  string;
}

export interface StoreRanking {
  rank:    number;
  name:    string;
  igeo:    number;
  onTime:  number;
  tasks:   number;
  trend:   'up' | 'down' | 'same';
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
  readonly auth    = inject(AuthService);
  readonly taskSvc = inject(TaskService);
  readonly kpiSvc  = inject(KpiService);

  readonly isManagerView = computed(() =>
    this.auth.hasAnyRole('ADMIN', 'GERENTE'),
  );

  // ── KPI cards fallback (hardcoded — se usa hasta que el backend responda) ─
  private readonly fallbackKpis: KpiCard[] = [
    {
      label:    'IGEO',
      value:    '—',
      delta:    '',
      deltaUp:  true,
      sub:      'Índice Global Ejecución',
      data:     [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      color:    '#ea580c',
      accentBg: 'orange',
    },
    {
      label:    'On-Time Rate',
      value:    '—',
      delta:    '',
      deltaUp:  true,
      sub:      'Tareas completadas a tiempo',
      data:     [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      color:    '#10b981',
      accentBg: 'emerald',
    },
    {
      label:    'Re-trabajo',
      value:    '—',
      delta:    '',
      deltaUp:  false,
      sub:      'Tareas devueltas / total',
      data:     [1],
      color:    '#f59e0b',
      accentBg: 'amber',
    },
    {
      label:    'Críticas Pend.',
      value:    '—',
      delta:    '',
      deltaUp:  false,
      sub:      'Sin ejecutar este turno',
      data:     [1],
      color:    '#ef4444',
      accentBg: 'red',
    },
  ];

  // ── Ranking fallback ─────────────────────────────────────────────────────
  private readonly fallbackRanking: StoreRanking[] = [
    { rank: 1, name: 'Suc. Centro Histórico', igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
    { rank: 2, name: 'Suc. Plaza Mayor',      igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
    { rank: 3, name: 'Suc. Torres Norte',     igeo: 0, onTime: 0, tasks: 0, trend: 'same' },
  ];

  // ── Computed signals desde KpiService ────────────────────────────────────
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

  // ── Live feed (mock hasta Sprint WebSocket) ──────────────────────────────
  readonly liveFeed = signal<LiveEvent[]>([
    { id: '1', time: '09:42', actor: 'María López',     action: 'completed', taskName: 'Checklist de Apertura',      store: 'Centro', shift: 'Matutino'   },
    { id: '2', time: '09:39', actor: 'Carlos Mendoza',  action: 'started',   taskName: 'Control de Temperatura',    store: 'Plaza Mayor', shift: 'Matutino' },
    { id: '3', time: '09:35', actor: 'Ana Ruiz',        action: 'failed',    taskName: 'Orden de Proveedores',      store: 'Torres Norte', shift: 'Matutino' },
    { id: '4', time: '09:28', actor: 'Jorge Sánchez',   action: 'completed', taskName: 'Limpieza Zona de Cocina',   store: 'Centro', shift: 'Matutino'     },
    { id: '5', time: '09:21', actor: 'Laura Torres',    action: 'assigned',  taskName: 'Inventario de Insumos',     store: 'Plaza Mayor', shift: 'Vespertino' },
    { id: '6', time: '09:17', actor: 'Miguel Flores',   action: 'started',   taskName: 'Checklist de Seguridad',    store: 'Periferia Sur', shift: 'Matutino' },
    { id: '7', time: '09:11', actor: 'Patricia Gómez',  action: 'completed', taskName: 'Capacitación BPM',          store: 'Torres Norte', shift: 'Matutino' },
    { id: '8', time: '09:04', actor: 'Rodolfo Vargas',  action: 'assigned',  taskName: 'Control de Alérgenos',      store: 'Galerías Oeste', shift: 'Matutino' },
  ]);

  ngOnInit(): void {
    if (this.isManagerView()) {
      const storeId = this.auth.currentUser()?.storeId ?? '';
      if (storeId) {
        this.taskSvc.loadTasksByStore(storeId);
        this.kpiSvc.loadStoreSummary(storeId);
        if (this.auth.hasRole('ADMIN')) this.kpiSvc.loadRanking();
      }
    } else {
      this.taskSvc.loadMyTasks();
      this.kpiSvc.loadMySummary();
    }
  }

  // ── Sparkline SVG path generator ─────────────────────────────────────────

  sparklinePath(data: number[], w = 120, h = 36): string {
    const min   = Math.min(...data);
    const max   = Math.max(...data);
    const range = max - min || 1;
    const xs    = data.map((_, i) => (i / (data.length - 1)) * w);
    const ys    = data.map(v => h - ((v - min) / range) * (h - 4) - 2);
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  }

  sparklineFill(data: number[], w = 120, h = 36): string {
    const line = this.sparklinePath(data, w, h);
    return `${line} L ${w},${h} L 0,${h} Z`;
  }

  // ── Live feed helpers ─────────────────────────────────────────────────────

  actionLabel(action: LiveEvent['action']): string {
    const map: Record<LiveEvent['action'], string> = {
      assigned:  'asignó',
      started:   'inició',
      completed: 'completó',
      failed:    'reportó falla en',
    };
    return map[action];
  }

  actionDotClass(action: LiveEvent['action']): string {
    const map: Record<LiveEvent['action'], string> = {
      assigned:  'bg-slate-500',
      started:   'bg-blue-400 animate-pulse',
      completed: 'bg-emerald-400',
      failed:    'bg-red-400',
    };
    return map[action];
  }

  actionTextClass(action: LiveEvent['action']): string {
    const map: Record<LiveEvent['action'], string> = {
      assigned:  'text-slate-400',
      started:   'text-blue-400',
      completed: 'text-emerald-400',
      failed:    'text-red-400',
    };
    return map[action];
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
}
