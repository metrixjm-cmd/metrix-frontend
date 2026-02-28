import { Component, computed, input } from '@angular/core';
import { TaskStatus, STATUS_LABELS } from '../../../features/tasks/models/task.models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span [class]="badgeClass()">
      <span class="w-1.5 h-1.5 rounded-full inline-block" [class]="dotClass()"></span>
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  status = input.required<TaskStatus>();

  label = computed(() => STATUS_LABELS[this.status()]);

  badgeClass = computed(() => {
    const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold';
    const map: Record<TaskStatus, string> = {
      PENDING:     `${base} bg-amber-100 text-amber-700 border border-amber-200`,
      IN_PROGRESS: `${base} bg-blue-100 text-blue-700 border border-blue-200`,
      COMPLETED:   `${base} bg-emerald-100 text-emerald-700 border border-emerald-200`,
      FAILED:      `${base} bg-red-100 text-red-700 border border-red-200`,
    };
    return map[this.status()];
  });

  dotClass = computed(() => {
    const map: Record<TaskStatus, string> = {
      PENDING:     'bg-amber-500',
      IN_PROGRESS: 'bg-blue-500 animate-pulse',
      COMPLETED:   'bg-emerald-500',
      FAILED:      'bg-red-500',
    };
    return map[this.status()];
  });
}
