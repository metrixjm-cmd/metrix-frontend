import { Routes } from '@angular/router';

export const KPI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./kpi-panel/kpi-panel').then(m => m.KpiPanel),
  },
];
