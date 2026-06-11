import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const TRAINER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./trainer-home/trainer-home').then(m => m.TrainerHome),
  },
  {
    path: 'new',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./exam-builder/exam-builder').then(m => m.ExamBuilder),
  },
  {
    path: ':examId/edit',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./exam-builder/exam-builder').then(m => m.ExamBuilder),
  },
  {
    path: ':examId/assign',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./exam-assign/exam-assign').then(m => m.ExamAssign),
  },
  {
    path: ':examId/view',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./exam-view/exam-view').then(m => m.ExamView),
  },
  {
    path: ':examId/take',
    loadComponent: () =>
      import('./exam-take/exam-take').then(m => m.ExamTake),
  },
  {
    path: ':examId/results',
    canActivate: [roleGuard('ADMIN', 'GERENTE')],
    loadComponent: () =>
      import('./exam-results/exam-results').then(m => m.ExamResults),
  },
];
