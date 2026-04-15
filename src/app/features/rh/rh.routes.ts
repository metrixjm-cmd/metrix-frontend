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

  // ── Puestos ──────────────────────────────────────────────────────────
  {
    path: 'puestos',
    loadComponent: () => import('./puesto-list/puesto-list').then(m => m.PuestoList),
  },

  // ── Categorías de tareas ────────────────────────────────────────────
  {
    path: 'categorias',
    loadComponent: () => import('./categoria-list/categoria-list').then(m => m.CategoriaList),
  },
  {
    path: 'tareas',
    loadComponent: () => import('./task-template-list/task-template-list').then(m => m.TaskTemplateList),
  },

  // ── Plantillas de capacitación ───────────────────────────────────────
  {
    path: 'plantillas',
    loadComponent: () =>
      import('./template-list/template-list').then(m => m.TemplateList),
  },

  // ── Materiales de capacitación ───────────────────────────────────────
  {
    path: 'materiales',
    loadComponent: () =>
      import('./material-list/material-list').then(m => m.MaterialList),
  },

  // ── Banco de preguntas ───────────────────────────────────────────────
  {
    path: 'banco-preguntas',
    loadComponent: () =>
      import('./banco-preguntas/banco-preguntas').then(m => m.BancoPreguntasComponent),
  },

  // ── Plantillas de examen ─────────────────────────────────────────────
  {
    path: 'plantillas-examen',
    loadComponent: () =>
      import('./plantillas-examen/plantillas-examen').then(m => m.PlantillasExamenComponent),
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
