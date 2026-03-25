import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./task-list/task-list').then(m => m.TaskList),
  },
  {
    path: 'create',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./task-create/task-create').then(m => m.TaskCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./task-detail/task-detail').then(m => m.TaskDetail),
  },
];
