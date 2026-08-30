import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { LicensePackage } from '../licensing.models';

@Injectable({ providedIn: 'root' })
export class LicensingService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/license-packages`;

  private readonly _packages = signal<LicensePackage[]>([]);
  private readonly _loading  = signal(false);
  private readonly _saving   = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly packages = this._packages.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly saving   = this._saving.asReadonly();
  readonly error    = this._error.asReadonly();

  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<LicensePackage[]>(this.apiUrl).subscribe({
      next:  data => {
        this._packages.set(data.map(pkg => this.normalize(pkg)));
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.extractMessage(err));
        this._loading.set(false);
      },
    });
  }

  findById(id: string): LicensePackage | null {
    return this._packages().find(p => p.id === id) ?? null;
  }

  loadById(id: string): Promise<LicensePackage> {
    this._loading.set(true);
    this._error.set(null);
    return firstValueFrom(this.http.get<LicensePackage>(`${this.apiUrl}/${id}`))
      .then(pkg => {
        const normalized = this.normalize(pkg);
        this._packages.update(list => {
          const idx = list.findIndex(p => p.id === id);
          if (idx === -1) return [...list, normalized];
          return list.map(p => (p.id === id ? normalized : p));
        });
        this._loading.set(false);
        return normalized;
      })
      .catch(err => {
        this._error.set(this.extractMessage(err));
        this._loading.set(false);
        throw err;
      });
  }

  update(id: string, cambios: Partial<LicensePackage>): Promise<LicensePackage> {
    const previo = this.findById(id);
    if (!previo) {
      return Promise.reject(new Error('paquete inexistente'));
    }

    const payload: LicensePackage = {
      ...previo,
      ...cambios,
      id: previo.id,
      funciones: cambios.funciones ?? previo.funciones,
    };

    this._saving.set(true);
    this._error.set(null);
    return firstValueFrom(this.http.put<LicensePackage>(`${this.apiUrl}/${id}`, payload))
      .then(saved => {
        const normalized = this.normalize(saved);
        this._packages.update(list => list.map(p => (p.id === id ? normalized : p)));
        this._saving.set(false);
        return normalized;
      })
      .catch(err => {
        this._error.set(this.extractMessage(err));
        this._saving.set(false);
        throw err;
      });
  }

  toggleActivo(id: string): void {
    this.http.patch<LicensePackage>(`${this.apiUrl}/${id}/activo`, null).subscribe({
      next:  saved => this.patchLocal(saved),
      error: err => this._error.set(this.extractMessage(err)),
    });
  }

  setDestacado(id: string): void {
    this.http.patch<LicensePackage>(`${this.apiUrl}/${id}/destacado`, null).subscribe({
      next:  saved => this.refreshAfterDestacado(saved),
      error: err => this._error.set(this.extractMessage(err)),
    });
  }

  resetDefaults(): Promise<LicensePackage[]> {
    this._saving.set(true);
    this._error.set(null);
    return firstValueFrom(this.http.post<LicensePackage[]>(`${this.apiUrl}/reset-defaults`, null))
      .then(list => {
        const normalized = list.map(pkg => this.normalize(pkg));
        this._packages.set(normalized);
        this._saving.set(false);
        return normalized;
      })
      .catch(err => {
        this._error.set(this.extractMessage(err));
        this._saving.set(false);
        throw err;
      });
  }

  private patchLocal(saved: LicensePackage): void {
    const normalized = this.normalize(saved);
    this._packages.update(list => list.map(p => (p.id === normalized.id ? normalized : p)));
  }

  private refreshAfterDestacado(saved: LicensePackage): void {
    this.loadAll();
  }

  private normalize(pkg: LicensePackage): LicensePackage {
    return {
      ...pkg,
      precioMensual: Number(pkg.precioMensual ?? 0),
      precioAnual: Number(pkg.precioAnual ?? 0),
      precioImplementacion: Number(pkg.precioImplementacion ?? 0),
    };
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string; details?: Record<string, string> } }).error;
      if (typeof body === 'string') return body;
      if (body?.details) {
        const first = Object.values(body.details)[0];
        if (first) return first;
      }
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al procesar la solicitud de licencias.';
  }
}
