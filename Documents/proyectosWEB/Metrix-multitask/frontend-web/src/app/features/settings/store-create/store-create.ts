import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../services/settings.service';
import { TURNOS_DISPONIBLES } from '../settings.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-store-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './store-create.html',
})
export class StoreCreate implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);
  private readonly http        = inject(HttpClient);

  readonly isAdmin  = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly saving   = this.settingsSvc.saving;
  readonly error    = this.settingsSvc.error;
  readonly turnos   = TURNOS_DISPONIBLES;

  /** Próximo código que se asignará (cargado desde el backend). */
  readonly nextCode = signal<string>('Cargando...');

  /** Turnos seleccionados como signal (checkboxes). Por defecto todos marcados. */
  readonly selectedTurnos = signal<string[]>([...TURNOS_DISPONIBLES]);

  readonly form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    direccion: [''],
    telefono:  [''],
  });

  ngOnInit(): void {
    this.http.get<{ codigo: string }>(`${environment.apiUrl}/stores/next-code`)
      .subscribe({ next: r => this.nextCode.set(r.codigo), error: () => this.nextCode.set('SUC001') });
  }

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
        // No enviar codigo — el backend usa la secuencia atómica
        direccion: val.direccion || undefined,
        telefono:  val.telefono  || undefined,
        turnos:    this.selectedTurnos(),
      });
      this.router.navigate(['/banco-info/sucursales']);
    } catch {
      // error already set in service signal
    }
  }
}
