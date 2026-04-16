import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TaskCategoriaEntry, TaskCategoriaRequest } from '../models/task-categoria.models';
import { environment } from '../../../../environments/environment';

/**
 * Servicio del catalogo enriquecido de categorias usado por /tasks/create.
 *
 * Endpoints consumidos:
 *   GET  /api/v1/categorias?q={query}  -> buscar por titulo
 *   GET  /api/v1/categorias            -> listar todas
 *   POST /api/v1/categorias            -> crear (ADMIN/GERENTE)
 */
@Injectable({ providedIn: 'root' })
export class TaskCategoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categorias`;

  private readonly _results = signal<TaskCategoriaEntry[]>([]);
  readonly results = this._results.asReadonly();

  private readonly _searching = signal(false);
  readonly searching = this._searching.asReadonly();

  async searchAndUpdate(query: string): Promise<void> {
    this._searching.set(true);
    try {
      const params: Record<string, string> = {};
      if (query.trim()) params['q'] = query.trim();

      const data = await firstValueFrom(
        this.http.get<TaskCategoriaEntry[]>(this.baseUrl, { params })
      );
      this._results.set(data ?? []);
    } catch (err) {
      console.error('[TaskCategoriaService] Error buscando categorias:', err);
      this._results.set([]);
    } finally {
      this._searching.set(false);
    }
  }

  clearResults(): void {
    this._results.set([]);
  }

  async create(request: TaskCategoriaRequest): Promise<TaskCategoriaEntry> {
    return firstValueFrom(
      this.http.post<TaskCategoriaEntry>(this.baseUrl, request)
    );
  }

  async update(id: string, request: TaskCategoriaRequest): Promise<TaskCategoriaEntry> {
    return firstValueFrom(
      this.http.put<TaskCategoriaEntry>(`${this.baseUrl}/${id}`, request)
    );
  }
}
