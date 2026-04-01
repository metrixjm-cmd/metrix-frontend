import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./store-list/store-list').then(m => m.StoreList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./store-create/store-create').then(m => m.StoreCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./store-detail/store-detail').then(m => m.StoreDetail),
  },
];
