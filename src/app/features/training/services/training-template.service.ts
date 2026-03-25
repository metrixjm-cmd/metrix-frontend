import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  CreateTrainingTemplateRequest,
  TemplatePage,
  TrainingTemplate,
} from '../training-template.models';
import { TrainingLevel } from '../training.models';

@Injectable({ providedIn: 'root' })
export class TrainingTemplateService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/training-templates`;

  // ── Estado ───────────────────────────────────────────────────────────────
  private readonly _templates = signal<TrainingTemplate[]>([]);
  private readonly _total     = signal(0);
  private readonly _pages     = signal(0);
  private readonly _loading   = signal(false);
  private readonly _saving    = signal(false);
  private readonly _error     = signal<string | null>(null);

  readonly templates = this._templates.asReadonly();
  readonly total     = this._total.asReadonly();
  readonly pages     = this._pages.asReadonly();
  readonly loading   = this._loading.asReadonly();
  readonly saving    = this._saving.asReadonly();
  readonly error     = this._error.asReadonly();

  clearError(): void { this._error.set(null); }

  // ── Carga ─────────────────────────────────────────────────────────────────

  load(filters: { category?: string; level?: TrainingLevel;
                  tag?: string; page?: number; size?: number } = {}): void {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 20);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.level)    params = params.set('level', filters.level);
    if (filters.tag)      params = params.set('tag', filters.tag);

    this.http.get<TemplatePage>(this.apiUrl, { params }).subscribe({
      next: page => {
        this._templates.set(page.content);
        this._total.set(page.totalElements);
        this._pages.set(page.totalPages);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.extractMessage(err));
        this._loading.set(false);
      },
    });
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  create(req: CreateTrainingTemplateRequest): Promise<TrainingTemplate> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.post<TrainingTemplate>(this.apiUrl, req).subscribe({
        next: t => {
          this._templates.update(list => [t, ...list]);
          this._total.update(n => n + 1);
          this._saving.set(false);
          resolve(t);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  update(id: string, req: CreateTrainingTemplateRequest): Promise<TrainingTemplate> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.put<TrainingTemplate>(`${this.apiUrl}/${id}`, req).subscribe({
        next: t => {
          this._templates.update(list => list.map(item => item.id === id ? t : item));
          this._saving.set(false);
          resolve(t);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  delete(id: string): Promise<void> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          this._templates.update(list => list.filter(t => t.id !== id));
          this._total.update(n => Math.max(0, n - 1));
          this._saving.set(false);
          resolve();
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error)   return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al procesar la solicitud';
  }
}
