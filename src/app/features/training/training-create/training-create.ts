import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingService } from '../services/training.service';
import { RhService } from '../../rh/services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CreateTrainingRequest, TRAINING_LEVELS, TRAINING_LEVEL_LABELS } from '../training.models';

@Component({
  selector: 'app-training-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './training-create.html',
})
export class TrainingCreate implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly trainingSvc = inject(TrainingService);
  private readonly rhSvc       = inject(RhService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly saving      = this.trainingSvc.saving;
  readonly error       = this.trainingSvc.error;
  readonly levels      = TRAINING_LEVELS;
  readonly levelLabels = TRAINING_LEVEL_LABELS;
  readonly users       = this.rhSvc.users;
  readonly stores      = this.settingsSvc.stores;

  readonly turnos = ['MATUTINO', 'VESPERTINO', 'NOCTURNO'];

  readonly isAdmin   = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly todayMin  = new Date().toISOString().slice(0, 16);

  readonly form = this.fb.group({
    title:          ['', [Validators.required, Validators.minLength(3)]],
    description:    ['', Validators.required],
    level:          ['BASICO', Validators.required],
    durationHours:  [1, [Validators.required, Validators.min(1), Validators.max(40)]],
    minPassGrade:   [7, [Validators.required, Validators.min(0), Validators.max(10)]],
    assignedUserId: ['', Validators.required],
    storeId:        [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:          ['MATUTINO', Validators.required],
    dueAt:          ['', Validators.required],
  });

  ngOnInit(): void {
    const user = this.authSvc.currentUser();
    if (this.isAdmin()) {
      // ADMIN: cargar todas las sucursales para el selector
      this.settingsSvc.loadAll();
      // Escuchar cambios en storeId para recargar colaboradores
      this.form.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) {
          this.form.get('assignedUserId')!.reset('');
          this.rhSvc.loadUsersByStore(storeId);
        }
      });
      // Si ya hay storeId inicial, cargar usuarios
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    } else {
      // GERENTE: bloqueado a su sucursal
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const dueAtInstant = v.dueAt ? new Date(v.dueAt + ':00').toISOString() : '';
    const req: CreateTrainingRequest = {
      title:          v.title!,
      description:    v.description!,
      level:          v.level as CreateTrainingRequest['level'],
      durationHours:  Number(v.durationHours),
      minPassGrade:   Number(v.minPassGrade),
      assignedUserId: v.assignedUserId!,
      storeId:        v.storeId!,
      shift:          v.shift!,
      dueAt:          dueAtInstant,
    };
    try {
      await this.trainingSvc.create(req);
      this.router.navigate(['/training']);
    } catch { /* error seteado en service */ }
  }
}
