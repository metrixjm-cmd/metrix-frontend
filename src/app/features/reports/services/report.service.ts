import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { DailyReportResponse } from '../../kpi/kpi.models';
import { EmployeesReportResponse, ManagersReportResponse, ReportPeriod } from '../reports.models';

/**
 * Servicio HTTP para reportes de cierre diario — Sprint 8.
 *
 * - `getReportData()`: preview JSON del reporte.
 * - `downloadPdf()`: descarga binaria via responseType 'blob'.
 * - `triggerDownload()`: crea un <a> temporal para disparar la descarga del blob.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  getReportData(storeId: string, date: string): Observable<DailyReportResponse> {
    return this.http.get<DailyReportResponse>(
      `${this.base}/daily`,
      { params: { storeId, date } }
    );
  }

  downloadPdf(storeId: string, date: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/daily/pdf`,
      { params: { storeId, date }, responseType: 'blob' }
    );
  }

  /** Sprint 12: descarga la Ficha de Desempeño Individual en PDF para un colaborador. */
  downloadPerformanceCard(userId: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/user/${userId}/performance-card`,
      { responseType: 'blob' }
    );
  }

  // ── Sprint 18: reportes de ranking ──────────────────────────────────────
  // Van por `period` y no por fecha: el backend los calcula sobre una ventana
  // móvil desde hoy, así que un día calendario no describiría los datos.

  getManagersReport(period: ReportPeriod): Observable<ManagersReportResponse> {
    return this.http.get<ManagersReportResponse>(
      `${this.base}/managers`,
      { params: { period } }
    );
  }

  downloadManagersPdf(period: ReportPeriod): Observable<Blob> {
    return this.http.get(
      `${this.base}/managers/pdf`,
      { params: { period }, responseType: 'blob' }
    );
  }

  getEmployeesReport(storeId: string, period: ReportPeriod): Observable<EmployeesReportResponse> {
    return this.http.get<EmployeesReportResponse>(
      `${this.base}/employees`,
      { params: { storeId, period } }
    );
  }

  downloadEmployeesPdf(storeId: string, period: ReportPeriod): Observable<Blob> {
    return this.http.get(
      `${this.base}/employees/pdf`,
      { params: { storeId, period }, responseType: 'blob' }
    );
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
