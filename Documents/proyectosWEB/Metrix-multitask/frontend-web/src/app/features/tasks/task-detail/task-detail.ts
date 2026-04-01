import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EvidenceUpload } from '../evidence-upload/evidence-upload';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CATEGORY_LABELS, SHIFT_LABELS } from '../models/task.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [ReactiveFormsModule, StatusBadgeComponent, ButtonComponent, EvidenceUpload, AppDatePipe],
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
  showCompleteForm = signal(false);
  showFailForm     = signal(false);
  showRatingForm   = signal(false);
  hoverStar        = signal(0);
  selectedStar     = signal(0);

  // ── Formulario para COMPLETAR (qualityRating opcional) ───────────────
  completeForm = this.fb.group({
    qualityRating: [null as number | null, [Validators.min(1), Validators.max(5)]],
  });

  // ── Formulario para FALLAR (comments obligatorio) ────────────────────
  failForm = this.fb.group({
    comments: ['', [Validators.required, Validators.minLength(10)]],
  });

  // ── Formulario para CALIFICAR CALIDAD (GERENTE/ADMIN) ────────────────
  ratingForm = this.fb.group({
    rating:   [null as number | null, [Validators.required, Validators.min(1), Validators.max(5)]],
    comments: [''],
  });

  // ── Computed desde el servicio ───────────────────────────────────────
  readonly task = computed(() => this.taskSvc.selectedTask());

  readonly canStart = computed(() => {
    const t = this.task();
    return t?.status === 'PENDING';
  });

  readonly canComplete = computed(() => {
    const t = this.task();
    return t?.status === 'IN_PROGRESS';
  });

  readonly canFail = computed(() => {
    const t = this.task();
    return t?.status === 'IN_PROGRESS';
  });

  readonly isEjecutador   = computed(() => this.auth.hasRole('EJECUTADOR'));
  readonly isManagerView  = computed(() => this.auth.hasRole('ADMIN') || this.auth.hasRole('GERENTE'));

  readonly canRateQuality = computed(() => {
    const t = this.task();
    return this.isManagerView() && t?.status === 'COMPLETED';
  });

  readonly hasEvidence = computed(() => {
    const t = this.task();
    return (t?.evidenceImages?.length ?? 0) > 0 || (t?.evidenceVideos?.length ?? 0) > 0;
  });

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
    if (!id || this.completeForm.invalid) return;

    this.submitting.set(true);
    this.actionError.set(null);

    const rating = this.completeForm.value.qualityRating ?? undefined;

    this.taskSvc.updateStatus(id, {
      newStatus:     'COMPLETED',
      qualityRating: rating ?? undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showCompleteForm.set(false);
      },
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

  goBack(): void {
    this.router.navigate(['/tasks']);
  }


  filenameFromUrl(url: string): string {
    return url.split('/').pop() ?? url;
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
