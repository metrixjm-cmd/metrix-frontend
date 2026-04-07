import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService }  from '../services/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { APP_VERSION }  from '../../../../environments/app-version';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb      = inject(FormBuilder);
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);
  readonly themeSvc        = inject(ThemeService);

  readonly form: FormGroup = this.fb.group({
    numeroUsuario: ['', [Validators.required]],
    password:      ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isLoading    = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly currentYear  = new Date().getFullYear();
  readonly appVersion   = APP_VERSION;

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.form.value).subscribe({
      next: response => {
        this.themeSvc.assignLoginSelectionToUser(response.numeroUsuario);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 401
            ? 'Credenciales incorrectas. Verifica tu #Usuario y contraseña.'
            : err.status === 0
              ? 'No se pudo conectar con el servidor. Verifica tu conexión.'
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
