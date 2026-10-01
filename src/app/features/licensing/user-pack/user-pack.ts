import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { UserPackStatus } from './user-pack.models';
import { UserPackService } from './user-pack.service';

@Component({
  selector: 'app-user-pack',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './user-pack.html',
})
export class UserPackPage implements OnInit {
  private readonly userPackSvc = inject(UserPackService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly error = signal('');
  readonly paidMessage = signal('');
  readonly status = signal<UserPackStatus | null>(null);
  readonly showCard = signal(false);
  readonly useCardForm = !environment.production;

  readonly paymentForm = this.fb.group({
    cardholderName: ['', Validators.required],
    cardNumber:     ['', [Validators.required, Validators.minLength(13)]],
    expiryMonth:    ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    expiryYear:     ['', [Validators.required, Validators.pattern(/^20[2-9][0-9]$/)]],
    cvv:            ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    if (this.auth.isPlatformAdmin()) {
      this.loading.set(false);
      this.error.set('Esta opción es para el administrador de una licencia.');
      return;
    }
    this.load();
  }

  formatPrecio(valor: number, moneda: string): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda || 'MXN',
      maximumFractionDigits: 0,
    }).format(valor || 0);
  }

  startPay(): void {
    const current = this.status();
    if (!current?.disponible || this.paying()) return;
    this.error.set('');
    this.paidMessage.set('');
    if (this.useCardForm) {
      this.showCard.set(true);
      return;
    }
    this.redirectToMercadoPago();
  }

  submitCard(): void {
    if (this.paymentForm.invalid || this.paying()) return;
    this.paying.set(true);
    this.error.set('');
    this.userPackSvc.checkout().subscribe({
      next: session => {
        this.userPackSvc.pay(session.orderId, this.paymentForm.getRawValue() as never).subscribe({
          next: order => {
            this.paying.set(false);
            this.showCard.set(false);
            this.paidMessage.set(
              `Pago registrado. El paquete de ${order.usuarios} usuarios queda hasta el ${this.formatDate(order.periodoFin)}.`,
            );
            this.load();
          },
          error: err => {
            this.paying.set(false);
            this.error.set(this.apiMessage(err, 'El pago no pudo procesarse.'));
          },
        });
      },
      error: err => {
        this.paying.set(false);
        this.error.set(this.apiMessage(err, 'No se pudo iniciar el cobro.'));
      },
    });
  }

  private redirectToMercadoPago(): void {
    this.paying.set(true);
    this.userPackSvc.checkout().subscribe({
      next: session => {
        const url = !environment.production && session.sandboxInitPoint
          ? session.sandboxInitPoint
          : session.initPoint;
        if (!url || url.includes('/licencia/usuarios-extra/')) {
          this.paying.set(false);
          this.error.set('Checkout inválido. Revisa que Mercado Pago esté activo.');
          return;
        }
        window.location.assign(url);
      },
      error: err => {
        this.paying.set(false);
        this.error.set(this.apiMessage(err, 'No se pudo iniciar Mercado Pago.'));
      },
    });
  }

  private load(): void {
    this.userPackSvc.status().subscribe({
      next: status => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(this.apiMessage(err, 'No se pudo consultar el paquete de usuarios.'));
      },
    });
  }

  private formatDate(value?: string | null): string {
    if (!value) return 'la fecha confirmada';
    return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private apiMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { error?: string; message?: string } })?.error;
    return body?.error || body?.message || fallback;
  }
}
