import { Injectable, signal } from '@angular/core';

import { LicensePackage, LICENSE_PACKAGES_SEED } from '../licensing.models';

const STORAGE_KEY = 'metrix.licencias.v1';

/** Latencia simulada para que se vea el estado de carga como en el resto de la app. */
const FAKE_DELAY_MS = 250;

/**
 * Servicio del módulo Licencias — **plantilla, sin backend**.
 *
 * Mantiene la misma superficie que el resto de servicios del proyecto
 * (signals de solo lectura + Promise en las mutaciones) para que el día que
 * exista `/api/v1/licenses` solo haya que sustituir el cuerpo de los métodos
 * por llamadas HttpClient; los componentes no cambian.
 */
@Injectable({ providedIn: 'root' })
export class LicensingService {
  // ── Estado reactivo ───────────────────────────────────────────────────────
  private readonly _packages = signal<LicensePackage[]>([]);
  private readonly _loading  = signal(false);
  private readonly _saving   = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly packages = this._packages.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly saving   = this._saving.asReadonly();
  readonly error    = this._error.asReadonly();

  // ── Lectura ───────────────────────────────────────────────────────────────

  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);
    setTimeout(() => {
      this._packages.set(this.readStorage());
      this._loading.set(false);
    }, FAKE_DELAY_MS);
  }

  /** Búsqueda síncrona; si el estado aún está vacío lee de localStorage. */
  findById(id: string): LicensePackage | null {
    const enMemoria = this._packages().find(p => p.id === id);
    if (enMemoria) return enMemoria;
    return this.readStorage().find(p => p.id === id) ?? null;
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  update(id: string, cambios: Partial<LicensePackage>): Promise<LicensePackage> {
    this._saving.set(true);
    this._error.set(null);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const actual = this._packages().length ? this._packages() : this.readStorage();
        const previo = actual.find(p => p.id === id);
        if (!previo) {
          this._error.set('El paquete ya no existe');
          this._saving.set(false);
          reject(new Error('paquete inexistente'));
          return;
        }

        const actualizado: LicensePackage = { ...previo, ...cambios, id: previo.id };
        // Solo puede haber un paquete destacado a la vez.
        const lista = actual.map(p => {
          if (p.id === id) return actualizado;
          return actualizado.destacado ? { ...p, destacado: false } : p;
        });

        this.persist(lista);
        this._saving.set(false);
        resolve(actualizado);
      }, FAKE_DELAY_MS);
    });
  }

  toggleActivo(id: string): void {
    const lista = this._packages().map(p =>
      p.id === id ? { ...p, activo: !p.activo, destacado: p.activo ? false : p.destacado } : p
    );
    this.persist(lista);
  }

  /** Marca uno como destacado y desmarca el resto. */
  setDestacado(id: string): void {
    const lista = this._packages().map(p => ({ ...p, destacado: p.id === id ? !p.destacado : false }));
    this.persist(lista);
  }

  /** Devuelve los 4 paquetes a los valores de la plantilla. */
  resetDefaults(): void {
    this.persist(structuredClone(LICENSE_PACKAGES_SEED));
  }

  // ── Persistencia local ────────────────────────────────────────────────────

  private persist(lista: LicensePackage[]): void {
    this._packages.set(lista);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Modo privado o cuota llena: el estado en memoria sigue siendo válido.
    }
  }

  private readStorage(): LicensePackage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(LICENSE_PACKAGES_SEED);
      const parsed = JSON.parse(raw) as LicensePackage[];
      if (!Array.isArray(parsed) || parsed.length === 0) return structuredClone(LICENSE_PACKAGES_SEED);
      return parsed;
    } catch {
      return structuredClone(LICENSE_PACKAGES_SEED);
    }
  }
}
