import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
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
  imports: [RouterLink, FormsModule, StatusBadgeComponent],
  templateUrl: './task-list.html',
})
export class TaskList implements OnInit {
  readonly auth    = inject(AuthService);
  readonly taskSvc = inject(TaskService);
  readonly router  = inject(Router);

  // ── Filtros locales ──────────────────────────────────────────────────
  selectedShift  = signal<TaskShift | ''>('');
  selectedStatus = signal<TaskStatus | ''>('');

  readonly isManagerView = computed(() =>
    this.auth.hasAnyRole('ADMIN', 'GERENTE'),
  );

  readonly filteredTasks = computed(() => {
    let list = this.taskSvc.tasks();

    const shift  = this.selectedShift();
    const status = this.selectedStatus();

    if (shift)  list = list.filter(t => t.shift  === shift);
    if (status) list = list.filter(t => t.status === status);

    return list;
  });

  // ── Labels para templates ────────────────────────────────────────────
  readonly categoryLabels = CATEGORY_LABELS;
  readonly shiftLabels    = SHIFT_LABELS;
  readonly statusLabels   = STATUS_LABELS;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    if (this.isManagerView()) {
      const storeId = this.auth.currentUser()?.storeId ?? '';
      this.taskSvc.loadTasksByStore(storeId);
    } else {
      this.taskSvc.loadMyTasks();
    }
  }

  onShiftChange(value: string): void {
    this.selectedShift.set(value as TaskShift | '');
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value as TaskStatus | '');
  }

  goToDetail(task: TaskResponse): void {
    this.router.navigate(['/tasks', task.id]);
  }

  goToCreate(): void {
    this.router.navigate(['/tasks/create']);
  }

  trackById(_: number, task: TaskResponse): string {
    return task.id;
  }

  isCriticalBadge(task: TaskResponse): boolean {
    return task.isCritical;
  }

  isOverdue(task: TaskResponse): boolean {
    if (task.status === 'COMPLETED' || task.status === 'FAILED') return false;
    return new Date(task.dueAt) < new Date();
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
