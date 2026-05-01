import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService }         from '../../auth/services/auth.service';
import { GamificationService } from '../services/gamification.service';
import { RhService }           from '../../rh/services/rh.service';
import { SettingsService }     from '../../settings/services/settings.service';
import { LeaderboardEntry }    from '../gamification.models';

export interface MetricCard {
  label:       string;
  value:       string;
  sub:         string;
  subHighlight?: boolean;
  iconPath:    string;
  iconBg:      string;
  iconColor:   string;
  barGradient: string;
  barWidth:    number;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrl:    './leaderboard.scss',
})
export class Leaderboard implements OnInit {
  private readonly authSvc  = inject(AuthService);
  readonly gamifSvc         = inject(GamificationService);
  readonly rhSvc            = inject(RhService);
  readonly settingsSvc      = inject(SettingsService);

  readonly loading  = this.gamifSvc.loading;
  readonly error    = this.gamifSvc.error;
  readonly period   = this.gamifSvc.period;

  readonly isAdmin      = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente    = computed(() => this.authSvc.hasRole('GERENTE') && !this.authSvc.hasRole('ADMIN'));
  readonly isEjecutador = computed(() => !this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  // ── Mock data (fallback when API devuelve vacío) ─────────────────────────
  readonly mockLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1, userId: 'mock-1', nombre: 'ejecutadores de carlos',
      puesto: 'Ejecutador', turno: 'VESPERTINO',
      igeo: 34.2, igeoChange: 2, totalTasks: 25, completedTasks: 17, onTimeRate: 68.0,
      badges: [
        { type: 'PUNTUAL_ELITE',  title: 'Puntual Elite',  description: '', icon: '⏱️', earnedAt: '' },
        { type: 'VELOCIDAD_RAYO', title: 'Velocidad Rayo', description: '', icon: '⚡', earnedAt: '' },
      ],
    },
    {
      rank: 2, userId: 'mock-2', nombre: 'Carlos gerente',
      puesto: 'Gerente', turno: 'MATUTINO',
      igeo: 30.0, igeoChange: 1, totalTasks: 20, completedTasks: 12, onTimeRate: 60.0,
      badges: [
        { type: 'PUNTUAL_ELITE',   title: 'Puntual Elite',   description: '', icon: '⏱️', earnedAt: '' },
        { type: 'COLABORADOR_MES', title: 'Colaborador Mes', description: '', icon: '🥇', earnedAt: '' },
      ],
    },
    {
      rank: 3, userId: 'mock-3', nombre: 'Administrador',
      puesto: 'Admin', turno: 'ADMIN',
      igeo: 26.1, igeoChange: -1, totalTasks: 10, completedTasks: 6, onTimeRate: 54.0,
      badges: [
        { type: 'CERO_RETRABAJOS', title: 'Cero Retrabajos', description: '', icon: '✅', earnedAt: '' },
      ],
    },
    {
      rank: 4, userId: 'mock-4', nombre: 'Luis Amaral',
      puesto: 'Ejecutador', turno: 'Suc. San Pablo',
      igeo: 22.8, igeoChange: 2, totalTasks: 8, completedTasks: 5, onTimeRate: 50.0,
      badges: [
        { type: 'RACHA_7', title: 'Racha de 7', description: '', icon: '🔥', earnedAt: '' },
      ],
    },
    {
      rank: 5, userId: 'mock-5', nombre: 'Lidia Sánchez',
      puesto: 'Ejecutador', turno: 'Suc. Central',
      igeo: 21.4, igeoChange: -1, totalTasks: 12, completedTasks: 6, onTimeRate: 48.0,
      badges: [
        { type: 'CERO_RETRABAJOS', title: 'Cero Retrabajos', description: '', icon: '✅', earnedAt: '' },
      ],
    },
  ];

  // ── Metric cards (datos mock — sin endpoint aún) ─────────────────────────
  readonly metrics: MetricCard[] = [
    {
      label: 'PARTICIPACIÓN',
      value: '82%',
      sub: '21 / 25 colaboradores',
      iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      iconBg:    'icon-bg-blue',
      iconColor: 'icon-blue',
      barGradient: 'linear-gradient(90deg,#3b82f6,#06b6d4)',
      barWidth: 82,
    },
    {
      label: 'CUMPLIMIENTO',
      value: '29.3%',
      sub: 'Índice global de ejecución',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconBg:    'icon-bg-cyan',
      iconColor: 'icon-cyan',
      barGradient: 'linear-gradient(90deg,#06b6d4,#22d3ee)',
      barWidth: 29,
    },
    {
      label: 'INSIGNIAS GANADAS',
      value: '18',
      sub: '+3 vs. semana anterior',
      subHighlight: true,
      iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      iconBg:    'icon-bg-amber',
      iconColor: 'icon-amber',
      barGradient: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
      barWidth: 72,
    },
    {
      label: 'RACHA ACTIVA',
      value: '5 días',
      sub: '¡Sigue así!',
      subHighlight: true,
      iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
      iconBg:    'icon-bg-orange',
      iconColor: 'icon-orange',
      barGradient: 'linear-gradient(90deg,#f97316,#fb923c)',
      barWidth: 50,
    },
  ];

  // ── Computed: filas reales ────────────────────────────────────────────────
  readonly adminRows = computed(() => {
    const users  = this.rhSvc.users();
    const stores = this.settingsSvc.stores();
    const gerentes = users.filter(u => u.roles?.includes('GERENTE'));
    return gerentes.map(g => ({
      id:               g.id,
      nombre:           g.nombre,
      puesto:           g.puesto,
      turno:            g.turno,
      storeName:        stores.find(s => s.id === g.storeId)?.nombre ?? '—',
      storeCodigo:      stores.find(s => s.id === g.storeId)?.codigo ?? '',
      colaboradorCount: users.filter(u => u.storeId === g.storeId && u.roles?.includes('EJECUTADOR')).length,
    }));
  });

  readonly gerenteRows = computed((): LeaderboardEntry[] => {
    const users = this.rhSvc.users();
    const board = this.gamifSvc.leaderboard();
    const ejecutadorIds = new Set(users.filter(u => u.roles?.includes('EJECUTADOR')).map(u => u.id));
    return board.filter(e => ejecutadorIds.has(e.userId));
  });

  readonly ejecutadorRows = computed(() => this.gamifSvc.leaderboard());

  readonly tableRows = computed((): LeaderboardEntry[] => {
    if (this.isAdmin()) return this.gamifSvc.leaderboard();
    return this.isGerente() ? this.gerenteRows() : this.ejecutadorRows();
  });

  readonly top3Podium = computed(() => {
    const rows = this.tableRows();
    const podium: (LeaderboardEntry | null)[] = [null, null, null];
    if (rows[0]) podium[1] = rows[0];
    if (rows[1]) podium[0] = rows[1];
    if (rows[2]) podium[2] = rows[2];
    return podium;
  });

  // ── Efectivos con fallback a mock ─────────────────────────────────────────
  readonly effectiveRows = computed((): LeaderboardEntry[] => {
    if (this.loading()) return [];
    const real = this.tableRows();
    return real.length > 0 ? real : this.mockLeaderboard;
  });

  readonly effectivePodium = computed(() => {
    const rows = this.effectiveRows();
    const podium: (LeaderboardEntry | null)[] = [null, null, null];
    if (rows[0]) podium[1] = rows[0]; // 1er lugar: centro
    if (rows[1]) podium[0] = rows[1]; // 2do lugar: izquierda
    if (rows[2]) podium[2] = rows[2]; // 3er lugar: derecha
    return podium;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const storeId = this.authSvc.currentUser()?.storeId ?? '';

    if (this.isAdmin()) {
      this.settingsSvc.loadAll();
      this.rhSvc.loadAll();
      if (storeId) {
        this.gamifSvc.loadLeaderboard(storeId, 'weekly');
        setTimeout(() => {
          if (this.rhSvc.users().length === 0) this.rhSvc.loadUsersByStore(storeId);
        }, 800);
      }
    } else if (this.isGerente()) {
      if (storeId) {
        this.gamifSvc.loadLeaderboard(storeId, 'weekly');
        this.rhSvc.loadUsersByStore(storeId);
      }
    } else {
      if (storeId) this.gamifSvc.loadLeaderboard(storeId, 'weekly');
    }
  }

  selectPeriod(p: 'weekly' | 'monthly'): void {
    const storeId = this.authSvc.currentUser()?.storeId ?? '';
    if (storeId) this.gamifSvc.loadLeaderboard(storeId, p);
  }

  // ── Helpers visuales ─────────────────────────────────────────────────────

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  rankBadgeClass(rank: number): string {
    if (rank === 1) return 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg shadow-slate-400/30';
    if (rank === 3) return 'bg-gradient-to-br from-amber-500 to-amber-800 shadow-lg shadow-amber-500/30';
    return '';
  }

  celebrationEmojis(rank: number): { emoji: string; cls: string; delay: string }[] {
    const map: Record<number, string[]> = { 1: ['🏆','👑','🔥'], 2: ['🥈','⭐','💪'], 3: ['🥉','✨','👏'] };
    if (!map[rank]) return [];
    return map[rank].map((emoji, i) => ({
      emoji,
      cls: rank === 1 ? 'animate-bounce' : 'animate-pulse',
      delay: `${i * 150}ms`,
    }));
  }

  progressPillClass(value: number): string {
    if (value >= 100) return 'bg-emerald-500 text-white';
    if (value >= 90)  return 'bg-emerald-100 text-emerald-700';
    if (value >= 80)  return 'bg-amber-100 text-amber-700';
    if (value >= 70)  return 'bg-orange-100 text-orange-700';
    return                   'bg-red-100 text-red-700';
  }

  // ── Helpers de podio ────────────────────────────────────────────────────

  podiumCardClass(rank: number): string {
    if (rank === 1) return 'gamif-podium-card gamif-podium-card--gold';
    if (rank === 2) return 'gamif-podium-card gamif-podium-card--silver';
    if (rank === 3) return 'gamif-podium-card gamif-podium-card--bronze';
    return 'gamif-podium-card';
  }

  podiumAvatarClass(rank: number): string {
    if (rank === 1) return 'gamif-avatar gamif-avatar--gold';
    if (rank === 2) return 'gamif-avatar gamif-avatar--silver';
    if (rank === 3) return 'gamif-avatar gamif-avatar--bronze';
    return 'gamif-avatar';
  }

  podiumScoreColor(rank: number): string {
    if (rank === 1) return 'text-cyan-400';
    if (rank === 2) return 'text-blue-300';
    if (rank === 3) return 'text-purple-300';
    return 'text-white';
  }

  podiumRankBadgeClass(rank: number): string {
    if (rank === 1) return 'gamif-rank-badge gamif-rank-badge--gold';
    if (rank === 2) return 'gamif-rank-badge gamif-rank-badge--silver';
    if (rank === 3) return 'gamif-rank-badge gamif-rank-badge--bronze';
    return 'gamif-rank-badge';
  }

  // ── Helpers de tabla ────────────────────────────────────────────────────

  rankColor(rank: number): string {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-slate-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-white/50';
  }

  rankRowClass(rank: number): string {
    if (rank === 1) return 'gamif-row gamif-row--gold';
    if (rank === 2) return 'gamif-row gamif-row--silver';
    if (rank === 3) return 'gamif-row gamif-row--bronze';
    return 'gamif-row';
  }

  avatarRowClass(rank: number): string {
    if (rank === 1) return 'gamif-avatar-sm gamif-avatar-sm--gold';
    if (rank === 2) return 'gamif-avatar-sm gamif-avatar-sm--silver';
    if (rank === 3) return 'gamif-avatar-sm gamif-avatar-sm--bronze';
    return 'gamif-avatar-sm gamif-avatar-sm--default';
  }

  badgeShieldColor(badgeType: string): string {
    const map: Record<string, string> = {
      'PUNTUAL_ELITE':   'shield-blue',
      'CERO_RETRABAJOS': 'shield-emerald',
      'VELOCIDAD_RAYO':  'shield-cyan',
      'COLABORADOR_MES': 'shield-amber',
      'RACHA_7':         'shield-orange',
    };
    return map[badgeType] ?? 'shield-purple';
  }

  barWidth(value: number): string {
    return `${Math.min(Math.max(value, 0), 100)}%`;
  }
}
