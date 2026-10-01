import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, interval, startWith, switchMap, takeWhile } from 'rxjs';

import { UserPackService } from './user-pack.service';

@Component({
  selector: 'app-user-pack-return',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-pack-return.html',
})
export class UserPackReturn implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userPackSvc = inject(UserPackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly message = signal('Confirmando el pago…');
  readonly error = signal('');

  private done = false;

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      void this.router.navigate(['/licencia/usuarios-extra']);
      return;
    }

    const hint = this.route.snapshot.queryParamMap.get('status');
    if (hint === 'failure') {
      this.message.set('El pago no se completó.');
    }

    let attempts = 0;
    interval(2000)
      .pipe(
        startWith(0),
        takeWhile(() => !this.done && attempts < 30, true),
        switchMap(() => {
          attempts += 1;
          return this.userPackSvc.syncPayment(orderId).pipe(
            catchError(() => this.userPackSvc.getOrder(orderId)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: order => {
          if (order.paymentStatus === 'APPROVED') {
            this.done = true;
            void this.router.navigate(['/licencia/usuarios-extra']);
            return;
          }
          if (order.paymentStatus === 'REJECTED') {
            this.done = true;
            this.error.set('El pago fue rechazado.');
            this.message.set('Puedes intentarlo de nuevo.');
          } else if (attempts >= 30) {
            this.message.set('Aún no confirmamos el pago. Si ya pagaste, espera un momento y recarga.');
          }
        },
        error: () => {
          this.error.set('No se pudo consultar el pago.');
        },
      });
  }
}
