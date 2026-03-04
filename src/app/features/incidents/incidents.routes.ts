import { Routes } from '@angular/router';

export const INCIDENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./incident-list/incident-list').then(m => m.IncidentList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./incident-create/incident-create').then(m => m.IncidentCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./incident-detail/incident-detail').then(m => m.IncidentDetail),
  },
];
