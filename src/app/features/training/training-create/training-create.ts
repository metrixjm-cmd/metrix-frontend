import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingService } from '../services/training.service';
import { RhService } from '../../rh/services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import {
  CreateFromTemplateRequest,
  CreateTrainingRequest,
  TRAINING_LEVELS,
  TRAINING_LEVEL_LABELS,
  TrainingTemplateSummary,
  MATERIAL_TYPE_ICONS,
} from '../training.models';

type CreateMode = 'scratch' | 'template';

@Component({
  selector: 'app-training-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './training-create.html',
})
export class TrainingCreate implements OnInit {
  private readonly authSvc     = inject(AuthService);
  readonly trainingSvc         = inject(TrainingService);
  private readonly rhSvc       = inject(RhService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly saving      = this.trainingSvc.saving;
  readonly error       = this.trainingSvc.error;
  readonly levels      = TRAINING_LEVELS;
  readonly levelLabels = TRAINING_LEVEL_LABELS;
  readonly materialIcons = MATERIAL_TYPE_ICONS;
  readonly users       = this.rhSvc.users;
  readonly stores      = this.settingsSvc.stores;
  readonly templates   = this.trainingSvc.templates;
  readonly turnos      = ['MATUTINO', 'VESPERTINO', 'NOCTURNO'];

  readonly isAdmin  = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly todayMin = new Date().toISOString().slice(0, 16);

  // ── Modo de creación ──────────────────────────────────────────────────────
  readonly mode             = signal<CreateMode>('scratch');
  readonly selectedTemplate = signal<TrainingTemplateSummary | null>(null);

  // ── Formulario (desde cero) ───────────────────────────────────────────────
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

  // ── Formulario mínimo (desde plantilla) ───────────────────────────────────
  readonly templateForm = this.fb.group({
    assignedUserId: ['', Validators.required],
    storeId:        [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:          ['MATUTINO', Validators.required],
    dueAt:          ['', Validators.required],
  });

  ngOnInit(): void {
    this.trainingSvc.loadTemplateSummaries();
    const user = this.authSvc.currentUser();
    if (this.isAdmin()) {
      this.settingsSvc.loadAll();
      this.form.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.form.get('assignedUserId')!.reset(''); this.rhSvc.loadUsersByStore(storeId); }
      });
      this.templateForm.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.templateForm.get('assignedUserId')!.reset(''); this.rhSvc.loadUsersByStore(storeId); }
      });
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    } else {
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    }
  }

  // ── Modo ──────────────────────────────────────────────────────────────────

  setMode(m: CreateMode): void {
    this.mode.set(m);
    this.selectedTemplate.set(null);
    this.trainingSvc.clearError();
  }

  selectTemplate(t: TrainingTemplateSummary): void {
    this.selectedTemplate.set(t);
  }

  // ── Submit desde cero ─────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const req: CreateTrainingRequest = {
      title:          v.title!,
      description:    v.description!,
      level:          v.level as CreateTrainingRequest['level'],
      durationHours:  Number(v.durationHours),
      minPassGrade:   Number(v.minPassGrade),
      assignedUserId: v.assignedUserId!,
      storeId:        v.storeId!,
      shift:          v.shift!,
      dueAt:          new Date(v.dueAt! + ':00').toISOString(),
    };
    try {
      await this.trainingSvc.create(req);
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }

  // ── Submit desde plantilla ────────────────────────────────────────────────

  async onSubmitFromTemplate(): Promise<void> {
    const tmpl = this.selectedTemplate();
    if (!tmpl || this.templateForm.invalid || this.saving()) return;
    const v = this.templateForm.getRawValue();
    const req: CreateFromTemplateRequest = {
      assignedUserId: v.assignedUserId!,
      storeId:        v.storeId!,
      shift:          v.shift!,
      dueAt:          new Date(v.dueAt! + ':00').toISOString(),
    };
    try {
      await this.trainingSvc.createFromTemplate(tmpl.id, req);
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }
}
