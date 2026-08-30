import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LICENSE_ACCENTS, LicensePackage, sufijoPrecio } from '../../licensing/licensing.models';
import { ProductosService } from '../services/productos.service';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-catalog.html',
})
export class ProductCatalog implements OnInit {
  private readonly productosSvc = inject(ProductosService);

  readonly loading  = signal(true);
  readonly error    = signal('');
  readonly packages = signal<LicensePackage[]>([]);

  ngOnInit(): void {
    this.productosSvc.getCatalog().subscribe({
      next: list => {
        this.packages.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo cargar el catálogo.');
        this.loading.set(false);
      },
    });
  }

  accent(p: LicensePackage) {
    return LICENSE_ACCENTS[p.accent] ?? LICENSE_ACCENTS.slate;
  }

  precioLabel(p: LicensePackage): string {
    if (p.precioPersonalizado) return 'A cotizar';
    return `$${p.precioMensual.toLocaleString('es-MX')} ${sufijoPrecio(p.pricingModel, 'MENSUAL')}`;
  }
}
