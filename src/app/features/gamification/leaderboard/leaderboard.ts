import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { GamificationService } from '../services/gamification.service';
import { LeaderboardEntry } from '../gamification.models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leaderboard.html',
})
export class Leaderboard implements OnInit {
  private readonly authSvc  = inject(AuthService);
  readonly gamifSvc         = inject(GamificationService);

  readonly loading     = this.gamifSvc.loading;
  readonly error       = this.gamifSvc.error;
  readonly period      = this.gamifSvc.period;
  readonly leaderboard = this.gamifSvc.leaderboard;

  readonly isGerente = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  /** Top 3 para el podio. */
  readonly podium = computed((): LeaderboardEntry[] =>
    this.leaderboard().slice(0, 3)
  );

  /** Resto del ranking (posición 4 en adelante). */
  readonly rest = computed((): LeaderboardEntry[] =>
    this.leaderboard().slice(3)
  );

  ngOnInit(): void {
    const storeId = this.authSvc.currentUser()?.storeId;
    if (storeId) {
      this.gamifSvc.loadLeaderboard(storeId, 'weekly');
    }
  }

  selectPeriod(p: 'weekly' | 'monthly'): void {
    const storeId = this.authSvc.currentUser()?.storeId;
    if (storeId) {
      this.gamifSvc.loadLeaderboard(storeId, p);
    }
  }

  igeoClass(igeo: number): string {
    if (igeo >= 80) return 'text-emerald-600 font-bold';
    if (igeo >= 60) return 'text-amber-600 font-bold';
    return 'text-red-600 font-bold';
  }

  deltaClass(delta: number): string {
    if (delta > 0)  return 'text-emerald-600';
    if (delta < 0)  return 'text-red-500';
    return 'text-stone-400';
  }

  deltaIcon(delta: number): string {
    if (delta > 0) return '▲';
    if (delta < 0) return '▼';
    return '─';
  }

  podiumHeight(rank: number): string {
    if (rank === 1) return 'h-28';
    if (rank === 2) return 'h-20';
    return 'h-14';
  }

  podiumOrder(rank: number): string {
    if (rank === 1) return 'order-2';
    if (rank === 2) return 'order-1';
    return 'order-3';
  }

  podiumBadge(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    return '🥉';
  }
}
