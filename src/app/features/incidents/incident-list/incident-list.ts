import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { IncidentService } from '../services/incident.service';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  IncidentCategory,
  IncidentResponse,
  IncidentSeverity,
  IncidentStatus,
} from '../incident.models';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './incident-list.html',
})
export class IncidentList implements OnInit {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly router      = inject(Router);

  readonly isManagerView = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  // ── Helpers de labels ────────────────────────────────────────────────────
  readonly statusLabels   = INCIDENT_STATUS_LABELS;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  // ── Filtros locales ───────────────────────────────────────────────────────
  readonly selectedStatus   = signal<IncidentStatus | ''>('');
  readonly selectedSeverity = signal<IncidentSeverity | ''>('');

  readonly filteredIncidents = computed(() => {
    let list = this.incidentSvc.incidents();
    const st = this.selectedStatus();
    const sv = this.selectedSeverity();
    if (st) list = list.filter(i => i.status === st);
    if (sv) list = list.filter(i => i.severity === sv);
    return list;
  });

  ngOnInit(): void {
    const storeId = this.auth.currentUser()?.storeId ?? '';
    if (this.isManagerView()) {
      this.incidentSvc.loadByStore(storeId);
    } else {
      this.incidentSvc.loadMyIncidents();
    }
  }

  goToDetail(incident: IncidentResponse): void {
    this.router.navigate(['/incidents', incident.id]);
  }

  // ── Clases de severidad ───────────────────────────────────────────────────

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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
