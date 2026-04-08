import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../../settings/services/settings.service';
import { TrainingService } from '../services/training.service';
import {
  TRAINING_LEVEL_LABELS,
  TRAINING_LEVELS,
  TRAINING_STATUS_LABELS,
  TrainingLevel,
  TrainingResponse,
  TrainingStatus,
} from '../training.models';

interface StoreSummary {
  storeId: string;
  programadas: number;
  enCurso: number;
  completadas: number;
  noCompletadas: number;
  total: number;
  completionRate: number;
}

interface TrainingListRow extends TrainingResponse {
  groupSize: number;
}

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AppDatePipe],
  templateUrl: './training-list.html',
})
export class TrainingList implements OnInit {
  private readonly authSvc = inject(AuthService);
  readonly trainingSvc = inject(TrainingService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router = inject(Router);

  readonly loading = this.trainingSvc.loading;
  readonly error = this.trainingSvc.error;
  readonly statusLabels: Record<string, string | undefined> = TRAINING_STATUS_LABELS;
  readonly levelLabels: Record<string, string | undefined> = TRAINING_LEVEL_LABELS;
  readonly levels = TRAINING_LEVELS;
  readonly statuses: TrainingStatus[] = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'NO_COMPLETADA'];

  readonly isAdmin = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isEjecutador = computed(() => !this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  filterStatus = signal<string>('');
  filterLevel = signal<string>('');
  filterStore = signal<string>(''); // solo ADMIN

  readonly storeNames = computed(() => {
    const map = new Map<string, string>();
    for (const store of this.settingsSvc.stores()) {
      map.set(store.id, store.nombre);
    }
    return map;
  });

  readonly dashboardTrainings = computed<TrainingListRow[]>(() => {
    if (this.isGerente()) {
      return this.groupTrainings(this.trainingSvc.trainings());
    }
    return this.trainingSvc.trainings().map(training => ({ ...training, groupSize: 1 }));
  });

  readonly filteredTrainings = computed(() => {
    let list = this.dashboardTrainings();
    const status = this.filterStatus();
    const level = this.filterLevel();
    const store = this.filterStore();
    if (status) list = list.filter(training => training.status === status);
    if (level) list = list.filter(training => training.level === level);
    if (store) list = list.filter(training => training.storeId === store);
    return list;
  });

  readonly globalStats = computed(() => {
    const all = this.dashboardTrainings();
    return {
      total: all.length,
      programadas: all.filter(training => training.status === 'PROGRAMADA').length,
      enCurso: all.filter(training => training.status === 'EN_CURSO').length,
      completadas: all.filter(training => training.status === 'COMPLETADA').length,
      noCompletadas: all.filter(training => training.status === 'NO_COMPLETADA').length,
    };
  });

  readonly storeSummaries = computed((): StoreSummary[] => {
    const all = this.dashboardTrainings();
    const map = new Map<string, TrainingListRow[]>();
    for (const training of all) {
      const bucket = map.get(training.storeId) ?? [];
      bucket.push(training);
      map.set(training.storeId, bucket);
    }

    return Array.from(map.entries())
      .map(([storeId, list]) => {
        const completadas = list.filter(training => training.status === 'COMPLETADA').length;
        const noCompletadas = list.filter(training => training.status === 'NO_COMPLETADA').length;
        const terminadas = completadas + noCompletadas;
        return {
          storeId,
          programadas: list.filter(training => training.status === 'PROGRAMADA').length,
          enCurso: list.filter(training => training.status === 'EN_CURSO').length,
          completadas,
          noCompletadas,
          total: list.length,
          completionRate: terminadas > 0 ? Math.round((completadas / terminadas) * 100) : 0,
        } satisfies StoreSummary;
      })
      .sort((a, b) => b.total - a.total);
  });

  readonly uniqueStoreIds = computed(() =>
    [...new Set(this.dashboardTrainings().map(training => training.storeId))]
  );

  readonly storeStats = computed(() => {
    const all = this.dashboardTrainings();
    return {
      total: all.length,
      programadas: all.filter(training => training.status === 'PROGRAMADA').length,
      enCurso: all.filter(training => training.status === 'EN_CURSO').length,
      completadas: all.filter(training => training.status === 'COMPLETADA').length,
      noCompletadas: all.filter(training => training.status === 'NO_COMPLETADA').length,
    };
  });

  readonly alerts = computed(() => {
    const now = new Date();
    return this.dashboardTrainings().filter(training =>
      training.status === 'NO_COMPLETADA' ||
      (training.status !== 'COMPLETADA' && training.dueAt && new Date(training.dueAt) < now)
    );
  });

  ngOnInit(): void {
    if (this.isGerente() && this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }

    if (this.isAdmin()) {
      this.trainingSvc.loadAll();
    } else if (this.isGerente()) {
      const storeId = this.authSvc.currentUser()?.storeId;
      if (storeId) this.trainingSvc.loadByStore(storeId);
    } else {
      this.trainingSvc.loadMyTrainings();
    }
  }

  goToDetail(training: Pick<TrainingResponse, 'id'>): void {
    this.router.navigate(['/training', training.id]);
  }

  filterByStore(storeId: string): void {
    this.filterStore.set(this.filterStore() === storeId ? '' : storeId);
  }

  statusBadgeClass(status: TrainingStatus): string {
    const map: Record<TrainingStatus, string> = {
      PROGRAMADA: 'bg-amber-100 text-amber-700',
      EN_CURSO: 'bg-blue-100 text-blue-700',
      COMPLETADA: 'bg-emerald-100 text-emerald-700',
      NO_COMPLETADA: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-stone-100 text-stone-700';
  }

  levelBadgeClass(level: TrainingLevel): string {
    const map: Record<TrainingLevel, string> = {
      BASICO: 'bg-stone-100 text-stone-600',
      INTERMEDIO: 'bg-blue-50 text-blue-600',
      AVANZADO: 'bg-purple-100 text-purple-700',
    };
    return map[level] ?? 'bg-stone-100 text-stone-600';
  }

  completionBarClass(rate: number): string {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-400';
  }

  storeLabel(storeId: string): string {
    return this.storeNames().get(storeId) ?? storeId;
  }

  assigneeLabel(training: TrainingListRow): string {
    if (training.groupSize > 1) return `${training.groupSize} colaboradores`;
    return training.assignedUserName || training.position || training.assignedUserId;
  }

  private groupTrainings(list: TrainingResponse[]): TrainingListRow[] {
    const groups = new Map<string, TrainingResponse[]>();
    for (const training of list) {
      const key = training.assignmentGroupId?.trim()
        ? `group:${training.assignmentGroupId}`
        : `single:${training.id}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(training);
      groups.set(key, bucket);
    }

    return Array.from(groups.values())
      .map(group => this.buildGroupRow(group))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private buildGroupRow(group: TrainingResponse[]): TrainingListRow {
    const ordered = [...group].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const representative = ordered[0] ?? group[0];
    const groupSize = group.length;

    if (groupSize === 1) {
      return { ...representative, groupSize: 1 };
    }

    const averageProgress = Math.round(
      group.reduce((sum, training) => sum + training.percentage, 0) / groupSize
    );
    const allShiftSame = group.every(training => training.shift === representative.shift);

    return {
      ...representative,
      percentage: averageProgress,
      status: this.resolveGroupStatus(group),
      position: `${groupSize} colaboradores`,
      shift: allShiftSame ? representative.shift : 'MIXTO',
      groupSize,
    };
  }

  private resolveGroupStatus(group: TrainingResponse[]): TrainingStatus {
    const statuses = group.map(training => training.status);
    if (statuses.every(status => status === 'COMPLETADA')) return 'COMPLETADA';
    if (statuses.every(status => status === 'NO_COMPLETADA')) return 'NO_COMPLETADA';
    if (statuses.every(status => status === 'PROGRAMADA')) return 'PROGRAMADA';
    if (statuses.some(status => status === 'EN_CURSO')) return 'EN_CURSO';
    if (statuses.some(status => status === 'COMPLETADA')) return 'EN_CURSO';
    if (statuses.some(status => status === 'NO_COMPLETADA')) return 'EN_CURSO';
    return 'PROGRAMADA';
  }
}

