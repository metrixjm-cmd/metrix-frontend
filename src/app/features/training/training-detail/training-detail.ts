import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

import { AuthService } from '../../auth/services/auth.service';
import { RoleContext } from '../../../shared/services/role-context.service';
import { TrainingService } from '../services/training.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { SettingsService } from '../../settings/services/settings.service';
import { NotificationService } from '../../notifications/notification.service';
import {
  MATERIAL_TYPE_COLORS,
  MATERIAL_TYPE_ICONS,
  TRAINING_LEVEL_LABELS,
  TRAINING_STATUS_LABELS,
  TrainingLevel,
  TrainingResponse,
  TrainingStatus,
  UpdateTrainingRequest,
  UpdateTrainingProgressRequest,
} from '../training.models';

@Component({
  selector: 'app-training-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AppDatePipe],
  templateUrl: './training-detail.html',
})
export class TrainingDetail implements OnInit, OnDestroy {
  private readonly authSvc     = inject(AuthService);
  private readonly role        = inject(RoleContext);
  private readonly trainingSvc = inject(TrainingService);
  private readonly trainerSvc  = inject(TrainerService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly notifSvc    = inject(NotificationService);
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
  readonly levelOptions: TrainingLevel[] = ['BASICO', 'INTERMEDIO', 'AVANZADO'];
  readonly shiftOptions = ['TODOS', 'MATUTINO', 'VESPERTINO', 'NOCTURNO'];
  readonly stores = this.settingsSvc.stores;
  readonly storeName = computed(() => {
    const currentTraining = this.training();
    if (!currentTraining) return '-';
    const store = this.settingsSvc.stores().find(s => s.id === currentTraining.storeId);
    if (store?.nombre) return store.nombre;
    const userStore = this.authSvc.currentUser();
    if (userStore?.storeId === currentTraining.storeId && userStore.storeName) {
      return userStore.storeName;
    }
    return currentTraining.storeId;
  });

  readonly isGerente      = this.role.isGerente;
  readonly forceLearnerView = signal(false);
  readonly backTab = signal<'created' | 'todo' | ''>('');
  readonly backQueryParams = computed(() => {
    const tab = this.backTab();
    return tab ? { tab } : undefined;
  });
  readonly isManagerView = computed(() => this.isGerente() && !this.forceLearnerView());
  readonly isLearnerView = computed(() => !this.isGerente() || this.forceLearnerView());
  readonly isCompletedTraining = computed(() => {
    const training = this.training();
    if (!training) return false;
    return training.status === 'COMPLETADA';
  });
  readonly canModifyTrainingDefinition = computed(() => {
    const training = this.training();
    if (!training) return false;
    return training.status !== 'COMPLETADA';
  });
  readonly definitionLockReason = computed(() => {
    const training = this.training();
    if (!training || this.canModifyTrainingDefinition()) return '';
    return 'Edición bloqueada: capacitación completada';
  });
  readonly materialIcons  = MATERIAL_TYPE_ICONS;
  readonly materialColors = MATERIAL_TYPE_COLORS;
  readonly hasTrackableMaterials = computed(() =>
    (this.trainingSvc.selectedTraining()?.materials?.length ?? 0) > 0
  );
  readonly viewedCount    = computed(() =>
    this.trainingSvc.selectedTraining()?.materials?.filter(m => m.viewed).length ?? 0
  );
  readonly materialTotal = computed(() =>
    this.trainingSvc.selectedTraining()?.materials?.length ?? 0
  );
  readonly pendingMaterials = computed(() =>
    Math.max(0, this.materialTotal() - this.viewedCount())
  );
  readonly learnerProgressPercent = computed(() => {
    const total = this.materialTotal();
    if (total <= 0) return this.training()?.percentage ?? 0;
    return Math.round((this.viewedCount() / total) * 100);
  });
  readonly isLearnerCompleted = computed(() => {
    const training = this.training();
    if (!training) return false;
    return training.status === 'COMPLETADA';
  });
  readonly nowMs = signal(Date.now());
  readonly remainingMs = computed(() => {
    const dueAt = this.training()?.dueAt;
    if (!dueAt) return 0;
    const dueMs = new Date(dueAt).getTime();
    if (Number.isNaN(dueMs)) return 0;
    return Math.max(0, dueMs - this.nowMs());
  });
  readonly timeLeftLabel = computed(() => this.formatRemaining(this.remainingMs()));
  readonly isOverdue = computed(() => {
    const dueAt = this.training()?.dueAt;
    if (!dueAt) return false;
    const dueMs = new Date(dueAt).getTime();
    if (Number.isNaN(dueMs)) return false;
    return dueMs < this.nowMs();
  });
  readonly remainingParts = computed(() => {
    const totalSeconds = Math.max(0, Math.floor(this.remainingMs() / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  });
  readonly groupMembers   = signal<TrainingResponse[]>([]);
  readonly materialMarkingIds = signal<Set<string>>(new Set());

  private groupRequestToken = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  // ── Estado de modales ─────────────────────────────────────────────────────
  showCompleteModal    = signal(false);
  showFailModal        = signal(false);
  showEditModal        = signal(false);
  gradeInput           = signal<number>(0);
  commentsInput        = signal<string>('');
  percentageInput      = signal<number>(0);
  editTitle            = signal('');
  editDescription      = signal('');
  editLevel            = signal<TrainingLevel>('BASICO');
  editStoreId          = signal('');
  editShift            = signal('TODOS');
  editDueAtLocal       = signal('');

  constructor() {
    effect(() => {
      const currentTraining = this.training();
      if (currentTraining) {
        this.percentageInput.set(currentTraining.percentage);
      }
    });

    effect(() => {
      const currentTraining = this.training();
      if (!currentTraining || !this.isManagerView()) {
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

    effect(() => {
      const currentTraining = this.training();
      if (!currentTraining || !this.isLearnerView()) return;
      if (currentTraining.status === 'COMPLETADA' || currentTraining.status === 'NO_COMPLETADA') return;
      const remaining = this.remainingMs();
      if (remaining > 0 && remaining <= 60 * 60 * 1000 && !this.hasOneHourWarning(currentTraining.id)) {
        this.sendOneHourWarning(currentTraining);
        this.markOneHourWarning(currentTraining.id);
      }
    });
  }

  ngOnInit(): void {
    const id   = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/training']); return; }
    this.forceLearnerView.set(this.route.snapshot.queryParamMap.get('view') === 'learner');
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'created' || tab === 'todo') {
      this.backTab.set(tab);
    }
    this.startTicker();
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

  ngOnDestroy(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  openFailModal(): void {
    this.commentsInput.set('');
    this.showFailModal.set(true);
  }

  openEditModal(): void {
    const t = this.training();
    if (!t || !this.canModifyTrainingDefinition()) return;
    if (this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }
    this.editTitle.set(t.title);
    this.editDescription.set(t.description);
    this.editLevel.set(t.level);
    this.editStoreId.set(t.storeId);
    this.editShift.set(t.shift);
    this.editDueAtLocal.set(this.toLocalDateTimeInput(t.dueAt));
    this.showEditModal.set(true);
  }

  async onSaveEdit(): Promise<void> {
    const t = this.training();
    if (!t || this.saving()) return;

    const dueAt = this.toIsoFromLocal(this.editDueAtLocal());
    if (!this.editTitle().trim() || !this.editDescription().trim() || !this.editStoreId().trim() || !this.editShift().trim() || !dueAt) {
      return;
    }

    const req: UpdateTrainingRequest = {
      title: this.editTitle().trim(),
      description: this.editDescription().trim(),
      level: this.editLevel(),
      storeId: this.editStoreId(),
      shift: this.editShift(),
      dueAt,
    };

    try {
      await this.trainingSvc.update(t.id, req);
      this.showEditModal.set(false);
    } catch { /* handled in service */ }
  }

  async onDeleteTraining(): Promise<void> {
    const t = this.training();
    if (!t || this.saving() || !this.canModifyTrainingDefinition()) return;
    const confirmed = window.confirm('¿Eliminar esta capacitación? Si pertenece a un grupo, se eliminarán todos los asignados.');
    if (!confirmed) return;
    try {
      await this.trainingSvc.delete(t.id);
      this.router.navigate(['/training']);
    } catch { /* handled in service */ }
  }

  async onMarkMaterialViewed(materialId: string): Promise<void> {
    const t = this.training();
    if (!t || this.saving() || this.isMaterialMarking(materialId)) return;
    this.materialMarkingIds.update(ids => {
      const next = new Set(ids);
      next.add(materialId);
      return next;
    });
    try {
      await this.trainingSvc.markMaterialViewed(t.id, materialId);
    } catch { /* handled */ }
    finally {
      this.materialMarkingIds.update(ids => {
        const next = new Set(ids);
        next.delete(materialId);
        return next;
      });
    }
  }

  openMaterial(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  onOpenMaterialAsLearner(materialId: string, url: string, alreadyViewed: boolean): void {
    this.openMaterial(url);
    if (alreadyViewed) return;
    void this.onMarkMaterialViewed(materialId);
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

  headerStatusClass(status: TrainingStatus): string {
    const map: Record<TrainingStatus, string> = {
      PROGRAMADA: 'bg-amber-100 text-amber-700',
      EN_CURSO: 'bg-blue-100 text-blue-700',
      COMPLETADA: 'bg-emerald-100 text-emerald-700',
      NO_COMPLETADA: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-stone-100 text-stone-700';
  }

  resolvedStatus(training: Pick<TrainingResponse, 'status' | 'percentage'> | null | undefined): TrainingStatus {
    if (!training) return 'PROGRAMADA';
    return training.status;
  }

  memberInitials(name: string | null | undefined): string {
    if (!name) return '--';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '--';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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
    if (status === 'NO_COMPLETADA') return 'bg-red-400';
    return 'bg-brand-500';
  }

  learnerStatusClass(status: TrainingStatus): string {
    if (status === 'PROGRAMADA') return 'bg-stone-200 text-stone-700';
    if (status === 'EN_CURSO') return 'bg-blue-600 text-white';
    if (status === 'COMPLETADA') return 'bg-emerald-600 text-white';
    return 'bg-red-600 text-white';
  }

  learnerStatusLabel(status: TrainingStatus): string {
    if (status === 'EN_CURSO') return 'En progreso';
    if (status === 'NO_COMPLETADA') return 'Incompleta';
    return this.statusLabels[status] ?? status;
  }

  materialTypeLabel(type: string): string {
    const map: Record<string, string> = {
      IMAGE: 'Imagen',
      LINK: 'Enlace',
      VIDEO: 'Video',
      PDF: 'PDF',
    };
    return map[type] ?? type;
  }

  isMaterialMarking(materialId: string): boolean {
    return this.materialMarkingIds().has(materialId);
  }

  materialIconToneClass(type: string): string {
    const map: Record<string, string> = {
      IMAGE: 'bg-pink-100 text-pink-700',
      LINK: 'bg-indigo-100 text-indigo-700',
      VIDEO: 'bg-violet-100 text-violet-700',
      PDF: 'bg-red-100 text-red-700',
    };
    return map[type] ?? 'bg-slate-100 text-slate-700';
  }

  learnerProgressText(): string {
    const progress = this.learnerProgressPercent();
    if (progress === 0) return 'Comienza tu capacitación.';
    if (progress < 100) return 'Sigue revisando los materiales asignados.';
    return 'Capacitación completada.';
  }

  timeLeftClass(): string {
    const remaining = this.remainingMs();
    if (remaining <= 0) return 'text-red-600';
    if (remaining <= 60 * 60 * 1000) return 'text-amber-600';
    if (remaining <= 24 * 60 * 60 * 1000) return 'text-brand-600';
    return 'text-emerald-600';
  }

  private toLocalDateTimeInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private toIsoFromLocal(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private startTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.nowMs.set(Date.now());
    this.ticker = setInterval(() => this.nowMs.set(Date.now()), 1000);
  }

  private formatRemaining(ms: number): string {
    if (ms <= 0) return 'Vencida';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  private warningStorageKey(trainingId: string): string {
    return `metrix_training_deadline_warned_${trainingId}`;
  }

  private hasOneHourWarning(trainingId: string): boolean {
    return localStorage.getItem(this.warningStorageKey(trainingId)) === '1';
  }

  private markOneHourWarning(trainingId: string): void {
    localStorage.setItem(this.warningStorageKey(trainingId), '1');
  }

  private sendOneHourWarning(training: TrainingResponse): void {
    this.notifSvc.pushLocal({
      severity: 'warning',
      title: 'Capacitación por vencer',
      body: `Te queda 1 hora o menos para terminar "${training.title}" y evitar marcarla como incompleta.`,
      storeId: training.storeId,
    });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Capacitación por vencer', {
        body: `Finaliza "${training.title}" para evitar que quede incompleta.`,
      });
    }
  }

}
