import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly token = signal('');
  readonly loading = signal(true);
  readonly invalid = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly codigoEmpresa = signal('');
  readonly numeroUsuario = signal('');
  readonly empresaNombre = signal('');
  readonly showPassword = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(token);
    if (!token) {
      this.loading.set(false);
      this.invalid.set(true);
      return;
    }
    this.auth.validatePasswordResetToken(token).subscribe({
      next: res => {
        this.codigoEmpresa.set(res.codigoEmpresa);
        this.numeroUsuario.set(res.numeroUsuario);
        this.empresaNombre.set(res.empresaNombre);
        this.loading.set(false);
      },
      error: () => {
        this.invalid.set(true);
        this.loading.set(false);
      },
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();
    if (raw.newPassword !== raw.confirmPassword) {
      this.errorMessage.set('La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.auth.confirmPasswordReset(this.token(), raw.newPassword ?? '', raw.confirmPassword ?? '')
      .subscribe({
        next: () => {
          void this.router.navigate(['/auth/login'], {
            queryParams: {
              empresa: this.codigoEmpresa(),
              usuario: this.numeroUsuario(),
            },
          });
        },
        error: err => {
          this.saving.set(false);
          this.errorMessage.set(
            err.error?.details
              ? String(Object.values(err.error.details)[0] ?? 'No se pudo guardar.')
              : (err.error?.message || err.error?.error || 'La liga no es válida o ya fue usada.'),
          );
        },
      });
  }
}
