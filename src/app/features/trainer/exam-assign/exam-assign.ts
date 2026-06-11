import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { RhService } from '../../rh/services/rh.service';
import { TrainingService } from '../../training/services/training.service';
import { EXAM_AUDIENCE_LABELS, ExamAudience, ExamResponse } from '../trainer.models';
import { CreateTrainingRequest } from '../../training/training.models';
import { UserProfile } from '../../rh/rh.models';
import { environment } from '../../../../environments/environment';

type AudienceMode = 'MANAGERS' | 'EXECUTORS';

@Component({
  selector: 'app-exam-assign',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './exam-assign.html',
})
export class ExamAssign implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly rhSvc = inject(RhService);
  private readonly trainingSvc = inject(TrainingService);

  readonly exam = signal<ExamResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly selectionError = signal('');
  readonly audience = signal<AudienceMode>('MANAGERS');
  readonly managerSearch = signal('');
  readonly executorSearch = signal('');
  readonly selectedManagerIds = signal<string[]>([]);
  readonly selectedExecutorIds = signal<string[]>([]);
  readonly managerOptions = signal<UserProfile[]>([]);
  readonly executorOptions = signal<UserProfile[]>([]);
  readonly audienceLabels = EXAM_AUDIENCE_LABELS;
  readonly alreadyAssignedUserIds = signal<Set<string>>(new Set());

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly targetAudience = computed<ExamAudience | null>(() => this.exam()?.targetAudience ?? null);
  readonly targetMode = computed<AudienceMode | null>(() => {
    const audience = this.targetAudience();
    if (!audience) return null;
    return audience === 'GERENTE' ? 'MANAGERS' : 'EXECUTORS';
  });
  readonly canChooseManagers = computed(() => this.isAdmin() && (!this.targetMode() || this.targetMode() === 'MANAGERS'));
  readonly canFilterExecutorsByManager = computed(() => this.isAdmin() && (!this.targetMode() || this.targetMode() === 'EXECUTORS'));
  readonly examStoreId = computed(() => this.exam()?.storeId ?? this.auth.currentUser()?.storeId ?? '');
  readonly storeUsers = computed(() =>
    this.rhSvc.users().filter(u => u.activo && u.storeId === this.examStoreId())
  );

  readonly filteredManagers = computed(() => {
    const q = this.managerSearch().trim().toLowerCase();
    return this.managerOptions().filter(u => {
      if (!q) return true;
      return [u.nombre, u.puesto, u.numeroUsuario]
        .some(v => v?.toLowerCase().includes(q));
    });
  });

  readonly selectedManagers = computed(() =>
    this.managerOptions().filter(u => this.selectedManagerIds().includes(u.id))
  );

  readonly filteredExecutors = computed(() => {
    const q = this.executorSearch().trim().toLowerCase();
    const selected = this.selectedManagerIds();
    const pool = this.isAdmin()
      ? this.executorOptions()
      : this.storeUsers().filter(u => (u.roles ?? []).some(r => r === 'EJECUTADOR' || r === 'ROLE_EJECUTADOR'));
    return pool.filter(u => {
      const owner = u.managerOwnerId ?? u.managerOwnerNumeroUsuario ?? '';
      if (selected.length > 0 && !selected.includes(owner)) return false;
      if (!q) return true;
      return [u.nombre, u.puesto, u.numeroUsuario, u.turno, u.managerOwnerNumeroUsuario ?? '']
        .some(v => v?.toLowerCase().includes(q));
    });
  });

  readonly selectedRecipientsCount = computed(() =>
    this.audience() === 'MANAGERS'
      ? this.selectedManagerIds().length
      : this.selectedExecutorIds().length
  );

  readonly assignmentIds = computed(() =>
    this.audience() === 'MANAGERS' ? this.selectedManagerIds() : this.selectedExecutorIds()
  );

  examAudienceLabel(): string {
    return this.targetAudience() ? this.audienceLabels[this.targetAudience()!] : 'Sin filtro';
  }

  async ngOnInit(): Promise<void> {
    const examId = this.route.snapshot.paramMap.get('examId');
    if (!examId) {
      this.error.set('No se encontró el examen.');
      this.loading.set(false);
      return;
    }

    try {
      this.exam.set(await this.trainerSvc.getById(examId));
    } catch {
      this.error.set('No se pudo cargar el examen.');
    } finally {
      this.loading.set(false);
    }

    if (!this.exam()) return;

    try {
      await this.loadAlreadyAssigned();
    } catch { /* non-critical */ }

    try {
      await this.loadAudienceOptions();
    } catch {
      this.selectionError.set('No se pudieron cargar todos los destinatarios. Revisa que el backend este actualizado.');
    }
  }

  isAlreadyAssigned(userId: string): boolean {
    return this.alreadyAssignedUserIds().has(userId);
  }

  private async loadAlreadyAssigned(): Promise<void> {
    const storeId = this.examStoreId();
    const examId = this.exam()?.id;
    if (!storeId || !examId) return;
    const trainings = await firstValueFrom(
      this.http.get<{ assignedUserId: string; examId?: string }[]>(
        `${environment.apiUrl}/trainings/store/${storeId}`
      )
    );
    const ids = new Set(
      trainings.filter(t => t.examId === examId).map(t => t.assignedUserId)
    );
    this.alreadyAssignedUserIds.set(ids);
  }

  async setAudience(mode: AudienceMode): Promise<void> {
    if (this.targetMode() && mode !== this.targetMode()) return;
    this.audience.set(mode);
    this.selectionError.set('');
    this.selectedExecutorIds.set([]);

    if (mode === 'MANAGERS') {
      this.executorOptions.set([]);
      return;
    }

    await this.loadExecutorsForSelection();
  }

  isManagerSelected(id: string): boolean {
    return this.selectedManagerIds().includes(id);
  }

  isExecutorSelected(id: string): boolean {
    return this.selectedExecutorIds().includes(id);
  }

  isAllManagersSelected(): boolean {
    const items = this.filteredManagers();
    return items.length > 0 && items.every(u => this.selectedManagerIds().includes(u.id));
  }

  isAllExecutorsSelected(): boolean {
    const items = this.filteredExecutors();
    return items.length > 0 && items.every(u => this.selectedExecutorIds().includes(u.id));
  }

  async toggleManager(id: string): Promise<void> {
    if (this.isAlreadyAssigned(id)) return;
    const next = new Set(this.selectedManagerIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedManagerIds.set([...next]);

    if (this.isAdmin() && this.audience() === 'EXECUTORS' && this.examStoreId()) {
      if (this.selectedManagerIds().length === 0) {
        this.executorOptions.set([]);
        this.selectedExecutorIds.set([]);
        return;
      }
      await this.loadExecutorsForSelection();
      this.selectedExecutorIds.update(ids =>
        ids.filter(id => this.executorOptions().some(u => u.id === id))
      );
    }
  }

  async toggleAllManagers(checked: boolean): Promise<void> {
    this.selectedManagerIds.set(checked ? this.filteredManagers().filter(u => !this.isAlreadyAssigned(u.id)).map(u => u.id) : []);
    if (this.isAdmin() && this.audience() === 'EXECUTORS' && this.examStoreId() && checked) {
      await this.loadExecutorsForSelection();
      this.selectedExecutorIds.set([]);
    } else {
      this.executorOptions.set([]);
      this.selectedExecutorIds.set([]);
    }
  }

  toggleExecutor(id: string): void {
    if (this.isAlreadyAssigned(id)) return;
    const next = new Set(this.selectedExecutorIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedExecutorIds.set([...next]);
  }

  toggleAllExecutors(checked: boolean): void {
    this.selectedExecutorIds.set(checked ? this.filteredExecutors().filter(u => !this.isAlreadyAssigned(u.id)).map(u => u.id) : []);
  }

  executorsForManager(manager: UserProfile): UserProfile[] {
    return this.filteredExecutors().filter(u => {
      const owner = u.managerOwnerId ?? u.managerOwnerNumeroUsuario ?? '';
      return owner === manager.id || owner === manager.numeroUsuario;
    });
  }

  isAllExecutorsForManagerSelected(manager: UserProfile): boolean {
    const items = this.executorsForManager(manager);
    return items.length > 0 && items.every(u => this.selectedExecutorIds().includes(u.id));
  }

  toggleManagerExecutors(manager: UserProfile, checked: boolean): void {
    const next = new Set(this.selectedExecutorIds());
    for (const u of this.executorsForManager(manager)) {
      checked ? next.add(u.id) : next.delete(u.id);
    }
    this.selectedExecutorIds.set([...next]);
  }

  private hasRole(user: UserProfile, role: 'GERENTE' | 'EJECUTADOR'): boolean {
    return (user.roles ?? []).some(r => r === role || r === `ROLE_${role}`);
  }

  private isOwnedBySelectedManager(user: UserProfile): boolean {
    const selected = this.selectedManagerIds();
    return selected.includes(user.managerOwnerId ?? '')
      || selected.includes(user.managerOwnerNumeroUsuario ?? '');
  }

  private async loadAudienceOptions(): Promise<void> {
    const storeId = this.examStoreId();
    if (!storeId) return;

    if (this.targetMode()) {
      this.audience.set(this.targetMode()!);
    }

    if (this.targetMode() === 'MANAGERS') {
      if (!this.isAdmin()) {
        this.selectionError.set('Este examen es solo para gerentes y necesita una cuenta admin para asignarse.');
        this.managerOptions.set([]);
        return;
      }

      try {
        this.managerOptions.set(await this.rhSvc.getManagersByStore(storeId));
      } catch {
        const users = await this.rhSvc.getUsersByStore(storeId);
        this.managerOptions.set(users.filter(u => u.activo && this.hasRole(u, 'GERENTE')));
      }
      return;
    }

    if (this.isAdmin()) {
      try {
        this.managerOptions.set(await this.rhSvc.getManagersByStore(storeId));
      } catch {
        const users = await this.rhSvc.getUsersByStore(storeId);
        this.managerOptions.set(users.filter(u => u.activo && this.hasRole(u, 'GERENTE')));
      }
      if (!this.targetMode()) {
        this.audience.set('MANAGERS');
      }
      return;
    }

    const users = await this.rhSvc.getUsersByStore(storeId);
    this.rhSvc.loadUsersByStore(storeId);
    this.executorOptions.set(users.filter(u => u.activo && this.hasRole(u, 'EJECUTADOR')));
    if (!this.targetMode()) {
      this.audience.set('EXECUTORS');
    }
  }

  private async loadExecutorsForSelection(): Promise<void> {
    const storeId = this.examStoreId();
    if (!this.isAdmin() || !storeId || this.selectedManagerIds().length === 0) {
      this.executorOptions.set([]);
      return;
    }

    try {
      this.executorOptions.set(
        await this.rhSvc.getExecutorsByManagers(storeId, this.selectedManagerIds())
      );
    } catch {
      const users = await this.rhSvc.getUsersByStore(storeId);
      this.executorOptions.set(
        users.filter(u =>
          u.activo
          && this.hasRole(u, 'EJECUTADOR')
          && this.isOwnedBySelectedManager(u)
        )
      );
    }
  }

  private buildDueAt(): string {
    return new Date(Date.now() + 7 * 86400000).toISOString();
  }

  private buildPayload(userId: string): CreateTrainingRequest {
    const exam = this.exam()!;
    return {
      title: exam.title,
      description: exam.description || `Examen asignado: ${exam.title}`,
      assignedUserId: userId,
      storeId: exam.storeId,
      shift: 'TODOS',
      startDate: new Date().toISOString(),
      dueAt: this.buildDueAt(),
      examId: exam.id,
    };
  }

  async submit(): Promise<void> {
    if (!this.exam() || this.assignmentIds().length === 0 || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const ids = [...this.assignmentIds()];
    try {
      for (const userId of ids) {
        await this.trainingSvc.create(this.buildPayload(userId));
      }
      this.router.navigate(['/trainer']);
    } catch {
      this.error.set('No se pudo guardar la asignación.');
    } finally {
      this.saving.set(false);
    }
  }
}
