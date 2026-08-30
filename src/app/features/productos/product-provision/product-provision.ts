import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProductosService } from '../services/productos.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-product-provision',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-provision.html',
})
export class ProductProvision {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productosSvc = inject(ProductosService);

  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly orderId = this.route.snapshot.paramMap.get('orderId') ?? '';

  readonly form = this.fb.group({
    numeroUsuario:   ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
    adminNombre:     [''],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit(): void {
    if (this.form.invalid || !this.orderId) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.productosSvc.provision(this.orderId, {
      numeroUsuario: v.numeroUsuario!.toUpperCase(),
      password: v.password!,
      confirmPassword: v.confirmPassword!,
      adminNombre: v.adminNombre || undefined,
    }).subscribe({
      next: res => {
        this.success.set(res.message);
        this.saving.set(false);
        setTimeout(() => void this.router.navigate(['/auth/login']), 2000);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudo crear tu METRIX.');
      },
    });
  }
}
