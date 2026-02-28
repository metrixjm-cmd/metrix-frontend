import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './training-list.html',
})
export class TrainingList implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly trainingSvc = inject(TrainingService);
  private readonly router      = inject(Router);

  readonly loading      = this.trainingSvc.loading;
  readonly error        = this.trainingSvc.error;
  readonly statusLabels: Record<string, string | undefined> = TRAINING_STATUS_LABELS;
  readonly levelLabels:  Record<string, string | undefined> = TRAINING_LEVEL_LABELS;
  readonly levels       = TRAINING_LEVELS;

  readonly statuses: TrainingStatus[] = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'NO_COMPLETADA'];

  // ── Filtros ───────────────────────────────────────────────────────────────
  filterStatus = signal<string>('');
  filterLevel  = signal<string>('');

  readonly filteredTrainings = computed(() => {
    let list = this.trainingSvc.trainings();
    const status = this.filterStatus();
    const level  = this.filterLevel();
    if (status) list = list.filter(t => t.status === status);
    if (level)  list = list.filter(t => t.level  === level);
    return list;
  });

  readonly isGerente = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  ngOnInit(): void {
    const user = this.authSvc.currentUser();
    if (this.isGerente() && user?.storeId) {
      this.trainingSvc.loadByStore(user.storeId);
    } else {
      this.trainingSvc.loadMyTrainings();
    }
  }

  goToDetail(training: TrainingResponse): void {
    this.router.navigate(['/training', training.id]);
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
