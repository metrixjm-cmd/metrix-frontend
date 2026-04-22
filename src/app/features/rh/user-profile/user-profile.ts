import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { KpiService } from '../../kpi/services/kpi.service';
import { ReportService } from '../../reports/services/report.service';
import { SettingsService } from '../../settings/services/settings.service';
import { ROL_LABELS, ROLES_DISPONIBLES, TURNOS, UpdateUserRequest } from '../rh.models';
import { getLatestBirthDateBeforeYears, olderThanYearsValidator, realBirthDateValidator } from '../../../shared/validators/birth-date.validators';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-profile.html',
})
export class UserProfile implements OnInit {
  private readonly authSvc    = inject(AuthService);
  private readonly rhSvc      = inject(RhService);
  private readonly kpiSvc     = inject(KpiService);
  private readonly reportSvc  = inject(ReportService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly fb         = inject(FormBuilder);
  readonly settingsSvc  = inject(SettingsService);

  readonly user        = this.rhSvc.selectedUser;
  readonly loading     = this.rhSvc.loading;
  readonly saving      = this.rhSvc.saving;
  readonly error       = this.rhSvc.error;
  readonly kpiLoading  = this.kpiSvc.loading;

  readonly rolLabels: Record<string, string | undefined> = ROL_LABELS;
  readonly turnos    = TURNOS;
  readonly roles     = ROLES_DISPONIBLES;

  readonly isAdmin   = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));
  readonly canDeleteUser = computed(() => {
    const u = this.user();
    if (!u) return false;
    if (this.isAdmin()) return true;
    return this.authSvc.hasRole('GERENTE')
      && !this.authSvc.hasRole('ADMIN')
      && u.roles.includes('EJECUTADOR');
  });

  // ── Estado de UI ───────────────────────────────────────────────────────────
  readonly editMode        = signal(false);
  readonly confirmDelete   = signal(false);
  readonly downloadingCard = signal(false);
  readonly resetPasswordModal = signal(false);
  readonly showAdminPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly resetPasswordError = signal<string | null>(null);
  readonly resetPasswordSuccess = signal(false);
  readonly resetPasswordStep = signal<'verify' | 'reset'>('verify');
  readonly maxBirthDate = getLatestBirthDateBeforeYears(17);

  // ── KPI #7: datos de este colaborador ────────────────────────────────────
  readonly userKpi = computed(() => {
    const u = this.user();
    if (!u) return null;
    return this.kpiSvc.usersResponsibility().find(k => k.userId === u.id) ?? null;
  });

  // ── Formulario de edición ─────────────────────────────────────────────────
  readonly editForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    puesto: ['', Validators.required],
    storeId: ['', Validators.required],
    turno:  ['', Validators.required],
    roles:  [[] as string[]],
    email: [''],
    fechaNacimiento: ['', [realBirthDateValidator, olderThanYearsValidator(17)]],
  });

  readonly resetPasswordForm = this.fb.group({
    adminPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/banco-info/usuarios']); return; }

    this.rhSvc.loadUserById(id);
    this.settingsSvc.loadAll();

    // Cargar KPI #7 de la sucursal del usuario en sesión
    const storeId = this.authSvc.currentUser()?.storeId;
    if (storeId) {
      this.kpiSvc.loadUsersResponsibility(storeId);
    }
  }

  enterEditMode(): void {
    const u = this.user();
    if (!u) return;
    this.editForm.patchValue({
      nombre: u.nombre,
      puesto: u.puesto,
      storeId: u.storeId,
      turno:  u.turno,
      roles:  [...u.roles],
      email: u.email || '',
      fechaNacimiento: u.fechaNacimiento || '',
    });
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
    this.editForm.reset();
  }

  openResetPasswordModal(): void {
    if (!this.isGerente()) return;
    this.resetPasswordForm.reset();
    this.resetPasswordError.set(null);
    this.resetPasswordSuccess.set(false);
    this.resetPasswordStep.set('verify');
    this.showAdminPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
    this.resetPasswordModal.set(true);
  }

  closeResetPasswordModal(): void {
    if (this.saving()) return;
    this.resetPasswordModal.set(false);
    this.resetPasswordForm.reset();
    this.resetPasswordError.set(null);
    this.resetPasswordStep.set('verify');
  }

  togglePasswordVisibility(field: 'admin' | 'new' | 'confirm'): void {
    if (field === 'admin') this.showAdminPassword.update(v => !v);
    if (field === 'new') this.showNewPassword.update(v => !v);
    if (field === 'confirm') this.showConfirmPassword.update(v => !v);
  }

  passwordsMismatch(): boolean {
    const v = this.resetPasswordForm.getRawValue();
    return Boolean(v.newPassword && v.confirmPassword && v.newPassword !== v.confirmPassword);
  }

  async onVerifyAdminPassword(): Promise<void> {
    if (!this.isGerente() || this.saving()) return;
    const adminPassword = this.resetPasswordForm.get('adminPassword')?.value;
    if (!adminPassword) {
      this.resetPasswordError.set('Ingresa tu contraseña de administrador.');
      return;
    }

    this.resetPasswordError.set(null);
    this.resetPasswordSuccess.set(false);

    try {
      await this.rhSvc.verifyAdminPassword({ adminPassword });
      this.resetPasswordStep.set('reset');
      this.showAdminPassword.set(false);
    } catch {
      this.resetPasswordError.set(this.error() ?? 'La contraseña del administrador no es correcta.');
    }
  }

  async onResetPassword(): Promise<void> {
    if (!this.isGerente() || this.resetPasswordStep() !== 'reset' || this.resetPasswordForm.invalid || this.passwordsMismatch() || this.saving()) return;
    const id = this.user()?.id;
    if (!id) return;

    const v = this.resetPasswordForm.getRawValue();
    this.resetPasswordError.set(null);
    this.resetPasswordSuccess.set(false);

    try {
      await this.rhSvc.resetUserPassword(id, {
        adminPassword: v.adminPassword ?? '',
        newPassword: v.newPassword ?? '',
        confirmPassword: v.confirmPassword ?? '',
      });
      this.resetPasswordSuccess.set(true);
      window.setTimeout(() => {
        this.resetPasswordModal.set(false);
        this.resetPasswordForm.reset();
        this.resetPasswordStep.set('verify');
        this.resetPasswordSuccess.set(false);
        this.resetPasswordError.set(null);
      }, 2200);
    } catch {
      this.resetPasswordError.set(this.error() ?? 'No se pudo regenerar la contraseña.');
    }
  }

  isRolSelected(rol: string): boolean {
    const roles = this.editForm.get('roles')?.value as string[] ?? [];
    return roles.includes(rol);
  }

  toggleRol(rol: string): void {
    if (!this.isAdmin()) return;
    this.editForm.get('roles')?.setValue([rol]);
  }

  async onSave(): Promise<void> {
    if (this.editForm.invalid || this.saving()) return;
    const id = this.user()?.id;
    if (!id) return;

    const v = this.editForm.getRawValue();
    const req: UpdateUserRequest = {
      nombre: v.nombre ?? undefined,
      puesto: v.puesto ?? undefined,
      storeId: v.storeId ?? undefined,
      turno:  v.turno  ?? undefined,
      email: v.email ?? undefined,
      fechaNacimiento: v.fechaNacimiento ?? undefined,
    };
    if (this.isAdmin() && v.roles?.length) {
      req.roles = v.roles as string[];
    }

    try {
      await this.rhSvc.updateUser(id, req);
      this.editMode.set(false);
    } catch {
      // error seteado en rhSvc._error
    }
  }

  async onDelete(): Promise<void> {
    const id = this.user()?.id;
    if (!id || this.saving()) return;

    try {
      await this.rhSvc.deleteUser(id);
      const ok = await this.router.navigateByUrl('/banco-info/usuarios');
      if (!ok) window.location.href = '/banco-info/usuarios';
    } catch {
      this.confirmDelete.set(false);
    }
  }

  downloadCard(userId: string): void {
    if (this.downloadingCard()) return;
    this.downloadingCard.set(true);
    this.reportSvc.downloadPerformanceCard(userId).subscribe({
      next: blob => {
        this.reportSvc.triggerDownload(blob, `ficha-${userId}.pdf`);
        this.downloadingCard.set(false);
      },
      error: () => this.downloadingCard.set(false),
    });
  }

  getStoreName(storeId: string): string {
    return this.settingsSvc.stores().find(s => s.id === storeId)?.nombre ?? storeId;
  }

  igeoClass(igeo: number): string {
    if (igeo >= 80) return 'text-emerald-600';
    if (igeo >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  igeoBg(igeo: number): string {
    if (igeo >= 80) return 'bg-emerald-50 border-emerald-200';
    if (igeo >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  }
}
