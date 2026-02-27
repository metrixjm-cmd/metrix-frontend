import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { DailyReportResponse } from '../../kpi/kpi.models';

/**
 * Servicio HTTP para reportes de cierre diario — Sprint 8.
 *
 * - `getReportData()`: preview JSON del reporte.
 * - `downloadPdf()` / `downloadExcel()`: descarga binaria via responseType 'blob'.
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

  downloadExcel(storeId: string, date: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/daily/excel`,
      { params: { storeId, date }, responseType: 'blob' }
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
