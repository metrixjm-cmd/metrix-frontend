import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateExamTemplateRequest, ExamTemplateDetail, ExamTemplateSummary } from '../trainer.models';

@Injectable({ providedIn: 'root' })
export class ExamTemplateService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/exam-templates`;

  private readonly _summaries = signal<ExamTemplateSummary[]>([]);
  private readonly _loading   = signal(false);

  readonly summaries = this._summaries.asReadonly();
  readonly loading   = this._loading.asReadonly();

  loadSummaries(): void {
    this._loading.set(true);
    this.http.get<ExamTemplateSummary[]>(`${this.apiUrl}/summaries`).subscribe({
      next:  s  => { this._summaries.set(s); this._loading.set(false); },
      error: () => this._loading.set(false),
    });
  }

  getDetail(id: string): Promise<ExamTemplateDetail> {
    return firstValueFrom(this.http.get<ExamTemplateDetail>(`${this.apiUrl}/${id}`));
  }

  async createTemplate(request: CreateExamTemplateRequest): Promise<ExamTemplateSummary> {
    const tmpl = await firstValueFrom(
      this.http.post<ExamTemplateSummary>(this.apiUrl, request)
    );
    this._summaries.update(list => [tmpl, ...list]);
    return tmpl;
  }

  async deleteTemplate(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
    this._summaries.update(list => list.filter(t => t.id !== id));
  }
}
