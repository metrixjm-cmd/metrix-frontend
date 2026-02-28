import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { IncidentService } from '../services/incident.service';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from '../incident.models';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './incident-detail.html',
})
export class IncidentDetail implements OnInit {
  private readonly auth       = inject(AuthService);
  readonly incidentSvc        = inject(IncidentService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly fb         = inject(FormBuilder);

  readonly isManagerView = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly incident      = this.incidentSvc.selectedIncident;

  readonly statusLabels   = INCIDENT_STATUS_LABELS;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  // ── Estado del modal de cierre ────────────────────────────────────────────
  readonly showCloseModal = signal(false);
  readonly closeForm = this.fb.group({
    resolutionNotes: ['', [Validators.required, Validators.minLength(10)]],
    notes:           [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/incidents']); return; }
    this.incidentSvc.loadById(id);
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async takeResolution(): Promise<void> {
    const incident = this.incident();
    if (!incident || this.incidentSvc.saving()) return;
    try {
      await this.incidentSvc.updateStatus(incident.id, { newStatus: 'EN_RESOLUCION' });
    } catch { /* error en servicio */ }
  }

  async closeIncident(): Promise<void> {
    if (this.closeForm.invalid || this.incidentSvc.saving()) return;
    const incident = this.incident();
    if (!incident) return;
    const v = this.closeForm.getRawValue();
    try {
      await this.incidentSvc.updateStatus(incident.id, {
        newStatus:        'CERRADA',
        resolutionNotes:  v.resolutionNotes!,
        notes:            v.notes ?? undefined,
      });
      this.showCloseModal.set(false);
    } catch { /* error en servicio */ }
  }

  async reopenIncident(): Promise<void> {
    const incident = this.incident();
    if (!incident || this.incidentSvc.saving()) return;
    try {
      await this.incidentSvc.updateStatus(incident.id, { newStatus: 'ABIERTA' });
    } catch { /* error en servicio */ }
  }

  // ── Helpers de estilo ─────────────────────────────────────────────────────

  severityBadgeClass(severity: IncidentSeverity): string {
    return ({
      BAJA:    'bg-stone-100 text-stone-600',
      MEDIA:   'bg-amber-100 text-amber-700',
      ALTA:    'bg-orange-100 text-orange-700',
      CRITICA: 'bg-red-100 text-red-700 font-bold',
    })[severity];
  }

  statusBadgeClass(status: IncidentStatus): string {
    return ({
      ABIERTA:       'bg-red-100 text-red-700',
      EN_RESOLUCION: 'bg-blue-100 text-blue-700',
      CERRADA:       'bg-emerald-100 text-emerald-700',
    })[status];
  }

  categoryBadgeClass(category: IncidentCategory): string {
    return ({
      EQUIPO:    'bg-indigo-100 text-indigo-700',
      INSUMOS:   'bg-teal-100 text-teal-700',
      PERSONAL:  'bg-purple-100 text-purple-700',
      SEGURIDAD: 'bg-red-100 text-red-700',
      OPERACION: 'bg-orange-100 text-orange-700',
      OTRO:      'bg-stone-100 text-stone-600',
    })[category];
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
