import { Routes } from '@angular/router';

export const RH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list').then(m => m.UserList),
  },
  {
    path: 'create',
    loadComponent: () => import('./user-create/user-create').then(m => m.UserCreate),
  },
  {
    path: ':id',
    loadComponent: () => import('./user-profile/user-profile').then(m => m.UserProfile),
  },
];
