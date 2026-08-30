import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const PLATFORM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./instance-list/instance-list').then(m => m.InstanceList),
    canActivate: [roleGuard('ADMIN')],
  },
];
