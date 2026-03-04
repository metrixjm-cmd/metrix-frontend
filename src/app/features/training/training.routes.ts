import { Routes } from '@angular/router';

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./training-list/training-list').then(m => m.TrainingList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./training-create/training-create').then(m => m.TrainingCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./training-detail/training-detail').then(m => m.TrainingDetail),
  },
];
