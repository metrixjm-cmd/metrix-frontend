import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../services/settings.service';
import { TURNOS_DISPONIBLES } from '../settings.models';

@Component({
  selector: 'app-store-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './store-create.html',
})
export class StoreCreate {
  private readonly authSvc     = inject(AuthService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly isAdmin  = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly saving   = this.settingsSvc.saving;
  readonly error    = this.settingsSvc.error;
  readonly turnos   = TURNOS_DISPONIBLES;

  /** Turnos seleccionados como signal (checkboxes). Por defecto todos marcados. */
  readonly selectedTurnos = signal<string[]>([...TURNOS_DISPONIBLES]);

  readonly form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    codigo:    ['', [Validators.required, Validators.minLength(3)]],
    direccion: [''],
    telefono:  [''],
  });

  toggleTurno(turno: string): void {
    this.selectedTurnos.update(list =>
      list.includes(turno) ? list.filter(t => t !== turno) : [...list, turno]
    );
  }

  isTurnoSelected(turno: string): boolean {
    return this.selectedTurnos().includes(turno);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.getRawValue();
    try {
      await this.settingsSvc.create({
        nombre:    val.nombre!,
        codigo:    val.codigo!.toUpperCase(),
        direccion: val.direccion || undefined,
        telefono:  val.telefono  || undefined,
        turnos:    this.selectedTurnos(),
      });
      this.router.navigate(['/settings']);
    } catch {
      // error already set in service signal
    }
  }
}
