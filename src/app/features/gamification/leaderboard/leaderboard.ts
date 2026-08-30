import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService }         from '../../auth/services/auth.service';
import { GamificationService } from '../services/gamification.service';
import { LeaderboardEntry }    from '../gamification.models';

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

  readonly loading  = this.gamifSvc.loading;
  readonly error    = this.gamifSvc.error;
  readonly period   = this.gamifSvc.period;

  readonly isAdmin      = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente    = computed(() => this.authSvc.hasRole('GERENTE') && !this.authSvc.hasRole('ADMIN'));
  readonly isEjecutador = computed(() => !this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  /** El ADMIN rankea gerentes; el resto, colaboradores. Gobierna la columna EQUIPO. */
  readonly showingGerentes = this.isAdmin;

  readonly pageTitle = computed(() =>
    this.showingGerentes() ? 'Ranking Gerencial' : 'Ranking de Equipo');

  readonly pageSubtitle = computed(() => this.showingGerentes()
    ? 'Desempeño de gerentes y de los equipos a su cargo'
    : 'Desempeño y gamificación de la sucursal');

  /** La vista gerencial suma la columna EQUIPO, por eso ensancha el grid. */
  readonly gridColumns = computed(() => this.showingGerentes()
    ? '48px 1fr 130px 100px 100px 90px 80px 100px'
    : '48px 1fr 100px 100px 90px 80px 100px');

  readonly gridMinWidth = computed(() => this.showingGerentes() ? '800px' : '680px');

  /**
   * Puntaje con el que se rankea la fila: al gerente se le mide por su equipo,
   * al colaborador por su propio IGEO. El podio debe mostrar este número, o
   * enseñaría una cifra distinta a la que define el orden.
   */
  headlineScore(entry: LeaderboardEntry): number {
    return this.showingGerentes() ? (entry.teamAvgIgeo ?? -1) : entry.igeo;
  }

  // ── Filas del ranking ────────────────────────────────────────────────────

  /**
   * El backend ya entrega el conjunto correcto y numerado para cada rol: al
   * ADMIN los gerentes de toda la cadena, al GERENTE sólo los ejecutadores a su
   * cargo. No hay nada que filtrar ni renumerar aquí, y no hay datos de relleno:
   * si la sucursal no tiene actividad en el período, la vista queda vacía.
   */
  readonly rows = computed((): LeaderboardEntry[] =>
    this.loading() ? [] : this.gamifSvc.leaderboard());

  /** Orden visual del podio: 2º a la izquierda, 1º al centro, 3º a la derecha. */
  readonly podium = computed((): (LeaderboardEntry | null)[] => {
    const r = this.rows();
    return [r[1] ?? null, r[0] ?? null, r[2] ?? null];
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load('weekly');
  }

  selectPeriod(p: 'weekly' | 'monthly'): void {
    this.load(p);
  }

  /**
   * El ADMIN no tiene sucursal asignada: su ranking usa el endpoint gerencial de
   * alcance global. Condicionarlo a `storeId` dejaría la vista vacía.
   */
  private load(period: 'weekly' | 'monthly'): void {
    if (this.isAdmin()) {
      this.gamifSvc.loadGerencialesLeaderboard(period);
      return;
    }

    const storeId = this.authSvc.currentUser()?.storeId ?? '';
    if (!storeId) return;

    this.gamifSvc.loadLeaderboard(storeId, period);
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
