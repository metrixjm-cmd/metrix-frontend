import { Routes } from '@angular/router';
import { platformAdminGuard } from '../../core/guards/platform-admin.guard';

export const PLATFORM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./instance-list/instance-list').then(m => m.InstanceList),
    canActivate: [platformAdminGuard],
  },
];
