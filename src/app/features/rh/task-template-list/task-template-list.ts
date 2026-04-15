import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CatalogService } from '../../../core/services/catalog.service';
import { TaskTemplateEntry, TaskTemplateStep } from '../../tasks/models/task-template.models';
import { TaskTemplateService } from '../../tasks/services/task-template.service';

@Component({
  selector: 'app-task-template-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './task-template-list.html',
})
export class TaskTemplateList implements OnInit {
  readonly templateSvc = inject(TaskTemplateService);
  readonly catalogSvc = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly viewingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly checklist = signal<TaskTemplateStep[]>([]);
  readonly newStepTitle = signal('');

  readonly isEditing = computed(() => this.editingId() !== null);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadData();
    if (this.route.snapshot.queryParamMap.get('create') === '1') {
      this.startCreate();
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await Promise.all([
        this.templateSvc.loadAll(),
        this.catalogSvc.loadCategorias(),
      ]);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al cargar las plantillas de tareas');
    } finally {
      this.loading.set(false);
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.viewingId.set(null);
    this.form.reset();
    this.checklist.set([]);
    this.newStepTitle.set('');
    this.showForm.set(true);
    this.error.set(null);
  }

  startEdit(template: TaskTemplateEntry): void {
    this.editingId.set(template.id);
    this.viewingId.set(null);
    this.form.patchValue({
      title: template.title,
      description: template.description,
      category: template.category,
    });
    this.checklist.set((template.steps ?? []).map(step => ({
      title: step.title,
      description: step.description ?? '',
      tags: step.tags ?? [],
      order: step.order,
    })));
    this.newStepTitle.set('');
    this.showForm.set(true);
    this.error.set(null);
  }

  startView(template: TaskTemplateEntry): void {
    this.viewingId.set(template.id);
    this.editingId.set(null);
    this.showForm.set(false);
    this.error.set(null);
  }

  closeView(): void {
    this.viewingId.set(null);
  }

  readonly viewingTemplate = computed(() =>
    this.templateSvc.templates().find(template => template.id === this.viewingId()) ?? null
  );

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset();
    this.checklist.set([]);
    this.newStepTitle.set('');
  }

  addChecklistStep(): void {
    const title = this.newStepTitle().trim();
    if (!title) return;
    this.checklist.update(steps => [
      ...steps,
      { title, description: '', tags: [], order: steps.length },
    ]);
    this.newStepTitle.set('');
  }

  removeChecklistStep(index: number): void {
    this.checklist.update(steps =>
      steps.filter((_, i) => i !== index).map((step, order) => ({ ...step, order }))
    );
  }

  moveChecklistStep(index: number, direction: -1 | 1): void {
    this.checklist.update(steps => {
      const target = index + direction;
      if (target < 0 || target >= steps.length) return steps;
      const next = [...steps];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((step, order) => ({ ...step, order }));
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const request = {
      title: value.title!.trim(),
      description: value.description!.trim(),
      category: value.category!,
      steps: this.checklist().map((step, order) => ({
        title: step.title.trim(),
        description: step.description?.trim() || undefined,
        tags: step.tags ?? [],
        order,
      })),
    };

    try {
      const id = this.editingId();
      if (id) {
        await this.templateSvc.update(id, request);
      } else {
        await this.templateSvc.create(request);
      }
      this.cancelForm();
      await this.templateSvc.loadAll();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.error?.message ?? 'Error al guardar la plantilla');
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  async executeDelete(): Promise<void> {
    const id = this.deletingId();
    if (!id || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.templateSvc.delete(id);
      this.deletingId.set(null);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al eliminar la plantilla');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteEditingTemplate(): Promise<void> {
    const id = this.editingId();
    if (!id || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.templateSvc.delete(id);
      this.cancelForm();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al eliminar la plantilla');
    } finally {
      this.saving.set(false);
    }
  }

  hasError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!(control?.hasError(error) && control?.touched);
  }
}
