import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../services/settings.service';
import { TURNOS_DISPONIBLES } from '../settings.models';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './store-detail.html',
})
export class StoreDetail implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly store   = this.settingsSvc.selectedStore;
  readonly loading = this.settingsSvc.loading;
  readonly saving  = this.settingsSvc.saving;
  readonly error   = this.settingsSvc.error;
  readonly turnos  = TURNOS_DISPONIBLES;

  readonly isAdmin = computed(() => this.authSvc.hasRole('ADMIN'));

  /** Turnos seleccionados en el formulario de edición. */
  readonly selectedTurnos = signal<string[]>([]);

  /** Controla visibilidad del formulario de edición. */
  readonly editing = signal(false);

  /** Controla visibilidad del modal de confirmación de desactivación. */
  readonly showDeactivateModal = signal(false);

  readonly form = this.fb.group({
    nombre:    [''],
    direccion: [''],
    telefono:  [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.settingsSvc.loadById(id);
    }
  }

  startEditing(): void {
    const s = this.store();
    if (!s) return;
    this.form.patchValue({
      nombre:    s.nombre,
      direccion: s.direccion ?? '',
      telefono:  s.telefono  ?? '',
    });
    this.selectedTurnos.set([...s.turnos]);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
  }

  toggleTurno(turno: string): void {
    this.selectedTurnos.update(list =>
      list.includes(turno) ? list.filter(t => t !== turno) : [...list, turno]
    );
  }

  isTurnoSelected(turno: string): boolean {
    return this.selectedTurnos().includes(turno);
  }

  async save(): Promise<void> {
    const id = this.store()?.id;
    if (!id) return;
    const val = this.form.getRawValue();
    try {
      await this.settingsSvc.update(id, {
        nombre:    val.nombre    || undefined,
        direccion: val.direccion || undefined,
        telefono:  val.telefono  || undefined,
        turnos:    this.selectedTurnos(),
      });
      this.editing.set(false);
    } catch {
      // error already set in service signal
    }
  }

  async confirmDeactivate(): Promise<void> {
    const id = this.store()?.id;
    if (!id) return;
    try {
      await this.settingsSvc.deactivate(id);
      this.showDeactivateModal.set(false);
      this.router.navigate(['/rh/sucursales']);
    } catch {
      this.showDeactivateModal.set(false);
    }
  }
}
