import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { IncidentService } from '../services/incident.service';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  IncidentCategory,
  IncidentSeverity,
} from '../incident.models';

@Component({
  selector: 'app-incident-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './incident-create.html',
})
export class IncidentCreate {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly categories     = INCIDENT_CATEGORIES;
  readonly severities     = INCIDENT_SEVERITIES;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  readonly currentUser = this.auth.currentUser;

  readonly form = this.fb.group({
    title:        ['', [Validators.required, Validators.minLength(4), Validators.maxLength(200)]],
    description:  ['', [Validators.required, Validators.minLength(10)]],
    category:     ['' as IncidentCategory | '', Validators.required],
    severity:     ['' as IncidentSeverity | '', Validators.required],
    taskId:       [''],
    storeId:      [{ value: this.auth.currentUser()?.storeId ?? '', disabled: true }, Validators.required],
    shift:        [this.auth.currentUser()?.turno ?? '', Validators.required],
    evidenceUrls: [''],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.incidentSvc.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const urlsRaw = (v.evidenceUrls ?? '').trim();
    const evidenceUrls = urlsRaw
      ? urlsRaw.split('\n').map(u => u.trim()).filter(u => u.length > 0)
      : undefined;

    try {
      await this.incidentSvc.create({
        title:        v.title!,
        description:  v.description!,
        category:     v.category as IncidentCategory,
        severity:     v.severity as IncidentSeverity,
        taskId:       v.taskId?.trim() || undefined,
        storeId:      v.storeId!,
        shift:        v.shift!,
        evidenceUrls,
      });
      this.router.navigate(['/incidents']);
    } catch {
      // error ya seteado en incidentSvc._error
    }
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }
}
