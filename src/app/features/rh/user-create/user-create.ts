import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { CreateUserRequest, ROLES_DISPONIBLES, ROL_LABELS, TURNOS } from '../rh.models';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogEntry } from '../../../core/services/catalog.models';
import { AddCatalogDialog } from '../../../shared/components/add-catalog-dialog/add-catalog-dialog';
import { SettingsService } from '../../settings/services/settings.service';
import { environment } from '../../../../environments/environment';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl) => {
  const form = control as FormGroup;
  const password = form.get('password')?.value;
  const confirm = form.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AddCatalogDialog],
  templateUrl: './user-create.html',
})
export class UserCreate implements OnInit {
  private readonly authSvc    = inject(AuthService);
  private readonly rhSvc      = inject(RhService);
  private readonly router     = inject(Router);
  private readonly fb         = inject(FormBuilder);
  readonly catalogSvc         = inject(CatalogService);
  readonly settingsSvc        = inject(SettingsService);
  private readonly http       = inject(HttpClient);

  readonly saving    = this.rhSvc.saving;
  readonly error     = this.rhSvc.error;
  readonly turnos    = TURNOS;
  readonly roles     = ROLES_DISPONIBLES;
  readonly rolLabels = ROL_LABELS;

  readonly isAdmin = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly visibleRoles = computed(() =>
    this.isAdmin() ? [...this.roles] : ['EJECUTADOR']
  );
  readonly currentStoreName = computed(() => {
    const user = this.authSvc.currentUser();
    if (!user?.storeId) return 'Sucursal no disponible';
    const fromCatalog = this.settingsSvc.stores().find(s => s.id === user.storeId)?.nombre;
    return fromCatalog ?? user.storeName ?? user.storeId;
  });

  readonly showPassword        = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly puestoDialogOpen    = signal(false);
  readonly nextFolio           = signal<string>('Selecciona un puesto...');

  readonly form = this.fb.group({
    nombre:          ['', [Validators.required, Validators.minLength(2)]],
    puesto:          ['', Validators.required],
    storeId:         [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    turno:           ['MATUTINO', Validators.required],
    email:           ['', Validators.email],
    fechaNacimiento: [''],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    roles:           [['EJECUTADOR'], Validators.required],
  }, { validators: passwordMatchValidator });

  // GERENTE no puede cambiar storeId ni asignar roles libremente
  get storeIdDisabled(): boolean {
    return !this.authSvc.hasRole('ADMIN');
  }

  ngOnInit(): void {
    this.catalogSvc.loadPuestos();
    if (this.isAdmin()) {
      this.settingsSvc.loadAll();
    }
    // Actualizar preview del ID Usuario cuando cambia rol O puesto
    const refreshFolio = () => {
      const roles: string[] = this.form.get('roles')?.value ?? [];
      const puesto: string  = this.form.get('puesto')?.value ?? '';
      const rol = roles[0] ?? '';
      if (!rol && !puesto) {
        this.nextFolio.set('Selecciona rol y puesto...');
        return;
      }
      const params = new URLSearchParams();
      if (rol)    params.set('rol', rol);
      if (puesto) params.set('puesto', puesto);
      this.http.get<{ numeroUsuario: string }>(
        `${environment.apiUrl}/users/next-folio?${params.toString()}`
      ).subscribe({ next: r => this.nextFolio.set(r.numeroUsuario), error: () => {} });
    };

    this.form.get('roles')?.valueChanges.subscribe(() => refreshFolio());
    this.form.get('puesto')?.valueChanges.subscribe(() => refreshFolio());
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  isRolSelected(rol: string): boolean {
    const roles = this.form.get('roles')?.value as string[] ?? [];
    return roles.includes(rol);
  }

  toggleRol(rol: string): void {
    if (!this.isAdmin()) return;
    this.form.get('roles')?.setValue([rol]);
  }

  onPuestoAdded(entry: CatalogEntry): void {
    this.puestoDialogOpen.set(false);
    this.catalogSvc.loadPuestos();
    this.form.get('puesto')?.setValue(entry.value);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const req: CreateUserRequest = {
      nombre:          v.nombre!,
      puesto:          v.puesto!,
      storeId:         v.storeId!,
      turno:           v.turno!,
      password:        v.password!,
      roles:           this.isAdmin() ? ((v.roles as string[]) ?? ['EJECUTADOR']) : ['EJECUTADOR'],
      // numeroUsuario omitido — el backend lo auto-genera con la secuencia
      ...(v.email           ? { email:           v.email }           : {}),
      ...(v.fechaNacimiento ? { fechaNacimiento: v.fechaNacimiento } : {}),
    };

    try {
      await this.rhSvc.createUser(req);
      this.router.navigate(['/banco-info/usuarios']);
    } catch {
      // error ya seteado en rhSvc._error
    }
  }
}
