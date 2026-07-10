import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { DecimalPipe } from '@angular/common';
import { TrainingService } from '../../training/services/training.service';
import { TrainingResponse } from '../../training/training.models';
import { ExamAudience, ExamResponse } from '../trainer.models';

@Component({
  selector: 'app-trainer-home',
  standalone: true,
  imports: [RouterLink, AppDatePipe, DecimalPipe],
  templateUrl: './trainer-home.html',
})
export class TrainerHome implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly trainingSvc = inject(TrainingService);

  readonly loading   = this.trainerSvc.loading;
  readonly exams     = this.trainerSvc.exams;
  readonly trainings = this.trainingSvc.trainings;
  readonly mySubs    = this.trainerSvc.mySubmissions;
  readonly lastSub   = this.trainerSvc.lastSubmissionByExam;
  readonly myTrainings = this.trainingSvc.myTrainings;

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly isGerente = computed(() => this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'));
  readonly isManager = computed(() => this.isAdmin() || this.isGerente());
  readonly assignedExamTrainings = computed(() => {
    const seen = new Set<string>();
    return this.myTrainings().filter(training => {
      if (!training.examId || seen.has(training.examId)) return false;
      seen.add(training.examId);
      return true;
    });
  });

  readonly adminTab = signal<ExamAudience>('GERENTE');
  readonly gerenteTab = signal<'MIS_EXAMENES' | 'PARA_EJECUTADORES'>('MIS_EXAMENES');

  readonly examsForGerentes = computed(() =>
    this.exams().filter(e => e.targetAudience === 'GERENTE')
  );

  readonly examsForExecutors = computed(() =>
    this.exams().filter(e => e.targetAudience === 'EJECUTADOR')
  );

  readonly activeTabExams = computed(() =>
    this.adminTab() === 'GERENTE' ? this.examsForGerentes() : this.examsForExecutors()
  );

  readonly assignmentsByExam = computed(() => {
    const map = new Map<string, TrainingResponse[]>();
    for (const training of this.trainings()) {
      if (!training.examId) continue;
      const current = map.get(training.examId) ?? [];
      if (!current.some(t => t.assignedUserId === training.assignedUserId)) {
        current.push(training);
      }
      map.set(training.examId, current);
    }
    return map;
  });

  /** Número de intentos ya realizados por el usuario actual, por examen. */
  readonly attemptCountByExam = computed(() => {
    const map = new Map<string, number>();
    for (const s of this.mySubs()) {
      map.set(s.examId, (map.get(s.examId) ?? 0) + 1);
    }
    return map;
  });

  readonly statsCards = computed(() => {
    const total = this.isGerente() ? this.assignedExamTrainings().length : this.exams().length;
    const avgPass = this.isGerente()
      ? Math.round(this.assignedExamTrainings().reduce((sum, t) => sum + (t.passed ? 100 : (t.grade ?? 0) * 10), 0) / Math.max(total, 1))
      : total > 0
        ? Math.round(this.exams().reduce((s, e) => s + e.passRate, 0) / total)
        : 0;
    return { total, avgPass };
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (this.isAdmin()) {
      this.trainerSvc.loadAll();
      this.trainingSvc.loadAll();
    }
    if (this.isGerente() && user?.storeId) {
      this.trainerSvc.loadByStore(user.storeId);
      this.trainingSvc.loadByStore(user.storeId);
      this.trainingSvc.listMyTrainings();
    }
    if (!this.isManager()) {
      this.trainingSvc.loadMyTrainings();
    }
    this.trainerSvc.loadMySubmissions();
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-red-600';
  }

  passRateColor(rate: number): string {
    if (rate >= 70) return 'bg-emerald-500';
    if (rate >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  trainingStatusLabel(status: string): string {
    switch (status) {
      case 'COMPLETADA': return 'Completado';
      case 'EN_CURSO': return 'En curso';
      case 'NO_COMPLETADA': return 'No completado';
      default: return 'Programado';
    }
  }

  trainingStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETADA': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
      case 'EN_CURSO': return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25';
      case 'NO_COMPLETADA': return 'bg-red-500/15 text-red-400 border border-red-500/25';
      default: return 'bg-amber-500/15 text-amber-300 border border-amber-500/25';
    }
  }

  examAssignments(examId: string) {
    return this.assignmentsByExam().get(examId) ?? [];
  }

  hasAttemptedExam(examId: string | null | undefined): boolean {
    return !!examId && this.attemptCountByExam().has(examId);
  }

  lastSubmissionFor(examId: string) {
    return this.lastSub().get(examId) ?? null;
  }

  // ── Eliminar / solicitar eliminación ────────────────────────────────────

  readonly actionFeedback = signal('');

  async deleteExam(examId: string, title: string): Promise<void> {
    if (!confirm(`¿Eliminar el examen "${title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.trainerSvc.deleteExam(examId);
    } catch {
      this.actionFeedback.set('No se pudo eliminar el examen.');
    }
  }

  async requestExamDeletion(exam: ExamResponse): Promise<void> {
    if (!confirm(this.deletionConfirmMessage(exam))) return;
    try {
      await this.trainerSvc.requestExamDeletion(exam.id);
      this.actionFeedback.set('Solicitud enviada al administrador.');
    } catch {
      this.actionFeedback.set('No se pudo enviar la solicitud.');
    }
  }

  private deletionConfirmMessage(exam: ExamResponse): string {
    const count = exam.deletionRequestCount;
    if (count >= 2) {
      return `Has solicitado eliminar "${exam.title}" ${count} veces sin respuesta. `
        + `Te recomendamos contactar directamente al administrador. ¿Aún así quieres enviar la solicitud de nuevo?`;
    }
    if (count === 1) {
      return `Ya habías solicitado eliminar "${exam.title}" anteriormente y aún no se ha resuelto. `
        + `¿Quieres solicitarlo de nuevo?`;
    }
    return `¿Solicitar al administrador que elimine "${exam.title}"?`;
  }

  async dismissDeletionRequest(exam: ExamResponse): Promise<void> {
    if (!confirm(`¿Descartar la solicitud de eliminación de "${exam.title}"? Se notificará a ${exam.deletionRequestedByName ?? 'quien la pidió'}.`)) return;
    try {
      await this.trainerSvc.dismissDeletionRequest(exam.id);
    } catch {
      this.actionFeedback.set('No se pudo descartar la solicitud.');
    }
  }

  // ── Quitar / reasignar ejecutador ───────────────────────────────────────

  canRemoveAssignment(training: TrainingResponse): boolean {
    return training.status !== 'COMPLETADA';
  }

  async removeAssignment(training: TrainingResponse): Promise<void> {
    const name = training.assignedUserName || training.position;
    if (!confirm(`¿Quitar a ${name} de este examen? Podrás volver a asignarlo después.`)) return;
    try {
      await this.trainingSvc.delete(training.id);
    } catch {
      this.actionFeedback.set('No se pudo quitar la asignación.');
    }
  }
}
