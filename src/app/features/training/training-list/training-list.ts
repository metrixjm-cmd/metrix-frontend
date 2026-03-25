import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingService } from '../services/training.service';
import {
  TRAINING_LEVEL_LABELS,
  TRAINING_LEVELS,
  TRAINING_STATUS_LABELS,
  TrainingLevel,
  TrainingResponse,
  TrainingStatus,
} from '../training.models';

/** Resumen de una sucursal para la vista global ADMIN. */
interface StoreSummary {
  storeId: string;
  programadas: number;
  enCurso: number;
  completadas: number;
  noCompletadas: number;
  total: number;
  completionRate: number;
}

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AppDatePipe],
  templateUrl: './training-list.html',
})
export class TrainingList implements OnInit {
  private readonly authSvc     = inject(AuthService);
  readonly trainingSvc = inject(TrainingService);
  private readonly router      = inject(Router);

  readonly loading      = this.trainingSvc.loading;
  readonly error        = this.trainingSvc.error;
  readonly statusLabels: Record<string, string | undefined> = TRAINING_STATUS_LABELS;
  readonly levelLabels:  Record<string, string | undefined> = TRAINING_LEVEL_LABELS;
  readonly levels       = TRAINING_LEVELS;
  readonly statuses: TrainingStatus[] = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'NO_COMPLETADA'];

  // ── Rol ───────────────────────────────────────────────────────────────
  readonly isAdmin      = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente    = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isEjecutador = computed(() =>
    !this.authSvc.hasAnyRole('ADMIN', 'GERENTE')
  );

  // ── Filtros ───────────────────────────────────────────────────────────
  filterStatus  = signal<string>('');
  filterLevel   = signal<string>('');
  filterStore   = signal<string>(''); // solo ADMIN

  readonly filteredTrainings = computed(() => {
    let list = this.trainingSvc.trainings();
    const status = this.filterStatus();
    const level  = this.filterLevel();
    const store  = this.filterStore();
    if (status) list = list.filter(t => t.status === status);
    if (level)  list = list.filter(t => t.level  === level);
    if (store)  list = list.filter(t => t.storeId === store);
    return list;
  });

  // ── KPIs globales (ADMIN) ─────────────────────────────────────────────
  readonly globalStats = computed(() => {
    const all = this.trainingSvc.trainings();
    return {
      total:         all.length,
      programadas:   all.filter(t => t.status === 'PROGRAMADA').length,
      enCurso:       all.filter(t => t.status === 'EN_CURSO').length,
      completadas:   all.filter(t => t.status === 'COMPLETADA').length,
      noCompletadas: all.filter(t => t.status === 'NO_COMPLETADA').length,
    };
  });

  /** Resumen por sucursal para la vista ADMIN. */
  readonly storeSummaries = computed((): StoreSummary[] => {
    const all = this.trainingSvc.trainings();
    const map = new Map<string, TrainingResponse[]>();
    for (const t of all) {
      const list = map.get(t.storeId) ?? [];
      list.push(t);
      map.set(t.storeId, list);
    }
    return Array.from(map.entries()).map(([storeId, list]) => {
      const completadas   = list.filter(t => t.status === 'COMPLETADA').length;
      const noCompletadas = list.filter(t => t.status === 'NO_COMPLETADA').length;
      const terminadas    = completadas + noCompletadas;
      return {
        storeId,
        programadas:   list.filter(t => t.status === 'PROGRAMADA').length,
        enCurso:       list.filter(t => t.status === 'EN_CURSO').length,
        completadas,
        noCompletadas,
        total:         list.length,
        completionRate: terminadas > 0 ? Math.round((completadas / terminadas) * 100) : 0,
      } satisfies StoreSummary;
    }).sort((a, b) => b.total - a.total);
  });

  /** Storeids únicos presentes en los trainings (para el filtro del ADMIN). */
  readonly uniqueStoreIds = computed(() =>
    [...new Set(this.trainingSvc.trainings().map(t => t.storeId))]
  );

  // ── KPIs locales (GERENTE) ────────────────────────────────────────────
  readonly storeStats = computed(() => {
    const all = this.trainingSvc.trainings();
    return {
      total:         all.length,
      programadas:   all.filter(t => t.status === 'PROGRAMADA').length,
      enCurso:       all.filter(t => t.status === 'EN_CURSO').length,
      completadas:   all.filter(t => t.status === 'COMPLETADA').length,
      noCompletadas: all.filter(t => t.status === 'NO_COMPLETADA').length,
    };
  });

  // ── Alertas (ADMIN + GERENTE) ─────────────────────────────────────────
  readonly alerts = computed(() => {
    const now = new Date();
    return this.trainingSvc.trainings().filter(t =>
      t.status === 'NO_COMPLETADA' ||
      (t.status !== 'COMPLETADA' && t.dueAt && new Date(t.dueAt) < now)
    );
  });

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.trainingSvc.loadAll();
    } else if (this.isGerente()) {
      const storeId = this.authSvc.currentUser()?.storeId;
      if (storeId) this.trainingSvc.loadByStore(storeId);
    } else {
      this.trainingSvc.loadMyTrainings();
    }
  }

  goToDetail(training: TrainingResponse): void {
    this.router.navigate(['/training', training.id]);
  }

  filterByStore(storeId: string): void {
    this.filterStore.set(this.filterStore() === storeId ? '' : storeId);
  }

  statusBadgeClass(status: TrainingStatus): string {
    const map: Record<TrainingStatus, string> = {
      PROGRAMADA:    'bg-amber-100 text-amber-700',
      EN_CURSO:      'bg-blue-100 text-blue-700',
      COMPLETADA:    'bg-emerald-100 text-emerald-700',
      NO_COMPLETADA: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-stone-100 text-stone-700';
  }

  levelBadgeClass(level: TrainingLevel): string {
    const map: Record<TrainingLevel, string> = {
      BASICO:     'bg-stone-100 text-stone-600',
      INTERMEDIO: 'bg-blue-50 text-blue-600',
      AVANZADO:   'bg-purple-100 text-purple-700',
    };
    return map[level] ?? 'bg-stone-100 text-stone-600';
  }

  completionBarClass(rate: number): string {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-400';
  }
}
