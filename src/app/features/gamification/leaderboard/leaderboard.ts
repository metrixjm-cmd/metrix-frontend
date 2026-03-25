import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';

import { AuthService }         from '../../auth/services/auth.service';
import { GamificationService } from '../services/gamification.service';
import { RhService }           from '../../rh/services/rh.service';
import { SettingsService }     from '../../settings/services/settings.service';
import { LeaderboardEntry }    from '../gamification.models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet],
  templateUrl: './leaderboard.html',
})
export class Leaderboard implements OnInit {
  private readonly authSvc     = inject(AuthService);
  readonly gamifSvc            = inject(GamificationService);
  readonly rhSvc               = inject(RhService);
  readonly settingsSvc         = inject(SettingsService);

  readonly loading     = this.gamifSvc.loading;
  readonly error       = this.gamifSvc.error;
  readonly period      = this.gamifSvc.period;

  readonly isAdmin      = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente    = computed(() => this.authSvc.hasRole('GERENTE') && !this.authSvc.hasRole('ADMIN'));
  readonly isEjecutador = computed(() => !this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  readonly adminRows = computed(() => {
    const users  = this.rhSvc.users();
    const stores = this.settingsSvc.stores();
    const gerentes = users.filter(u => u.roles?.includes('GERENTE'));
    return gerentes.map(g => ({
      id:                g.id,
      nombre:            g.nombre,
      puesto:            g.puesto,
      turno:             g.turno,
      storeName:         stores.find(s => s.id === g.storeId)?.nombre  ?? '—',
      storeCodigo:       stores.find(s => s.id === g.storeId)?.codigo  ?? '',
      colaboradorCount:  users.filter(u => u.storeId === g.storeId && u.roles?.includes('EJECUTADOR')).length,
    }));
  });

  readonly gerenteRows = computed((): LeaderboardEntry[] => {
    const users = this.rhSvc.users();
    const board = this.gamifSvc.leaderboard();
    const ejecutadorIds = new Set(
      users.filter(u => u.roles?.includes('EJECUTADOR')).map(u => u.id)
    );
    return board.filter(e => ejecutadorIds.has(e.userId));
  });

  readonly ejecutadorRows = computed(() => this.gamifSvc.leaderboard());

  readonly tableRows = computed((): LeaderboardEntry[] =>
    this.isGerente() ? this.gerenteRows() : this.ejecutadorRows()
  );

  ngOnInit(): void {
    const storeId = this.authSvc.currentUser()?.storeId ?? '';

    if (this.isAdmin()) {
      this.settingsSvc.loadAll();
      this.rhSvc.loadAll();
      if (!storeId) return;
      setTimeout(() => {
        if (this.rhSvc.users().length === 0 && storeId) {
          this.rhSvc.loadUsersByStore(storeId);
        }
      }, 800);
    } else if (this.isGerente()) {
      if (storeId) {
        this.gamifSvc.loadLeaderboard(storeId, 'weekly');
        this.rhSvc.loadUsersByStore(storeId);
      }
    } else {
      if (storeId) {
        this.gamifSvc.loadLeaderboard(storeId, 'weekly');
      }
    }
  }

  selectPeriod(p: 'weekly' | 'monthly'): void {
    const storeId = this.authSvc.currentUser()?.storeId ?? '';
    if (storeId) this.gamifSvc.loadLeaderboard(storeId, p);
  }

  // ── V0 Helpers ──────────────────────────────────────────────────────────

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
}
