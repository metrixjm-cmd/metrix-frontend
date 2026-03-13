import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { CreateUserRequest, ROLES_DISPONIBLES, ROL_LABELS, TURNOS } from '../rh.models';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-create.html',
})
export class UserCreate {
  private readonly authSvc = inject(AuthService);
  private readonly rhSvc   = inject(RhService);
  private readonly router  = inject(Router);
  private readonly fb      = inject(FormBuilder);

  readonly saving    = this.rhSvc.saving;
  readonly error     = this.rhSvc.error;
  readonly turnos    = TURNOS;
  readonly roles     = ROLES_DISPONIBLES;
  readonly rolLabels = ROL_LABELS;

  readonly isAdmin = computed(() => this.authSvc.hasRole('ADMIN'));

  readonly form = this.fb.group({
    nombre:        ['', [Validators.required, Validators.minLength(2)]],
    puesto:        ['', Validators.required],
    storeId:       [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    turno:         ['MATUTINO', Validators.required],
    numeroUsuario: ['', Validators.required],
    password:      ['', [Validators.required, Validators.minLength(8)]],
    roles:         [['EJECUTADOR'], Validators.required],
  });

  // GERENTE no puede cambiar storeId ni asignar roles libremente
  get storeIdDisabled(): boolean {
    return !this.authSvc.hasRole('ADMIN');
  }

  isRolSelected(rol: string): boolean {
    const roles = this.form.get('roles')?.value as string[] ?? [];
    return roles.includes(rol);
  }

  toggleRol(rol: string): void {
    if (!this.isAdmin()) return;
    const current = this.form.get('roles')?.value as string[] ?? [];
    const updated = current.includes(rol)
      ? current.filter(r => r !== rol)
      : [...current, rol];
    this.form.get('roles')?.setValue(updated.length ? updated : ['EJECUTADOR']);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const req: CreateUserRequest = {
      nombre:        v.nombre!,
      puesto:        v.puesto!,
      storeId:       v.storeId!,
      turno:         v.turno!,
      numeroUsuario: v.numeroUsuario!,
      password:      v.password!,
      roles:         (v.roles as string[]) ?? ['EJECUTADOR'],
    };

    try {
      await this.rhSvc.createUser(req);
      this.router.navigate(['/rh/usuarios']);
    } catch {
      // error ya seteado en rhSvc._error
    }
  }
}
