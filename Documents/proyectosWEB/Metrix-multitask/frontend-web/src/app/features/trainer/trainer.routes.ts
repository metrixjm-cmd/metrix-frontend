import { Routes } from '@angular/router';

export const TRAINER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./trainer-home/trainer-home').then(m => m.TrainerHome),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./exam-builder/exam-builder').then(m => m.ExamBuilder),
  },
  {
    path: ':examId/take',
    loadComponent: () =>
      import('./exam-take/exam-take').then(m => m.ExamTake),
  },
  {
    path: ':examId/results',
    loadComponent: () =>
      import('./exam-results/exam-results').then(m => m.ExamResults),
  },
];
