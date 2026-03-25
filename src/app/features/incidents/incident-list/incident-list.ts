import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { IncidentService } from '../services/incident.service';
import { SettingsService } from '../../settings/services/settings.service';
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
  imports: [RouterLink, AppDatePipe],
  templateUrl: './incident-list.html',
})
export class IncidentList implements OnInit {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);

  readonly isManagerView = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  // ── Helpers de labels ────────────────────────────────────────────────────
  readonly statusLabels   = INCIDENT_STATUS_LABELS;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  // ── Filtros locales ───────────────────────────────────────────────────────
  readonly selectedSeverity = signal<IncidentSeverity | ''>('');

  // ── Acordeón ─────────────────────────────────────────────────────────────
  readonly showActive = signal(true);
  readonly showClosed = signal(false);

  // ── Secciones computadas ─────────────────────────────────────────────────
  private static readonly SEVERITY_ORDER: Record<string, number> = {
    CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3,
  };

  readonly activeIncidents = computed(() => {
    const sv = this.selectedSeverity();
    let list = this.incidentSvc.incidents().filter(i => i.status !== 'CERRADA');
    if (sv) list = list.filter(i => i.severity === sv);
    return [...list].sort((a, b) => {
      const sev = (IncidentList.SEVERITY_ORDER[a.severity] ?? 9) - (IncidentList.SEVERITY_ORDER[b.severity] ?? 9);
      if (sev !== 0) return sev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  readonly closedIncidents = computed(() => {
    const sv = this.selectedSeverity();
    let list = this.incidentSvc.incidents().filter(i => i.status === 'CERRADA');
    if (sv) list = list.filter(i => i.severity === sv);
    return [...list].sort((a, b) =>
      new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime()
    );
  });

  ngOnInit(): void {
    this.settingsSvc.loadAll();
    this.incidentSvc.loadVisible();
  }

  getStoreName(storeId: string): string {
    const store = this.settingsSvc.stores().find(s => s.id === storeId);
    return store?.nombre ?? store?.codigo ?? storeId;
  }

  goToDetail(incident: IncidentResponse): void {
    this.router.navigate(['/incidents', incident.id]);
  }

  // ── Clases de severidad ───────────────────────────────────────────────────

  severityBadgeClass(severity: IncidentSeverity): string {
    return ({
      BAJA:    'bg-stone-100 text-stone-600',
      MEDIA:   'bg-yellow-100 text-yellow-700',
      ALTA:    'bg-brand-100 text-brand-700',
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
      OPERACION: 'bg-brand-50 text-brand-700',
      OTRO:      'bg-stone-100 text-stone-600',
    })[category];
  }

}
