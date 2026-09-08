import { Routes } from '@angular/router';
import { licenseGuard } from '../../core/guards/license.guard';

export const RH_ROUTES: Routes = [
  // ── Hub "Banco de Datos" (núcleo — sin gate de licencia) ─────────────
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

  // ── Plantillas de capacitación (TRAININGS) ───────────────────────────
  {
    path: 'plantillas',
    canActivate: [licenseGuard('TRAININGS')],
    loadComponent: () =>
      import('./template-list/template-list').then(m => m.TemplateList),
  },

  // ── Materiales de capacitación (TRAININGS) ───────────────────────────
  {
    path: 'materiales',
    canActivate: [licenseGuard('TRAININGS')],
    loadComponent: () =>
      import('./material-list/material-list').then(m => m.MaterialList),
  },

  // ── Bitácora de exámenes (EXAMS) ─────────────────────────────────────
  {
    path: 'bitacora-examenes',
    canActivate: [licenseGuard('EXAMS')],
    loadComponent: () =>
      import('./bitacora-examenes/bitacora-examenes').then(m => m.BitacoraExamenes),
  },

  // ── Banco de preguntas (EXAMS) ───────────────────────────────────────
  {
    path: 'banco-preguntas',
    canActivate: [licenseGuard('EXAMS')],
    loadComponent: () =>
      import('./banco-preguntas/banco-preguntas').then(m => m.BancoPreguntasComponent),
  },

  // ── Plantillas de examen (EXAMS) ─────────────────────────────────────
  {
    path: 'plantillas-examen',
    canActivate: [licenseGuard('EXAMS')],
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
