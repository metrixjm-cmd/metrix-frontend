import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, interval, startWith, switchMap, takeWhile } from 'rxjs';

import { ProductOrder } from '../productos.models';
import { ProductosService } from '../services/productos.service';
import { AuthService } from '../../auth/services/auth.service';

/**
 * Return URL de Mercado Pago. No confía en query params: reconcilia con MP y consulta la orden.
 */
@Component({
  selector: 'app-product-pay-return',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-pay-return.html',
})
export class ProductPayReturn implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productosSvc = inject(ProductosService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('Confirmando el pago…');
  readonly order = signal<ProductOrder | null>(null);

  private done = false;

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      void this.router.navigate(['/productos']);
      return;
    }

    const hint = this.route.snapshot.queryParamMap.get('status');
    if (hint === 'failure') {
      this.message.set('El pago no se completó. Puedes intentarlo de nuevo.');
    } else if (hint === 'pending') {
      this.message.set('Pago pendiente. Estamos esperando la confirmación…');
    }

    let attempts = 0;
    interval(2000)
      .pipe(
        startWith(0),
        takeWhile(() => !this.done && attempts < 30, true),
        switchMap(() => {
          attempts += 1;
          // Reconciliar con MP (cubre webhook 401 / retraso); si aún no hay approved, caer a GET.
          return this.productosSvc.syncPayment(orderId).pipe(
            catchError(() => this.productosSvc.getOrder(orderId)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: order => this.onOrderUpdate(order, attempts),
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo consultar la orden.');
        },
      });
  }

  private onOrderUpdate(order: ProductOrder, attempts: number): void {
    this.order.set(order);
    this.loading.set(false);
    if (order.paymentStatus === 'APPROVED'
        || order.status === 'PAID'
        || (order.status === 'PROVISIONED' && !!order.paidAt)) {
      this.done = true;
      this.auth.clearTrialState();
      if (order.instanceId && order.paidAt) {
        void this.router.navigate(['/auth/login']);
      } else {
        void this.router.navigate(['/productos/provision', order.id]);
      }
      return;
    }
    if (order.paymentStatus === 'REJECTED') {
      this.done = true;
      this.message.set('El pago fue rechazado. Vuelve a intentar desde el plan.');
      this.error.set('Pago rechazado');
    } else if (attempts >= 30) {
      this.message.set('Aún no confirmamos el pago. Si ya pagaste, espera un momento y recarga.');
    } else {
      this.message.set('Esperando confirmación del pago…');
    }
  }

  retryPay(): void {
    const id = this.order()?.id;
    if (id) {
      void this.router.navigate(['/productos/pago', id]);
    }
  }
}
