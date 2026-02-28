import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { GamificationService } from '../services/gamification.service';
import { ALL_BADGES, Badge } from '../gamification.models';

@Component({
  selector: 'app-my-badges',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-badges.html',
})
export class MyBadges implements OnInit {
  private readonly authSvc = inject(AuthService);
  readonly gamifSvc        = inject(GamificationService);

  readonly loading = this.gamifSvc.loading;
  readonly error   = this.gamifSvc.error;
  readonly summary = this.gamifSvc.summary;

  /** Catálogo con estado earned/locked para cada insignia. */
  readonly allBadges = computed(() => {
    const earned = this.summary()?.badges ?? [];
    const earnedTypes = new Set(earned.map(b => b.type));
    return ALL_BADGES.map(b => ({
      ...b,
      earned:   earnedTypes.has(b.type),
      earnedAt: earned.find(e => e.type === b.type)?.earnedAt ?? null,
    }));
  });

  readonly igeoLabel = computed(() => {
    const igeo = this.summary()?.igeo ?? -1;
    if (igeo < 0) return 'S/D';
    return igeo.toFixed(1) + '%';
  });

  readonly igeoClass = computed(() => {
    const igeo = this.summary()?.igeo ?? -1;
    if (igeo >= 80) return 'text-emerald-600';
    if (igeo >= 60) return 'text-amber-600';
    return 'text-red-600';
  });

  ngOnInit(): void {
    this.gamifSvc.loadMySummary();
  }

  rankLabel(rank: number, total: number): string {
    if (total === 0) return '—';
    return `#${rank} de ${total}`;
  }
}
