import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingService } from '../services/training.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { SettingsService } from '../../settings/services/settings.service';
import {
  MATERIAL_TYPE_COLORS,
  MATERIAL_TYPE_ICONS,
  TRAINING_LEVEL_LABELS,
  TRAINING_STATUS_LABELS,
  TrainingLevel,
  TrainingResponse,
  TrainingStatus,
  UpdateTrainingProgressRequest,
} from '../training.models';

@Component({
  selector: 'app-training-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AppDatePipe],
  templateUrl: './training-detail.html',
})
export class TrainingDetail implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly trainingSvc = inject(TrainingService);
  private readonly trainerSvc  = inject(TrainerService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);

  readonly training     = this.trainingSvc.selectedTraining;

  /** Exámenes vinculados a esta capacitación. */
  readonly linkedExams = computed(() => {
    const t = this.training();
    if (!t) return [];
    return this.trainerSvc.exams().filter(e => e.trainingId === t.id);
  });
  readonly loading      = this.trainingSvc.loading;
  readonly saving       = this.trainingSvc.saving;
  readonly error        = this.trainingSvc.error;
  readonly statusLabels: Record<string, string | undefined> = TRAINING_STATUS_LABELS;
  readonly levelLabels:  Record<string, string | undefined> = TRAINING_LEVEL_LABELS;
  readonly storeName = computed(() => {
    const currentTraining = this.training();
    if (!currentTraining) return '-';
    const store = this.settingsSvc.stores().find(s => s.id === currentTraining.storeId);
    return store?.nombre ?? currentTraining.storeId;
  });

  readonly isGerente      = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));
  readonly materialIcons  = MATERIAL_TYPE_ICONS;
  readonly materialColors = MATERIAL_TYPE_COLORS;
  readonly hasTrackableMaterials = computed(() =>
    (this.trainingSvc.selectedTraining()?.materials?.length ?? 0) > 0
  );
  readonly viewedCount    = computed(() =>
    this.trainingSvc.selectedTraining()?.materials?.filter(m => m.viewed).length ?? 0
  );
  readonly groupMembers   = signal<TrainingResponse[]>([]);

  private groupRequestToken = 0;

  // ── Estado de modales ─────────────────────────────────────────────────────
  showCompleteModal    = signal(false);
  showFailModal        = signal(false);
  gradeInput           = signal<number>(0);
  commentsInput        = signal<string>('');
  percentageInput      = signal<number>(0);

  constructor() {
    effect(() => {
      const currentTraining = this.training();
      if (currentTraining) {
        this.percentageInput.set(currentTraining.percentage);
      }
    });

    effect(() => {
      const currentTraining = this.training();
      if (!currentTraining || !this.isGerente()) {
        this.groupMembers.set([]);
        return;
      }

      const groupId = currentTraining.assignmentGroupId;
      if (!groupId) {
        this.groupMembers.set([currentTraining]);
        return;
      }

      const requestToken = ++this.groupRequestToken;
      this.trainingSvc.getByAssignmentGroup(groupId)
        .then(list => {
          if (requestToken !== this.groupRequestToken) return;
          this.groupMembers.set(list.length > 0 ? list : [currentTraining]);
        })
        .catch(() => {
          if (requestToken !== this.groupRequestToken) return;
          this.groupMembers.set([currentTraining]);
        });
    });
  }

  ngOnInit(): void {
    const id   = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/training']); return; }
    this.trainingSvc.loadById(id);
    if (this.isGerente() && this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }
    const user = this.authSvc.currentUser();
    if (user?.storeId && this.trainerSvc.exams().length === 0) {
      this.trainerSvc.loadByStore(user.storeId);
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async onStart(): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;
    const req: UpdateTrainingProgressRequest = { newStatus: 'EN_CURSO' };
    try { await this.trainingSvc.updateProgress(t.id, req); } catch { /* handled in service */ }
  }

  async onUpdatePercentage(): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;
    const req: UpdateTrainingProgressRequest = {
      newStatus:  'EN_CURSO',
      percentage: this.percentageInput(),
    };
    try { await this.trainingSvc.updateProgress(t.id, req); } catch { /* handled in service */ }
  }

  async onComplete(): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;
    const req: UpdateTrainingProgressRequest = {
      newStatus: 'COMPLETADA',
      grade:     this.gradeInput(),
    };
    try {
      await this.trainingSvc.updateProgress(t.id, req);
      this.showCompleteModal.set(false);
    } catch { /* handled in service */ }
  }

  async onFail(): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;
    if (!this.commentsInput().trim()) return;
    const req: UpdateTrainingProgressRequest = {
      newStatus: 'NO_COMPLETADA',
      comments:  this.commentsInput(),
    };
    try {
      await this.trainingSvc.updateProgress(t.id, req);
      this.showFailModal.set(false);
    } catch { /* handled in service */ }
  }

  openCompleteModal(): void {
    this.gradeInput.set(7);
    this.showCompleteModal.set(true);
  }

  openFailModal(): void {
    this.commentsInput.set('');
    this.showFailModal.set(true);
  }

  async onMarkMaterialViewed(materialId: string): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;
    try { await this.trainingSvc.markMaterialViewed(t.id, materialId); } catch { /* handled */ }
  }

  openMaterial(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusBadgeClass(status: TrainingStatus): string {
    const map: Record<TrainingStatus, string> = {
      PROGRAMADA:    'bg-brand-50 text-brand-700',
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

  progressBarClass(status: TrainingStatus): string {
    if (status === 'COMPLETADA')    return 'bg-emerald-500';
    if (status === 'NO_COMPLETADA') return 'bg-red-400';
    return 'bg-brand-500';
  }

}
