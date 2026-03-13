import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TaskCategory, TaskShift } from '../models/task.models';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './task-create.html',
})
export class TaskCreate {
  readonly auth    = inject(AuthService);
  readonly taskSvc = inject(TaskService);
  readonly router  = inject(Router);
  readonly fb      = inject(FormBuilder);

  submitting  = signal(false);
  submitError = signal<string | null>(null);
  submitted   = signal(false);

  /** Valor mínimo para datetime-local: ahora mismo (evita fechas pasadas) */
  readonly todayMin = new Date().toISOString().slice(0, 16);

  readonly form = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category:    ['' as TaskCategory | '', Validators.required],
    isCritical:  [false],
    assignedToId:['', Validators.required],
    position:    ['', Validators.required],
    storeId:     [this.auth.currentUser()?.storeId ?? '', Validators.required],
    shift:       ['' as TaskShift | '', Validators.required],
    dueAt:       ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.taskSvc.createTask({
      title:        v.title!,
      description:  v.description!,
      category:     v.category as TaskCategory,
      isCritical:   v.isCritical ?? false,
      assignedToId: v.assignedToId!,
      position:     v.position!,
      storeId:      v.storeId!,
      shift:        v.shift as TaskShift,
      dueAt:        new Date(v.dueAt!).toISOString(),
    }).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: err => {
        this.submitError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  goToList(): void {
    this.router.navigate(['/tasks']);
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al crear la tarea. Verifica los datos e intenta de nuevo.';
  }
}
