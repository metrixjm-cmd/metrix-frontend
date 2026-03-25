import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth/services/auth.service';
import { ReportService } from './services/report.service';
import { DailyReportResponse, UserResponsibilityEntry } from '../kpi/kpi.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly reportSvc  = inject(ReportService);

  storeId      = signal('');
  selectedDate = signal('');
  reportData   = signal<DailyReportResponse | null>(null);
  loading      = signal(false);
  downloading  = signal(false);
  error        = signal<string | null>(null);

  readonly isAdmin = () => this.auth.currentUser()?.roles?.includes('ADMIN') ?? false;

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.selectedDate.set(today);

    const user = this.auth.currentUser();
    if (user?.storeId) this.storeId.set(user.storeId);
  }

  loadPreview(): void {
    const sid  = this.storeId();
    const date = this.selectedDate();
    if (!sid || !date) {
      this.error.set('Selecciona sucursal y fecha.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.reportData.set(null);

    this.reportSvc.getReportData(sid, date).subscribe({
      next:  data => { this.reportData.set(data); this.loading.set(false); },
      error: err  => {
        this.error.set(this.extractMessage(err));
        this.loading.set(false);
      },
    });
  }

  downloadPdf(): void {
    const sid  = this.storeId();
    const date = this.selectedDate();
    if (!sid || !date) return;
    this.downloading.set(true);
    this.reportSvc.downloadPdf(sid, date).subscribe({
      next: blob => {
        this.reportSvc.triggerDownload(blob, `cierre-${date}.pdf`);
        this.downloading.set(false);
      },
      error: err => {
        this.error.set(this.extractMessage(err));
        this.downloading.set(false);
      },
    });
  }

  downloadExcel(): void {
    const sid  = this.storeId();
    const date = this.selectedDate();
    if (!sid || !date) return;
    this.downloading.set(true);
    this.reportSvc.downloadExcel(sid, date).subscribe({
      next: blob => {
        this.reportSvc.triggerDownload(blob, `cierre-${date}.xlsx`);
        this.downloading.set(false);
      },
      error: err => {
        this.error.set(this.extractMessage(err));
        this.downloading.set(false);
      },
    });
  }

  fmtKpi(val: number): string {
    return val < 0 ? 'S/D' : val.toFixed(2);
  }

  fmtPct(val: number): string {
    return val < 0 ? 'S/D' : `${val.toFixed(1)}%`;
  }

  trackByRank(_: number, u: UserResponsibilityEntry): number {
    return u.rank;
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
