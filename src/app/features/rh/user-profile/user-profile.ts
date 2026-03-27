import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { KpiService } from '../../kpi/services/kpi.service';
import { ReportService } from '../../reports/services/report.service';
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
    turno:  ['', Validators.required],
    roles:  [[] as string[]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/banco-info/usuarios']); return; }

    this.rhSvc.loadUserById(id);

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
      turno:  u.turno,
      roles:  [...u.roles],
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
      turno:  v.turno  ?? undefined,
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
