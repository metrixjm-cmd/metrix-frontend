import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { APP_VERSION } from '../../../../environments/app-version';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.group({
    codigoEmpresa: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(24)]],
    numeroUsuario: ['', [Validators.required]],
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly sent = signal(false);
  readonly currentYear = new Date().getFullYear();
  readonly appVersion = APP_VERSION;

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    const raw = this.form.getRawValue();
    this.auth.requestPasswordReset(
      String(raw.codigoEmpresa ?? '').trim().toUpperCase(),
      String(raw.numeroUsuario ?? '').trim(),
    ).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.sent.set(true);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 429
            ? (err.error?.error ?? err.error?.message ?? 'Demasiadas solicitudes. Inténtalo más tarde.')
            : err.status === 0
              ? 'No se pudo conectar con el servidor. Verifica tu conexión.'
              : err.error?.details
                ? String(Object.values(err.error.details)[0] ?? 'Revisa los datos.')
                : (err.error?.message || err.error?.error || 'No se pudo enviar la solicitud.'),
        );
      },
    });
  }
}
