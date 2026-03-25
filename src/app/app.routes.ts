import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ── Auth (pública, sin layout) ──────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ── Shell protegido (sidebar + header) ──────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/app-layout').then(m => m.AppLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'tasks',
        loadChildren: () =>
          import('./features/tasks/tasks.routes').then(m => m.TASKS_ROUTES),
      },
      {
        path: 'kpi',
        canActivate: [roleGuard('ADMIN', 'GERENTE')],
        loadChildren: () =>
          import('./features/kpi/kpi.routes').then(m => m.KPI_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [roleGuard('ADMIN', 'GERENTE')],
        loadChildren: () =>
          import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
      },
      {
        path: 'banco-info',
        canActivate: [roleGuard('ADMIN', 'GERENTE')],
        loadChildren: () =>
          import('./features/rh/rh.routes').then(m => m.RH_ROUTES),
      },
      {
        path: 'training',
        loadChildren: () =>
          import('./features/training/training.routes').then(m => m.TRAINING_ROUTES),
      },
      {
        path: 'gamification',
        loadChildren: () =>
          import('./features/gamification/gamification.routes').then(m => m.GAMIFICATION_ROUTES),
      },
      {
        path: 'incidents',
        loadChildren: () =>
          import('./features/incidents/incidents.routes').then(m => m.INCIDENTS_ROUTES),
      },
      {
        path: 'trainer',
        loadChildren: () =>
          import('./features/trainer/trainer.routes').then(m => m.TRAINER_ROUTES),
      },
      {
        path: 'help',
        loadChildren: () =>
          import('./features/help/help.routes').then(m => m.HELP_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'auth/login' },
];
