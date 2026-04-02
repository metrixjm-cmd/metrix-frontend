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

  // ── Estado de UI ───────────────────────────────────────────────────────────
  readonly editMode        = signal(false);
  readonly confirmDelete   = signal(false);
  readonly downloadingCard = signal(false);
  readonly showCurrentPassword = signal(false);

  toggleCurrentPassword(): void {
    this.showCurrentPassword.update(s => !s);
  }

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
    password: [''], // Para que admin cambie la contraseña opcionalmente
    email: [''],
    fechaNacimiento: [''],
  });

  readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(s => !s);
  }

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
      password: '', // reiniciar si edita de nuevo
    });
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
    this.editForm.reset();
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
    if (this.isAdmin() && v.password) {
      req.password = v.password;
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
