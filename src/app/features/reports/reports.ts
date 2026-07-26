import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth/services/auth.service';
import { SettingsService } from '../settings/services/settings.service';
import { ReportService } from './services/report.service';
import { DailyReportResponse, UserResponsibilityEntry } from '../kpi/kpi.models';
import { LeaderboardEntry } from '../gamification/gamification.models';
import {
  EmployeesReportResponse,
  ManagersReportResponse,
  ReportPeriod,
  ReportType,
} from './reports.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly reportSvc  = inject(ReportService);
  private readonly settingsSvc = inject(SettingsService);

  reportType   = signal<ReportType>('daily');
  period       = signal<ReportPeriod>('weekly');
  storeId      = signal('');
  selectedDate = signal('');

  reportData      = signal<DailyReportResponse | null>(null);
  managersReport  = signal<ManagersReportResponse | null>(null);
  employeesReport = signal<EmployeesReportResponse | null>(null);

  loading     = signal(false);
  downloading = signal(false);
  error       = signal<string | null>(null);

  readonly isAdmin = () => this.auth.currentUser()?.roles?.includes('ADMIN') ?? false;

  /** Sucursales para el selector; sólo el ADMIN puede cambiar de sucursal. */
  readonly stores = this.settingsSvc.stores;

  /** El ranking gerencial es de toda la cadena: no lleva filtro de sucursal. */
  readonly needsStore  = computed(() => this.reportType() !== 'managers');
  /** Sólo el cierre diario se acota a un día; los rankings usan ventana móvil. */
  readonly needsDate   = computed(() => this.reportType() === 'daily');
  readonly needsPeriod = computed(() => this.reportType() !== 'daily');

  readonly pageSubtitle = computed(() => {
    switch (this.reportType()) {
      case 'managers':  return 'Ranking de gerentes de toda la cadena, ordenado por IGEO de equipo.';
      case 'employees': return 'Ranking de colaboradores de una sucursal, ordenado por IGEO.';
      default:          return 'Genera y descarga reportes PDF y Excel por sucursal y fecha.';
    }
  });

  /** Hay algo cargado para el tipo activo. Gobierna el estado vacío. */
  readonly hasData = computed(() => {
    switch (this.reportType()) {
      case 'managers':  return this.managersReport()  !== null;
      case 'employees': return this.employeesReport() !== null;
      default:          return this.reportData()      !== null;
    }
  });

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.selectedDate.set(today);

    const user = this.auth.currentUser();
    if (user?.storeId) this.storeId.set(user.storeId);

    // El ADMIN no tiene sucursal asignada: necesita elegirla de la lista.
    if (this.isAdmin()) this.settingsSvc.loadAll();
  }

  selectType(type: ReportType): void {
    if (this.reportType() === type) return;
    this.reportType.set(type);
    this.error.set(null);
  }

  selectPeriod(p: ReportPeriod): void {
    if (this.period() === p) return;
    this.period.set(p);
    // Recargar sólo si ya había un resultado visible: cambiar de período con la
    // pantalla vacía no debería disparar una petición que el usuario no pidió.
    if (this.hasData()) this.loadPreview();
  }

  loadPreview(): void {
    if (!this.validate()) return;

    this.loading.set(true);
    this.error.set(null);

    switch (this.reportType()) {
      case 'managers':
        this.managersReport.set(null);
        this.reportSvc.getManagersReport(this.period()).subscribe({
          next:  data => { this.managersReport.set(data); this.loading.set(false); },
          error: err  => this.fail(err),
        });
        break;

      case 'employees':
        this.employeesReport.set(null);
        this.reportSvc.getEmployeesReport(this.storeId(), this.period()).subscribe({
          next:  data => { this.employeesReport.set(data); this.loading.set(false); },
          error: err  => this.fail(err),
        });
        break;

      default:
        this.reportData.set(null);
        this.reportSvc.getReportData(this.storeId(), this.selectedDate()).subscribe({
          next:  data => { this.reportData.set(data); this.loading.set(false); },
          error: err  => this.fail(err),
        });
    }
  }

  downloadPdf(): void {
    if (!this.validate()) return;

    this.downloading.set(true);
    this.error.set(null);

    switch (this.reportType()) {
      case 'managers':
        this.reportSvc.downloadManagersPdf(this.period()).subscribe({
          next:  blob => this.saveAs(blob, `ranking-gerencial-${this.period()}.pdf`),
          error: err  => this.failDownload(err),
        });
        break;

      case 'employees':
        this.reportSvc.downloadEmployeesPdf(this.storeId(), this.period()).subscribe({
          next:  blob => this.saveAs(blob, `ranking-colaboradores-${this.period()}.pdf`),
          error: err  => this.failDownload(err),
        });
        break;

      default:
        this.reportSvc.downloadPdf(this.storeId(), this.selectedDate()).subscribe({
          next:  blob => this.saveAs(blob, `cierre-${this.selectedDate()}.pdf`),
          error: err  => this.failDownload(err),
        });
    }
  }

  downloadExcel(): void {
    if (!this.validate()) return;
    this.downloading.set(true);
    this.error.set(null);
    this.reportSvc.downloadExcel(this.storeId(), this.selectedDate()).subscribe({
      next:  blob => this.saveAs(blob, `cierre-${this.selectedDate()}.xlsx`),
      error: err  => this.failDownload(err),
    });
  }

  // ── Formatters ─────────────────────────────────────────────────────────

  fmtKpi(val: number): string {
    return val < 0 ? 'S/D' : val.toFixed(2);
  }

  fmtPct(val: number): string {
    return val < 0 ? 'S/D' : `${val.toFixed(1)}%`;
  }

  /** `teamAvgIgeo` llega en -1 cuando ningún miembro del equipo tiene datos. */
  fmtTeamIgeo(entry: LeaderboardEntry): string {
    if (entry.teamAvgIgeo === undefined || entry.teamAvgIgeo === null) return 'S/D';
    return this.fmtKpi(entry.teamAvgIgeo);
  }

  periodLabel(period: string): string {
    return period === 'monthly' ? 'últimos 30 días' : 'últimos 7 días';
  }

  trackByRank(_: number, u: UserResponsibilityEntry): number {
    return u.rank;
  }

  trackByUserId(_: number, e: LeaderboardEntry): string {
    return e.userId;
  }

  // ── Internos ───────────────────────────────────────────────────────────

  private validate(): boolean {
    if (this.needsStore() && !this.storeId()) {
      this.error.set('Selecciona una sucursal.');
      return false;
    }
    if (this.needsDate() && !this.selectedDate()) {
      this.error.set('Selecciona una fecha.');
      return false;
    }
    return true;
  }

  private saveAs(blob: Blob, filename: string): void {
    this.reportSvc.triggerDownload(blob, filename);
    this.downloading.set(false);
  }

  private fail(err: unknown): void {
    this.error.set(this.extractMessage(err));
    this.loading.set(false);
  }

  private failDownload(err: unknown): void {
    this.error.set(this.extractMessage(err));
    this.downloading.set(false);
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al cargar el reporte.';
  }
}
