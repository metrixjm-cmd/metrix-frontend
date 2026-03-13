import { Routes } from '@angular/router';

export const RH_ROUTES: Routes = [
  // ── Hub "Banco de Información" ──────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./banco-info/banco-info').then(m => m.BancoInfo),
  },

  // ── Usuarios ─────────────────────────────────────────────────────────
  {
    path: 'usuarios',
    loadComponent: () => import('./user-list/user-list').then(m => m.UserList),
  },
  {
    path: 'usuarios/create',
    loadComponent: () => import('./user-create/user-create').then(m => m.UserCreate),
  },
  {
    path: 'usuarios/:id',
    loadComponent: () => import('./user-profile/user-profile').then(m => m.UserProfile),
  },

  // ── Sucursales (movidas desde /settings) ─────────────────────────────
  {
    path: 'sucursales',
    loadComponent: () =>
      import('../settings/store-list/store-list').then(m => m.StoreList),
  },
  {
    path: 'sucursales/create',
    loadComponent: () =>
      import('../settings/store-create/store-create').then(m => m.StoreCreate),
  },
  {
    path: 'sucursales/:id',
    loadComponent: () =>
      import('../settings/store-detail/store-detail').then(m => m.StoreDetail),
  },
];
