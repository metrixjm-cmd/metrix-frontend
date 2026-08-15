import { Routes } from '@angular/router';

export const LICENSING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./license-list/license-list').then(m => m.LicenseList),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./license-edit/license-edit').then(m => m.LicenseEdit),
  },
];
