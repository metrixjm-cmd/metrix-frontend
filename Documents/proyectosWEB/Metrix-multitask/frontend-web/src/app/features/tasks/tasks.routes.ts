import { Routes } from '@angular/router';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./task-list/task-list').then(m => m.TaskList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./task-create/task-create').then(m => m.TaskCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./task-detail/task-detail').then(m => m.TaskDetail),
  },
];
