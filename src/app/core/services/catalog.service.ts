import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CatalogEntry } from './catalog.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/catalogs`;

  private readonly _puestos    = signal<CatalogEntry[]>([]);
  private readonly _turnos     = signal<CatalogEntry[]>([]);
  private readonly _categorias = signal<CatalogEntry[]>([]);

  readonly puestos    = this._puestos.asReadonly();
  readonly turnos     = this._turnos.asReadonly();
  readonly categorias = this._categorias.asReadonly();

  async loadPuestos(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<CatalogEntry[]>(`${this.baseUrl}/PUESTO`)
      );
      this._puestos.set(data);
    } catch (err) {
      console.error('Error cargando puestos:', err);
    }
  }

  async loadTurnos(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<CatalogEntry[]>(`${this.baseUrl}/TURNO`)
      );
      this._turnos.set(data);
    } catch (err) {
      console.error('Error cargando turnos:', err);
    }
  }

  async loadCategorias(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<CatalogEntry[]>(`${this.baseUrl}/CATEGORIA`)
      );
      this._categorias.set(data);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  }

  async addEntry(type: string, value: string, role?: string): Promise<CatalogEntry> {
    const entry = await firstValueFrom(
      this.http.post<CatalogEntry>(this.baseUrl + '/' + type, { value, role })
    );
    await this.reload(type);
    return entry;
  }

  async updateEntry(type: string, id: string, value: string, role?: string): Promise<CatalogEntry> {
    const entry = await firstValueFrom(
      this.http.put<CatalogEntry>(`${this.baseUrl}/${type}/${id}`, { value, role })
    );
    await this.reload(type);
    return entry;
  }

  /** Soft-delete: el backend desactiva la entrada (deja de aparecer en dropdowns). */
  async deleteEntry(type: string, id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${type}/${id}`));
    await this.reload(type);
  }

  private async reload(type: string): Promise<void> {
    switch (type) {
      case 'PUESTO':    await this.loadPuestos(); break;
      case 'TURNO':     await this.loadTurnos(); break;
      case 'CATEGORIA': await this.loadCategorias(); break;
    }
  }
}
