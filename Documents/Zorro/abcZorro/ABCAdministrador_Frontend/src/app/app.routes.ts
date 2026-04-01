import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GrupoAdminComponent } from './components/grupo-admin/grupo-admin.component';
import { authGuard } from './guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'admin', component: GrupoAdminComponent, canActivate: [authGuard]}
];
