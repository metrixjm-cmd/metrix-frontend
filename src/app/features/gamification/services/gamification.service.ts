import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { GamificationSummary, LeaderboardEntry } from '../gamification.models';

/**
 * Servicio de Gamificación — Sprint 12.
 *
 * Expone estado reactivo vía Signals para leaderboard y resumen personal.
 * El JWT se inyecta automáticamente por el AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class GamificationService {
  private readonly http   = inject(HttpClient);
  private readonly base   = `${environment.apiUrl}/gamification`;

  // ── Estado reactivo ──────────────────────────────────────────────────────
  private readonly _leaderboard = signal<LeaderboardEntry[]>([]);
  private readonly _summary     = signal<GamificationSummary | null>(null);
  private readonly _loading     = signal(false);
  private readonly _error       = signal<string | null>(null);
  private readonly _period      = signal<'weekly' | 'monthly'>('weekly');

  readonly leaderboard = this._leaderboard.asReadonly();
  readonly summary     = this._summary.asReadonly();
  readonly loading     = this._loading.asReadonly();
  readonly error       = this._error.asReadonly();
  readonly period      = this._period.asReadonly();

  // ── Métodos HTTP ─────────────────────────────────────────────────────────

  loadLeaderboard(storeId: string, period: 'weekly' | 'monthly' = 'weekly'): void {
    this._loading.set(true);
    this._error.set(null);
    this._period.set(period);
    this.http
      .get<LeaderboardEntry[]>(`${this.base}/store/${storeId}/leaderboard`, {
        params: { period },
      })
      .subscribe({
        next:  data => { this._leaderboard.set(data); this._loading.set(false); },
        error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  loadMySummary(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<GamificationSummary>(`${this.base}/me`).subscribe({
      next:  data => { this._summary.set(data); this._loading.set(false); },
      error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
    });
  }

  setPeriod(period: 'weekly' | 'monthly'): void {
    this._period.set(period);
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al cargar datos de gamificación';
  }
}
