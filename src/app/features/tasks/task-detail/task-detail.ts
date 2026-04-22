import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { TimeFormatPipe } from '../../../shared/pipes/time-format.pipe';
import { CATEGORY_LABELS, SHIFT_LABELS } from '../models/task.models';
import { EvidenceUpload } from '../evidence-upload/evidence-upload';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [ReactiveFormsModule, StatusBadgeComponent, ButtonComponent, AppDatePipe, TimeFormatPipe, EvidenceUpload],
  templateUrl: './task-detail.html',
})
export class TaskDetail implements OnInit {
  readonly auth    = inject(AuthService);
  readonly taskSvc = inject(TaskService);
  readonly route   = inject(ActivatedRoute);
  readonly router  = inject(Router);
  readonly fb      = inject(FormBuilder);

  readonly categoryLabels = CATEGORY_LABELS;
  readonly shiftLabels    = SHIFT_LABELS;

  // ── Estado local ────────────────────────────────────────────────────
  submitting  = signal(false);
  actionError = signal<string | null>(null);
  showFailForm     = signal(false);
  showRatingForm   = signal(false);
  hoverStar        = signal(0);
  selectedStar     = signal(0);

  // ── Formulario para FALLAR (comments obligatorio) ────────────────────
  failForm = this.fb.group({
    comments: ['', [Validators.required, Validators.minLength(10)]],
  });

  // ── Formulario para CALIFICAR CALIDAD (solo el creador de la tarea) ──
  ratingForm = this.fb.group({
    rating:   [null as number | null, [Validators.required, Validators.min(1), Validators.max(5)]],
    comments: [''],
  });

  // ── Computed desde el servicio ───────────────────────────────────────
  readonly task = computed(() => this.taskSvc.selectedTask());

  /** El usuario actual es el asignado de esta tarea */
  readonly isAssignee = computed(() => {
    const t = this.task();
    const user = this.auth.currentUser();
    if (!t || !user) return false;
    return t.assignedToName === user.nombre;
  });

  readonly canStart = computed(() => {
    const t = this.task();
    return t?.status === 'PENDING' && this.isAssignee();
  });

  readonly canComplete = computed(() => {
    const t = this.task();
    return t?.status === 'IN_PROGRESS' && this.isAssignee();
  });

  readonly canFail = computed(() => {
    const t = this.task();
    return t?.status === 'IN_PROGRESS' && this.isAssignee();
  });

  readonly canUploadEvidence = computed(() => {
    const t = this.task();
    return this.isAssignee() && t?.status === 'IN_PROGRESS';
  });

  readonly isEjecutador   = computed(() => this.auth.hasRole('EJECUTADOR'));
  readonly isAdmin        = computed(() => this.auth.hasRole('ADMIN'));
  readonly isGerente      = computed(() => this.auth.hasRole('GERENTE'));
  readonly isManagerView  = computed(() => this.isAdmin() || this.isGerente());

  /** Solo el asignado puede hacer check en procesos, y solo si la tarea está en progreso */
  readonly canCheckProcesses = computed(() =>
    this.isAssignee() && this.task()?.status === 'IN_PROGRESS',
  );

  /** Solo el creador de la tarea puede evaluar calidad (no el ejecutor) */
  readonly isCreator = computed(() => {
    const t = this.task();
    const user = this.auth.currentUser();
    if (!t || !user) return false;
    return t.createdBy === user.numeroUsuario;
  });

  readonly canRateQuality = computed(() => {
    const t = this.task();
    return this.isCreator() && t?.status === 'COMPLETED';
  });

  /** Todos los procesos de la tarea, ordenados */
  readonly visibleProcesses = computed(() => {
    const t = this.task();
    if (!t?.processes?.length) return [];
    return [...t.processes].sort((a, b) => a.order - b.order);
  });

  readonly processProgress = computed(() => {
    const visible = this.visibleProcesses();
    if (!visible.length) return null;
    const done = visible.filter(p => p.completed).length;
    return { done, total: visible.length, percent: Math.round((done / visible.length) * 100) };
  });

  togglingStep = signal<string | null>(null);

  toggleProcessStep(stepId: string, currentCompleted: boolean): void {
    const taskId = this.task()?.id;
    if (!taskId) return;
    this.togglingStep.set(stepId);
    this.taskSvc.updateProcessStep(taskId, stepId, !currentCompleted).subscribe({
      next: () => this.togglingStep.set(null),
      error: () => this.togglingStep.set(null),
    });
  }

  /** ADMIN: editar un proceso inline */
  editingProcessId = signal<string | null>(null);
  editProcessTitle = signal('');
  editProcessDesc  = signal('');
  savingProcess    = signal(false);

  startEditProcess(step: { stepId: string; title: string; description: string | null }): void {
    this.editingProcessId.set(step.stepId);
    this.editProcessTitle.set(step.title);
    this.editProcessDesc.set(step.description ?? '');
  }

  cancelEditProcess(): void {
    this.editingProcessId.set(null);
    this.editProcessTitle.set('');
    this.editProcessDesc.set('');
  }

  saveEditProcess(): void {
    const taskId = this.task()?.id;
    const stepId = this.editingProcessId();
    if (!taskId || !stepId || !this.editProcessTitle().trim()) return;
    this.savingProcess.set(true);
    this.taskSvc.editProcessStep(taskId, stepId, this.editProcessTitle().trim(), this.editProcessDesc().trim() || undefined).subscribe({
      next: () => { this.savingProcess.set(false); this.cancelEditProcess(); },
      error: () => this.savingProcess.set(false),
    });
  }

  /** ADMIN: eliminar un proceso */
  deletingStepId = signal<string | null>(null);

  deleteProcessStep(stepId: string): void {
    const taskId = this.task()?.id;
    if (!taskId) return;
    this.deletingStepId.set(stepId);
    // Marcar como completado con nota de eliminación via el endpoint existente
    // Mejor: usar un DELETE dedicado. Por ahora lo removemos del array via PATCH
    this.taskSvc.deleteProcessStep(taskId, stepId).subscribe({
      next: () => this.deletingStepId.set(null),
      error: () => this.deletingStepId.set(null),
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.taskSvc.loadTaskById(id);
  }

  // ── Acciones de estado ───────────────────────────────────────────────

  startTask(): void {
    const id = this.task()?.id;
    if (!id) return;

    this.submitting.set(true);
    this.actionError.set(null);

    this.taskSvc.updateStatus(id, { newStatus: 'IN_PROGRESS' }).subscribe({
      next:  () => this.submitting.set(false),
      error: err => {
        this.actionError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  completeTask(): void {
    const id = this.task()?.id;
    if (!id) return;

    this.submitting.set(true);
    this.actionError.set(null);

    this.taskSvc.updateStatus(id, { newStatus: 'COMPLETED' }).subscribe({
      next: () => this.submitting.set(false),
      error: err => {
        this.actionError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  failTask(): void {
    const id = this.task()?.id;
    if (!id || this.failForm.invalid) return;

    this.submitting.set(true);
    this.actionError.set(null);

    this.taskSvc.updateStatus(id, {
      newStatus: 'FAILED',
      comments:  this.failForm.value.comments ?? '',
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showFailForm.set(false);
      },
      error: err => {
        this.actionError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  submitRating(): void {
    const id = this.task()?.id;
    if (!id || this.ratingForm.invalid) return;

    const rating   = this.ratingForm.value.rating!;
    const comments = this.ratingForm.value.comments ?? undefined;

    this.submitting.set(true);
    this.actionError.set(null);

    this.taskSvc.rateQuality(id, rating, comments || undefined).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showRatingForm.set(false);
        this.ratingForm.reset();
        this.selectedStar.set(0);
      },
      error: err => {
        this.actionError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  selectStar(n: number): void {
    this.selectedStar.set(n);
    this.ratingForm.patchValue({ rating: n });
  }

  readonly starsArray = [1, 2, 3, 4, 5];

  /** Calcula cuánto tardó en completarse un paso desde el inicio de la tarea */
  getStepDuration(completedAt: string | null): string {
    const startedAt = this.task()?.startedAt;
    if (!completedAt || !startedAt) return '';
    const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (diff < 0) return '';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
  }

  getProcessReason(processTitle: string): string | null {
    const comments = this.task()?.comments;
    if (!comments) return null;
    const lines = comments.split('\n');
    for (const line of lines) {
      const trimmed = line.replace(/^[•\-]\s*/, '');
      const colonIdx = trimmed.indexOf(': ');
      if (colonIdx === -1) continue;
      const title = trimmed.slice(0, colonIdx).trim();
      if (title.toLowerCase() === processTitle.toLowerCase()) {
        return trimmed.slice(colonIdx + 2).trim() || null;
      }
    }
    return null;
  }

  goBack(): void {
    this.router.navigate(['/tasks']);
  }

  onEvidenceUploaded(): void {
    this.actionError.set(null);
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { error?: string; message?: string } }).error;
      if (e?.error) return e.error;
      if (e?.message) return e.message;
    }
    return 'Ocurrió un error. Intenta de nuevo.';
  }
}
