import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LicensePackage } from '../../licensing/licensing.models';
import { ProductosService } from '../services/productos.service';

@Component({
  selector: 'app-product-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-checkout.html',
})
export class ProductCheckout implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productosSvc = inject(ProductosService);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly startingTrial = signal(false);
  readonly error = signal('');
  readonly pkg = signal<LicensePackage | null>(null);
  readonly orderId = signal<string | null>(null);
  readonly step = signal<'datos' | 'elige' | 'pago'>('datos');

  readonly trialDays = computed(() => this.pkg()?.diasPrueba ?? 7);
  readonly hasTrial = computed(() => this.trialDays() > 0);

  readonly empresaForm = this.fb.group({
    empresaNombre:         ['', Validators.required],
    contactoNombre:        ['', Validators.required],
    contactoEmail:         ['', [Validators.required, Validators.email]],
    contactoTelefono:        [''],
    sucursalesContratadas: [1, [Validators.required, Validators.min(1)]],
  });

  readonly paymentForm = this.fb.group({
    cardholderName: ['', Validators.required],
    cardNumber:     ['', [Validators.required, Validators.minLength(13)]],
    expiryMonth:    ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    expiryYear:     ['', [Validators.required, Validators.pattern(/^20[2-9][0-9]$/)]],
    cvv:            ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    const packageId = this.route.snapshot.paramMap.get('packageId');
    if (!packageId) {
      void this.router.navigate(['/productos']);
      return;
    }
    this.productosSvc.getPackage(packageId).subscribe({
      next: p => {
        this.pkg.set(p);
        if (p.minSucursales) {
          this.empresaForm.patchValue({ sucursalesContratadas: p.minSucursales });
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Plan no disponible.');
        this.loading.set(false);
      },
    });
  }

  submitEmpresa(): void {
    if (this.empresaForm.invalid || !this.pkg()) return;
    this.error.set('');
    const v = this.empresaForm.getRawValue();
    this.productosSvc.createOrder({
      packageId: this.pkg()!.id,
      empresaNombre: v.empresaNombre!,
      contactoNombre: v.contactoNombre!,
      contactoEmail: v.contactoEmail!,
      contactoTelefono: v.contactoTelefono || undefined,
      sucursalesContratadas: Number(v.sucursalesContratadas),
    }).subscribe({
      next: order => {
        this.orderId.set(order.id);
        this.step.set(this.hasTrial() ? 'elige' : 'pago');
      },
      error: err => {
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo crear la orden.');
      },
    });
  }

  startTrial(): void {
    if (!this.orderId()) return;
    this.startingTrial.set(true);
    this.error.set('');
    this.productosSvc.startTrial(this.orderId()!).subscribe({
      next: () => {
        void this.router.navigate(['/productos/provision', this.orderId()]);
      },
      error: err => {
        this.startingTrial.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo iniciar la prueba.');
      },
    });
  }

  goToPago(): void {
    this.error.set('');
    this.step.set('pago');
  }

  submitPago(): void {
    if (this.paymentForm.invalid || !this.orderId()) return;
    this.paying.set(true);
    this.error.set('');
    this.productosSvc.payOrder(this.orderId()!, this.paymentForm.getRawValue() as never).subscribe({
      next: () => {
        void this.router.navigate(['/productos/provision', this.orderId()]);
      },
      error: err => {
        this.paying.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'El pago no pudo procesarse.');
      },
    });
  }
}
