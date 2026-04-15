import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TaskTemplateEntry, TaskTemplateRequest } from '../models/task-template.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskTemplateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/task-templates`;

  private readonly _templates = signal<TaskTemplateEntry[]>([]);
  readonly templates = this._templates.asReadonly();

  private readonly _results = signal<TaskTemplateEntry[]>([]);
  readonly results = this._results.asReadonly();

  private readonly _searching = signal(false);
  readonly searching = this._searching.asReadonly();

  async loadAll(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<TaskTemplateEntry[]>(this.baseUrl)
    );
    this._templates.set(data ?? []);
  }

  async searchAndUpdate(query: string): Promise<void> {
    this._searching.set(true);
    try {
      const params: Record<string, string> = {};
      if (query.trim()) params['q'] = query.trim();

      const data = await firstValueFrom(
        this.http.get<TaskTemplateEntry[]>(this.baseUrl, { params })
      );
      this._results.set(data ?? []);
    } catch (err) {
      console.error('[TaskTemplateService] Error buscando plantillas:', err);
      this._results.set([]);
    } finally {
      this._searching.set(false);
    }
  }

  clearResults(): void {
    this._results.set([]);
  }

  async create(request: TaskTemplateRequest): Promise<TaskTemplateEntry> {
    const created = await firstValueFrom(
      this.http.post<TaskTemplateEntry>(this.baseUrl, request)
    );
    this._templates.update(list => [created, ...list]);
    return created;
  }

  async update(id: string, request: TaskTemplateRequest): Promise<TaskTemplateEntry> {
    const updated = await firstValueFrom(
      this.http.put<TaskTemplateEntry>(`${this.baseUrl}/${id}`, request)
    );
    this._templates.update(list => list.map(item => item.id === id ? updated : item));
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${id}`)
    );
    this._templates.update(list => list.filter(item => item.id !== id));
  }
}
