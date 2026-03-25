import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  CreateLinkMaterialRequest,
  MaterialPage,
  MaterialType,
  TrainingMaterial,
} from '../training-material.models';

@Injectable({ providedIn: 'root' })
export class TrainingMaterialService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/training-materials`;

  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _materials = signal<TrainingMaterial[]>([]);
  private readonly _total     = signal(0);
  private readonly _page      = signal(0);
  private readonly _pages     = signal(0);
  private readonly _loading   = signal(false);
  private readonly _saving    = signal(false);
  private readonly _error     = signal<string | null>(null);
  private readonly _tags      = signal<string[]>([]);

  readonly materials = this._materials.asReadonly();
  readonly total     = this._total.asReadonly();
  readonly page      = this._page.asReadonly();
  readonly pages     = this._pages.asReadonly();
  readonly loading   = this._loading.asReadonly();
  readonly saving    = this._saving.asReadonly();
  readonly error     = this._error.asReadonly();
  readonly tags      = this._tags.asReadonly();

  clearError(): void { this._error.set(null); }

  // ── Carga ─────────────────────────────────────────────────────────────────

  load(filters: { type?: MaterialType; category?: string; tag?: string;
                  storeId?: string; page?: number; size?: number } = {}): void {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 20);

    if (filters.type)     params = params.set('type', filters.type);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.tag)      params = params.set('tag', filters.tag);
    if (filters.storeId)  params = params.set('storeId', filters.storeId);

    this.http.get<MaterialPage>(this.apiUrl, { params }).subscribe({
      next: page => {
        this._materials.set(page.content);
        this._total.set(page.totalElements);
        this._pages.set(page.totalPages);
        this._page.set(page.number);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.extractMessage(err));
        this._loading.set(false);
      },
    });
  }

  loadTags(): void {
    this.http.get<string[]>(`${this.apiUrl}/tags`).subscribe({
      next: tags => this._tags.set(tags),
      error: () => {},
    });
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  uploadFile(
    file: File,
    title: string,
    description: string,
    category: string,
    tags: string[],
    storeId?: string,
  ): Promise<TrainingMaterial> {
    this._saving.set(true);
    this._error.set(null);

    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (description) form.append('description', description);
    if (category)    form.append('category', category);
    if (tags.length) form.append('tags', tags.join(','));
    if (storeId)     form.append('storeId', storeId);

    return new Promise((resolve, reject) => {
      this.http.post<TrainingMaterial>(this.apiUrl, form).subscribe({
        next: m => {
          this._materials.update(list => [m, ...list]);
          this._total.update(n => n + 1);
          this._saving.set(false);
          resolve(m);
        },
        error: err => {
          this._error.set(this.extractMessage(err));
          this._saving.set(false);
          reject(err);
        },
      });
    });
  }

  createLink(req: CreateLinkMaterialRequest): Promise<TrainingMaterial> {
    this._saving.set(true);
    this._error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<TrainingMaterial>(`${this.apiUrl}/link`, req).subscribe({
        next: m => {
          this._materials.update(list => [m, ...list]);
          this._total.update(n => n + 1);
          this._saving.set(false);
          resolve(m);
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
          this._materials.update(list => list.filter(m => m.id !== id));
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
