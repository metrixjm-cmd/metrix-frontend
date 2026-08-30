import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LicensingService } from '../services/licensing.service';
import {
  CATALOGO_FUNCIONES,
  CicloFacturacion,
  LICENSE_ACCENTS,
  LicensePackage,
  sufijoPrecio,
} from '../licensing.models';

@Component({
  selector: 'app-license-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './license-list.html',
})
export class LicenseList implements OnInit {
  private readonly licensingSvc = inject(LicensingService);

  readonly loading  = this.licensingSvc.loading;
  readonly packages = this.licensingSvc.packages;
  readonly error    = this.licensingSvc.error;

  readonly ciclo = signal<CicloFacturacion>('MENSUAL');

  readonly filasComparativa = computed(() => {
    const extra = this.packages()
      .flatMap(p => p.funciones.map(f => f.label))
      .filter(label => !CATALOGO_FUNCIONES.includes(label as typeof CATALOGO_FUNCIONES[number]));
    return [...CATALOGO_FUNCIONES, ...new Set(extra)];
  });

  readonly activos = computed(() => this.packages().filter(p => p.activo).length);

  readonly destacado = computed(() => this.packages().find(p => p.destacado)?.nombre ?? '—');

  readonly rangoPrecios = computed(() => {
    const cobrables = this.packages().filter(p => p.activo && !p.precioPersonalizado);
    if (cobrables.length === 0) return '—';
    const precios = cobrables.map(p => this.precioDelCiclo(p));
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    const moneda = cobrables[0].moneda;
    if (min === max) return this.formatPrecio(min, moneda);
    return `${this.formatPrecio(min, moneda)} – ${this.formatPrecio(max, moneda)}`;
  });

  ngOnInit(): void {
    this.licensingSvc.loadAll();
  }

  setCiclo(c: CicloFacturacion): void {
    this.ciclo.set(c);
  }

  precioDelCiclo(p: LicensePackage): number {
    return this.ciclo() === 'ANUAL' ? p.precioAnual : p.precioMensual;
  }

  sufijoCiclo(p: LicensePackage): string {
    return sufijoPrecio(p.pricingModel, this.ciclo());
  }

  ahorroAnual(p: LicensePackage): number {
    if (p.precioPersonalizado || p.precioMensual <= 0 || p.precioAnual <= 0) return 0;
    const anualizado = p.precioMensual * 12;
    if (p.precioAnual >= anualizado) return 0;
    return Math.round(((anualizado - p.precioAnual) / anualizado) * 100);
  }

  formatPrecio(valor: number, moneda: string): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(valor);
  }

  precioVisible(p: LicensePackage): string {
    if (p.precioPersonalizado) return 'A cotizar';
    return this.formatPrecio(this.precioDelCiclo(p), p.moneda);
  }

  limiteTexto(valor: number | null, singular: string, plural: string, ilimitado: string): string {
    if (valor === null) return ilimitado;
    return `${valor} ${valor === 1 ? singular : plural}`;
  }

  accent(p: LicensePackage) {
    return LICENSE_ACCENTS[p.accent];
  }

  incluye(p: LicensePackage, label: string): boolean {
    return p.funciones.some(f => f.label === label && f.incluido);
  }

  funcionesIncluidas(p: LicensePackage) {
    return p.funciones.filter(f => f.incluido);
  }

  toggleActivo(p: LicensePackage, event: Event): void {
    event.stopPropagation();
    this.licensingSvc.toggleActivo(p.id);
  }

  toggleDestacado(p: LicensePackage, event: Event): void {
    event.stopPropagation();
    this.licensingSvc.setDestacado(p.id);
  }
}
