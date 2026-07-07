import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { RhService } from '../../rh/services/rh.service';
import { TrainingService } from '../../training/services/training.service';
import { SettingsService } from '../../settings/services/settings.service';
import { EXAM_AUDIENCE_LABELS, ExamAudience, ExamResponse } from '../trainer.models';
import { CreateTrainingRequest } from '../../training/training.models';
import { UserProfile } from '../../rh/rh.models';
import { environment } from '../../../../environments/environment';

/**
 * Asignación de exámenes:
 * - ADMIN  → asigna exámenes para gerentes (selección global con filtros).
 * - GERENTE → asigna exámenes para ejecutadores de su sucursal.
 */
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
  private readonly settingsSvc = inject(SettingsService);

  readonly exam = signal<ExamResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly selectionError = signal('');
  readonly managerSearch = signal('');
  readonly managerStoreFilter = signal('');
  readonly executorSearch = signal('');
  readonly selectedManagerIds = signal<string[]>([]);
  readonly selectedExecutorIds = signal<string[]>([]);
  readonly managerOptions = signal<UserProfile[]>([]);
  readonly executorOptions = signal<UserProfile[]>([]);
  readonly audienceLabels = EXAM_AUDIENCE_LABELS;
  readonly alreadyAssignedUserIds = signal<Set<string>>(new Set());

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly targetAudience = computed<ExamAudience | null>(() => this.exam()?.targetAudience ?? null);
  readonly isExecutorExam = computed(() => this.targetAudience() === 'EJECUTADOR');
  readonly isManagerExam = computed(() => this.targetAudience() === 'GERENTE');

  readonly recipientMode = computed<'MANAGERS' | 'EXECUTORS'>(() =>
    this.isAdmin() ? 'MANAGERS' : 'EXECUTORS'
  );

  readonly canAssign = computed(() =>
    this.isAdmin() ? this.isManagerExam() : this.isExecutorExam()
  );

  readonly examStoreId = computed(() => this.exam()?.storeId ?? this.auth.currentUser()?.storeId ?? '');
  readonly isGlobalExam = computed(() => !this.exam()?.storeId);

  readonly activeStores = computed(() =>
    this.settingsSvc.stores().filter(s => s.activo)
  );

  readonly filteredManagers = computed(() => {
    const q = this.managerSearch().trim().toLowerCase();
    const storeId = this.managerStoreFilter();
    return this.managerOptions().filter(u => {
      if (storeId && u.storeId !== storeId) return false;
      if (!q) return true;
      const storeName = this.storeName(u.storeId).toLowerCase();
      return [u.nombre, u.puesto, u.numeroUsuario, storeName]
        .some(v => v?.toLowerCase().includes(q));
    });
  });

  readonly filteredExecutors = computed(() => {
    const q = this.executorSearch().trim().toLowerCase();
    return this.executorOptions().filter(u => {
      if (!q) return true;
      return [u.nombre, u.puesto, u.numeroUsuario, u.turno]
        .some(v => v?.toLowerCase().includes(q));
    });
  });

  readonly selectableManagers = computed(() =>
    this.filteredManagers().filter(u => !this.isAlreadyAssigned(u.id))
  );

  readonly selectableExecutors = computed(() =>
    this.filteredExecutors().filter(u => !this.isAlreadyAssigned(u.id))
  );

  readonly selectedRecipientsCount = computed(() =>
    this.recipientMode() === 'MANAGERS'
      ? this.selectedManagerIds().length
      : this.selectedExecutorIds().length
  );

  readonly assignmentIds = computed(() =>
    this.recipientMode() === 'MANAGERS' ? this.selectedManagerIds() : this.selectedExecutorIds()
  );

  readonly alreadyAssignedInViewCount = computed(() => {
    const list = this.recipientMode() === 'MANAGERS'
      ? this.filteredManagers()
      : this.filteredExecutors();
    return list.filter(u => this.isAlreadyAssigned(u.id)).length;
  });

  examAudienceLabel(): string {
    return this.targetAudience() ? this.audienceLabels[this.targetAudience()!] : 'Sin filtro';
  }

  storeName(storeId: string): string {
    return this.settingsSvc.stores().find(s => s.id === storeId)?.nombre ?? storeId;
  }

  async ngOnInit(): Promise<void> {
    if (this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }

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

    if (this.isAdmin() && this.isExecutorExam()) {
      this.selectionError.set(
        'Los exámenes para ejecutadores los asignan los gerentes desde el menú Exámenes.'
      );
      return;
    }

    if (!this.isAdmin() && !this.isExecutorExam()) {
      this.selectionError.set('Este examen es para gerentes; no puedes asignarlo a ejecutadores.');
      return;
    }

    try {
      await this.loadAlreadyAssigned();
    } catch { /* non-critical */ }

    try {
      await this.loadOptions();
    } catch {
      this.selectionError.set('No se pudieron cargar los destinatarios. Revisa que el backend esté actualizado.');
    }
  }

  isAlreadyAssigned(userId: string): boolean {
    return this.alreadyAssignedUserIds().has(userId);
  }

  private async loadAlreadyAssigned(): Promise<void> {
    const examId = this.exam()?.id;
    if (!examId) return;

    const trainings = await firstValueFrom(
      this.http.get<{ assignedUserId: string }[]>(
        `${environment.apiUrl}/trainings/exam/${examId}`
      )
    );
    this.alreadyAssignedUserIds.set(new Set(trainings.map(t => t.assignedUserId)));
  }

  private async loadOptions(): Promise<void> {
    if (this.isAdmin()) {
      const users = await firstValueFrom(
        this.http.get<UserProfile[]>(`${environment.apiUrl}/users/all`)
      );
      this.managerOptions.set(
        users.filter(u => u.activo && this.hasRole(u, 'GERENTE'))
      );
      return;
    }

    const storeId = this.examStoreId();
    if (!storeId) {
      this.selectionError.set('No se pudo determinar la sucursal para cargar ejecutadores.');
      return;
    }

    const users = await this.rhSvc.getUsersByStore(storeId);
    this.rhSvc.loadUsersByStore(storeId);
    this.executorOptions.set(users.filter(u => u.activo && this.hasRole(u, 'EJECUTADOR')));
  }

  isManagerSelected(id: string): boolean {
    return this.selectedManagerIds().includes(id);
  }

  isAllManagersSelected(): boolean {
    const items = this.selectableManagers();
    return items.length > 0 && items.every(u => this.selectedManagerIds().includes(u.id));
  }

  toggleManager(id: string): void {
    if (this.isAlreadyAssigned(id)) return;
    const next = new Set(this.selectedManagerIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedManagerIds.set([...next]);
  }

  toggleAllManagers(checked: boolean): void {
    this.selectedManagerIds.set(
      checked ? this.selectableManagers().map(u => u.id) : []
    );
  }

  clearManagerSelection(): void {
    this.selectedManagerIds.set([]);
  }

  isExecutorSelected(id: string): boolean {
    return this.selectedExecutorIds().includes(id);
  }

  isAllExecutorsSelected(): boolean {
    const items = this.selectableExecutors();
    return items.length > 0 && items.every(u => this.selectedExecutorIds().includes(u.id));
  }

  toggleExecutor(id: string): void {
    if (this.isAlreadyAssigned(id)) return;
    const next = new Set(this.selectedExecutorIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedExecutorIds.set([...next]);
  }

  toggleAllExecutors(checked: boolean): void {
    this.selectedExecutorIds.set(
      checked ? this.selectableExecutors().map(u => u.id) : []
    );
  }

  clearExecutorSelection(): void {
    this.selectedExecutorIds.set([]);
  }

  private hasRole(user: UserProfile, role: 'GERENTE' | 'EJECUTADOR'): boolean {
    return (user.roles ?? []).some(r => r === role || r === `ROLE_${role}`);
  }

  private resolveStoreIdForUser(userId: string): string {
    const exam = this.exam()!;
    if (exam.storeId) return exam.storeId;

    const user = [...this.managerOptions(), ...this.executorOptions()]
      .find(u => u.id === userId);
    if (!user?.storeId) {
      throw new Error('No se pudo determinar la sucursal del destinatario.');
    }
    return user.storeId;
  }

  private buildPayload(userId: string): CreateTrainingRequest {
    const exam = this.exam()!;
    return {
      title: exam.title,
      description: exam.description || `Examen asignado: ${exam.title}`,
      assignedUserId: userId,
      storeId: this.resolveStoreIdForUser(userId),
      shift: 'TODOS',
      examId: exam.id,
    };
  }

  async submit(): Promise<void> {
    if (!this.exam() || !this.canAssign() || this.assignmentIds().length === 0 || this.saving()) return;
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
