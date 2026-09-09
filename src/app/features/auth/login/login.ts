import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService }  from '../services/auth.service';
import { APP_VERSION }  from '../../../../environments/app-version';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb      = inject(FormBuilder);
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);

  readonly form: FormGroup = this.fb.group({
    codigoEmpresa: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(24)]],
    numeroUsuario: ['', [Validators.required]],
    password:      ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isLoading    = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly currentYear  = new Date().getFullYear();
  readonly appVersion   = APP_VERSION;

  constructor() {
    if (this.route.snapshot.queryParamMap.get('sessionExpired') === '1') {
      this.errorMessage.set('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
    }
    const empresa = this.route.snapshot.queryParamMap.get('empresa');
    if (empresa) {
      this.form.patchValue({ codigoEmpresa: empresa.toUpperCase() });
    }
    const user = this.route.snapshot.queryParamMap.get('usuario');
    if (user) {
      this.form.patchValue({ numeroUsuario: user });
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    this.auth.login({
      codigoEmpresa: String(raw.codigoEmpresa ?? '').trim().toUpperCase(),
      numeroUsuario: String(raw.numeroUsuario ?? '').trim(),
      password: String(raw.password ?? ''),
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 401
            ? 'Credenciales incorrectas. Verifica plataforma, #Usuario y contraseña.'
            : err.status === 0
              ? 'No se pudo conectar con el servidor. Verifica tu conexión.'
              : err.status === 422
                ? (err.error?.error ?? err.error?.message ?? 'No se pudo iniciar sesión.')
                : 'Error del servidor. Intenta más tarde.',
        );
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
