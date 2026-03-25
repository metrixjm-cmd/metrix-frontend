import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import {
  TaskResponse,
  TaskStatus,
  TaskShift,
  CATEGORY_LABELS,
  SHIFT_LABELS,
  STATUS_LABELS,
} from '../models/task.models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadgeComponent, AppDatePipe],
  templateUrl: './task-list.html',
})
export class TaskList implements OnInit {
  readonly auth       = inject(AuthService);
  readonly taskSvc    = inject(TaskService);
  readonly catalogSvc = inject(CatalogService);
  readonly router     = inject(Router);

  // ── Filtros locales ──────────────────────────────────────────────────
  searchQuery    = signal('');
  selectedShift  = signal<TaskShift | ''>('');
  selectedStatus = signal<TaskStatus | ''>('');
  selectedCategory = signal('');
  selectedCritical = signal<'' | 'true' | 'false'>('');
  selectedRecurring = signal<'' | 'true' | 'false'>('');

  // ── Tabs para GERENTE ────────────────────────────────────────────────
  activeTab = signal<'mis-tareas' | 'delegadas'>('mis-tareas');

  readonly isManagerView = computed(() =>
    this.auth.hasAnyRole('ADMIN', 'GERENTE'),
  );

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  readonly isGerente = computed(() =>
    this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'),
  );

  /** Tareas filtradas por todos los criterios */
  readonly filteredTasks = computed(() => {
    let list = this.taskSvc.tasks();

    const q        = this.searchQuery().toLowerCase().trim();
    const shift    = this.selectedShift();
    const status   = this.selectedStatus();
    const category = this.selectedCategory();
    const critical = this.selectedCritical();
    const recurring = this.selectedRecurring();

    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignedToName?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }

    if (shift)    list = list.filter(t => t.shift === shift);
    if (status)   list = list.filter(t => t.status === status);
    if (category) list = list.filter(t => t.category === category);
    if (critical === 'true')  list = list.filter(t => t.isCritical);
    if (critical === 'false') list = list.filter(t => !t.isCritical);
    if (recurring === 'true')  list = list.filter(t => t.isRecurring);
    if (recurring === 'false') list = list.filter(t => !t.isRecurring);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  /** Contadores sobre el set filtrado */
  readonly filteredPending    = computed(() => this.filteredTasks().filter(t => t.status === 'PENDING').length);
  readonly filteredInProgress = computed(() => this.filteredTasks().filter(t => t.status === 'IN_PROGRESS').length);
  readonly filteredCompleted  = computed(() => this.filteredTasks().filter(t => t.status === 'COMPLETED').length);
  readonly filteredFailed     = computed(() => this.filteredTasks().filter(t => t.status === 'FAILED').length);

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery() || !!this.selectedShift() || !!this.selectedStatus() ||
    !!this.selectedCategory() || !!this.selectedCritical() || !!this.selectedRecurring()
  );

  // ── Labels para templates ────────────────────────────────────────────
  readonly categoryLabels = CATEGORY_LABELS;
  readonly shiftLabels    = SHIFT_LABELS;
  readonly statusLabels   = STATUS_LABELS;

  ngOnInit(): void {
    this.loadTasks();
    this.catalogSvc.loadCategorias();
  }

  loadTasks(): void {
    if (this.isAdmin()) {
      this.taskSvc.loadAllTasks();
    } else if (this.isGerente()) {
      this.loadGerenteTab();
    } else {
      this.taskSvc.loadMyTasks();
    }
  }

  switchTab(tab: 'mis-tareas' | 'delegadas'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.clearFilters();
    this.loadGerenteTab();
  }

  private loadGerenteTab(): void {
    if (this.activeTab() === 'mis-tareas') {
      this.taskSvc.loadMyTasks();
    } else {
      const storeId = this.auth.currentUser()?.storeId ?? '';
      this.taskSvc.loadTasksByStore(storeId);
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedShift.set('');
    this.selectedStatus.set('');
    this.selectedCategory.set('');
    this.selectedCritical.set('');
    this.selectedRecurring.set('');
  }

  onShiftChange(value: string): void { this.selectedShift.set(value as TaskShift | ''); }
  onStatusChange(value: string): void { this.selectedStatus.set(value as TaskStatus | ''); }
  onCategoryChange(value: string): void { this.selectedCategory.set(value); }
  onCriticalChange(value: string): void { this.selectedCritical.set(value as '' | 'true' | 'false'); }
  onRecurringChange(value: string): void { this.selectedRecurring.set(value as '' | 'true' | 'false'); }

  filterByStatus(status: TaskStatus): void {
    this.selectedStatus.set(this.selectedStatus() === status ? '' : status);
  }

  // ── Estado de tarjetas expandibles ─────────────────────────────────
  expandedTaskId = signal<string | null>(null);
  startingTaskId = signal<string | null>(null);
  completingTaskId = signal<string | null>(null);
  failingTaskId = signal<string | null>(null);
  showFailFormId = signal<string | null>(null);
  failComments = signal('');
  togglingStepId = signal<string | null>(null);
  actionError = signal<string | null>(null);

  // ── Confirmación de completar + mensaje de éxito ───────────────────
  confirmCompleteId = signal<string | null>(null);
  successTaskId = signal<string | null>(null);
  successTaskTitle = signal('');

  // ── Eliminación ────────────────────────────────────────────────────
  confirmingDeleteId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  // ── Helpers de permisos ────────────────────────────────────────────

  isAssignee(task: TaskResponse): boolean {
    return task.assignedToName === this.auth.currentUser()?.nombre;
  }

  canStartTask(task: TaskResponse): boolean {
    return task.status === 'PENDING' && this.isAssignee(task);
  }

  canCompleteTask(task: TaskResponse): boolean {
    return task.status === 'IN_PROGRESS' && this.isAssignee(task);
  }

  canFailTask(task: TaskResponse): boolean {
    return task.status === 'IN_PROGRESS' && this.isAssignee(task);
  }

  canCheckProcesses(task: TaskResponse): boolean {
    return this.isAssignee(task) && task.status === 'IN_PROGRESS';
  }

  // ── Acciones inline ────────────────────────────────────────────────

  toggleExpand(taskId: string): void {
    this.expandedTaskId.set(this.expandedTaskId() === taskId ? null : taskId);
    this.showFailFormId.set(null);
    this.failComments.set('');
    this.actionError.set(null);
  }

  quickStartTask(task: TaskResponse, event?: Event): void {
    event?.stopPropagation();
    this.startingTaskId.set(task.id);
    this.actionError.set(null);
    this.taskSvc.updateStatus(task.id, { newStatus: 'IN_PROGRESS' }).subscribe({
      next: () => {
        this.startingTaskId.set(null);
        // Colapsar tarjeta expandida — la vista inline de procesos aparece automáticamente
        this.expandedTaskId.set(null);
      },
      error: (err) => { this.startingTaskId.set(null); this.actionError.set(this.extractMsg(err)); },
    });
  }

  /** Abre modal de confirmación para completar */
  askCompleteTask(taskId: string, event?: Event): void {
    event?.stopPropagation();
    this.confirmCompleteId.set(taskId);
  }

  cancelComplete(): void {
    this.confirmCompleteId.set(null);
  }

  /** Ejecuta el completado tras confirmación */
  confirmAndComplete(task: TaskResponse): void {
    this.confirmCompleteId.set(null);
    this.completingTaskId.set(task.id);
    this.actionError.set(null);
    this.taskSvc.updateStatus(task.id, { newStatus: 'COMPLETED' }).subscribe({
      next: () => {
        this.completingTaskId.set(null);
        // Mostrar felicitación solo si cumplió todos sus procesos
        const allDone = !task.processes?.length || task.processes.every(p => p.completed);
        if (allDone) {
          this.successTaskId.set(task.id);
          this.successTaskTitle.set(task.title);
          setTimeout(() => {
            if (this.successTaskId() === task.id) {
              this.successTaskId.set(null);
              this.successTaskTitle.set('');
            }
          }, 4000);
        }
      },
      error: (err) => { this.completingTaskId.set(null); this.actionError.set(this.extractMsg(err)); },
    });
  }

  openFailForm(taskId: string): void {
    this.showFailFormId.set(taskId);
    this.failComments.set('');
    this.actionError.set(null);
  }

  cancelFailForm(): void {
    this.showFailFormId.set(null);
    this.failComments.set('');
  }

  submitFail(task: TaskResponse): void {
    const comments = this.failComments().trim();
    if (comments.length < 10) return;
    this.failingTaskId.set(task.id);
    this.actionError.set(null);
    this.taskSvc.updateStatus(task.id, { newStatus: 'FAILED', comments }).subscribe({
      next: () => { this.failingTaskId.set(null); this.showFailFormId.set(null); this.failComments.set(''); },
      error: (err) => { this.failingTaskId.set(null); this.actionError.set(this.extractMsg(err)); },
    });
  }

  toggleProcessStep(taskId: string, stepId: string, currentCompleted: boolean, event?: Event): void {
    event?.stopPropagation();
    this.togglingStepId.set(stepId);
    this.taskSvc.updateProcessStep(taskId, stepId, !currentCompleted).subscribe({
      next: () => this.togglingStepId.set(null),
      error: () => this.togglingStepId.set(null),
    });
  }

  getProcessProgress(task: TaskResponse): { done: number; total: number; percent: number } | null {
    if (!task.processes?.length) return null;
    const done = task.processes.filter(p => p.completed).length;
    return { done, total: task.processes.length, percent: Math.round((done / task.processes.length) * 100) };
  }

  // ── Navegación ─────────────────────────────────────────────────────

  goToCreate(): void {
    this.router.navigate(['/tasks/create']);
  }

  confirmDelete(taskId: string, event: Event): void {
    event.stopPropagation();
    this.confirmingDeleteId.set(taskId);
  }

  cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  executeDelete(taskId: string, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(taskId);
    this.taskSvc.deactivateTask(taskId).subscribe({
      next: () => { this.deletingId.set(null); this.confirmingDeleteId.set(null); },
      error: () => { this.deletingId.set(null); },
    });
  }

  trackById(_: number, task: TaskResponse): string {
    return task.id;
  }

  isOverdue(task: TaskResponse): boolean {
    if (task.status === 'COMPLETED' || task.status === 'FAILED') return false;
    if (task.isRecurring) return false;
    return new Date(task.dueAt) < new Date();
  }

  getCategoryLabel(category: string): string {
    return this.categoryLabels[category] || category;
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  getRelativeTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days}d`;
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
