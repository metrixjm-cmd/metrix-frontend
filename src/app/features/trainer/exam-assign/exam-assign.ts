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

/**
 * Asignación de exámenes con delegación en dos niveles:
 * - ADMIN  → asigna SIEMPRE a gerentes (sin importar el tipo de examen). Si el
 *            examen es para ejecutadores, cada gerente lo repartirá a su equipo.
 * - GERENTE → redistribuye a sus ejecutadores, solo si el examen es de tipo Ejecutador.
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

  readonly exam = signal<ExamResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly selectionError = signal('');
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
  readonly isExecutorExam = computed(() => this.targetAudience() === 'EJECUTADOR');

  /** ADMIN asigna a gerentes; GERENTE redistribuye a ejecutadores. */
  readonly recipientMode = computed<'MANAGERS' | 'EXECUTORS'>(() =>
    this.isAdmin() ? 'MANAGERS' : 'EXECUTORS'
  );

  /** Un gerente solo puede redistribuir exámenes de tipo Ejecutador. */
  readonly canAssign = computed(() => this.isAdmin() || this.isExecutorExam());

  readonly examStoreId = computed(() => this.exam()?.storeId ?? this.auth.currentUser()?.storeId ?? '');

  readonly filteredManagers = computed(() => {
    const q = this.managerSearch().trim().toLowerCase();
    return this.managerOptions().filter(u => {
      if (!q) return true;
      return [u.nombre, u.puesto, u.numeroUsuario]
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

  readonly selectedRecipientsCount = computed(() =>
    this.recipientMode() === 'MANAGERS'
      ? this.selectedManagerIds().length
      : this.selectedExecutorIds().length
  );

  readonly assignmentIds = computed(() =>
    this.recipientMode() === 'MANAGERS' ? this.selectedManagerIds() : this.selectedExecutorIds()
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
      await this.loadOptions();
    } catch {
      this.selectionError.set('No se pudieron cargar los destinatarios. Revisa que el backend esté actualizado.');
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

  /** Carga destinatarios según el rol: gerentes para ADMIN, ejecutadores para GERENTE. */
  private async loadOptions(): Promise<void> {
    const storeId = this.examStoreId();
    if (!storeId) return;

    if (this.isAdmin()) {
      try {
        this.managerOptions.set(await this.rhSvc.getManagersByStore(storeId));
      } catch {
        const users = await this.rhSvc.getUsersByStore(storeId);
        this.managerOptions.set(users.filter(u => u.activo && this.hasRole(u, 'GERENTE')));
      }
      return;
    }

    // GERENTE: solo redistribuye exámenes de tipo Ejecutador.
    if (!this.isExecutorExam()) {
      this.selectionError.set('Este examen es para gerentes; no se redistribuye a ejecutadores.');
      this.executorOptions.set([]);
      return;
    }

    const users = await this.rhSvc.getUsersByStore(storeId);
    this.rhSvc.loadUsersByStore(storeId);
    this.executorOptions.set(users.filter(u => u.activo && this.hasRole(u, 'EJECUTADOR')));
  }

  // ── Gerentes (vista ADMIN) ────────────────────────────────────────────

  isManagerSelected(id: string): boolean {
    return this.selectedManagerIds().includes(id);
  }

  isAllManagersSelected(): boolean {
    const items = this.filteredManagers().filter(u => !this.isAlreadyAssigned(u.id));
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
      checked ? this.filteredManagers().filter(u => !this.isAlreadyAssigned(u.id)).map(u => u.id) : []
    );
  }

  // ── Ejecutadores (vista GERENTE) ──────────────────────────────────────

  isExecutorSelected(id: string): boolean {
    return this.selectedExecutorIds().includes(id);
  }

  isAllExecutorsSelected(): boolean {
    const items = this.filteredExecutors().filter(u => !this.isAlreadyAssigned(u.id));
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
      checked ? this.filteredExecutors().filter(u => !this.isAlreadyAssigned(u.id)).map(u => u.id) : []
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private hasRole(user: UserProfile, role: 'GERENTE' | 'EJECUTADOR'): boolean {
    return (user.roles ?? []).some(r => r === role || r === `ROLE_${role}`);
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
