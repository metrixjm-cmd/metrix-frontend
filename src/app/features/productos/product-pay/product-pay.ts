import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { ProductOrder } from '../productos.models';
import { ProductosService } from '../services/productos.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-product-pay',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-pay.html',
})
export class ProductPay implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productosSvc = inject(ProductosService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly error = signal('');
  readonly order = signal<ProductOrder | null>(null);
  readonly useCardForm = !environment.production;

  readonly paymentForm = this.fb.group({
    cardholderName: ['', Validators.required],
    cardNumber:     ['', [Validators.required, Validators.minLength(13)]],
    expiryMonth:    ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    expiryYear:     ['', [Validators.required, Validators.pattern(/^20[2-9][0-9]$/)]],
    cvv:            ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      void this.router.navigate(['/productos']);
      return;
    }
    this.productosSvc.getOrder(orderId).subscribe({
      next: order => {
        this.order.set(order);
        this.loading.set(false);
        if (order.paymentStatus === 'APPROVED' || order.status === 'PAID') {
          this.afterPaid(order);
          return;
        }
        if (!this.useCardForm) {
          this.redirectToMercadoPago(order.id);
        }
      },
      error: () => {
        this.error.set('Orden no encontrada.');
        this.loading.set(false);
      },
    });
  }

  submitPago(): void {
    const current = this.order();
    if (this.paymentForm.invalid || !current) return;
    this.paying.set(true);
    this.error.set('');
    this.productosSvc.createCheckout(current.id).subscribe({
      next: () => {
        this.productosSvc.payOrder(current.id, this.paymentForm.getRawValue() as never).subscribe({
          next: paid => this.afterPaid(paid),
          error: err => {
            this.paying.set(false);
            this.error.set(err?.error?.error ?? err?.error?.message ?? 'El pago no pudo procesarse.');
          },
        });
      },
      error: err => {
        this.paying.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo iniciar el checkout.');
      },
    });
  }

  private redirectToMercadoPago(orderId: string): void {
    this.paying.set(true);
    this.productosSvc.createCheckout(orderId).subscribe({
      next: session => {
        const url = session.sandboxInitPoint || session.initPoint;
        window.location.assign(url);
      },
      error: err => {
        this.paying.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo iniciar Mercado Pago.');
      },
    });
  }

  private afterPaid(paid: ProductOrder): void {
    this.auth.clearTrialState();
    if (paid.instanceId) {
      void this.router.navigate(['/auth/login']);
    } else {
      void this.router.navigate(['/productos/provision', paid.id]);
    }
  }
}
