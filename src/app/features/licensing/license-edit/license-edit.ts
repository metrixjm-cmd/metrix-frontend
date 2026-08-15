import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { LicensingService } from '../services/licensing.service';
import {
  ACCENTS_DISPONIBLES,
  LICENSE_ACCENTS,
  LicenseAccent,
  LicenseFeature,
  LicensePackage,
  MONEDAS,
  Moneda,
} from '../licensing.models';

@Component({
  selector: 'app-license-edit',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './license-edit.html',
})
export class LicenseEdit implements OnInit {
  private readonly licensingSvc = inject(LicensingService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly fb           = inject(FormBuilder);
  private readonly destroyRef   = inject(DestroyRef);

  readonly saving = this.licensingSvc.saving;
  readonly error  = this.licensingSvc.error;

  readonly monedas = MONEDAS;
  readonly accents = ACCENTS_DISPONIBLES;

  /** Paquete original; null mientras se resuelve o si el id no existe. */
  readonly paquete = signal<LicensePackage | null>(null);

  /** Funciones en edición (checkbox + añadir/quitar). */
  readonly funciones = signal<LicenseFeature[]>([]);

  readonly nuevaFuncion = signal('');

  readonly form = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    etiqueta:    [''],
    descripcion: ['', [Validators.required, Validators.maxLength(280)]],
    moneda:      ['MXN' as Moneda, Validators.required],
    precioPersonalizado: [false],
    precioMensual: [0, [Validators.required, Validators.min(0)]],
    precioAnual:   [0, [Validators.required, Validators.min(0)]],
    usuariosIlimitados:   [false],
    maxUsuarios:   [0, [Validators.min(1)]],
    sucursalesIlimitadas: [false],
    maxSucursales: [0, [Validators.min(1)]],
    soporte:   [''],
    accent:    ['cyan' as LicenseAccent, Validators.required],
    destacado: [false],
    activo:    [true],
  });

  // ── Vista previa reactiva ─────────────────────────────────────────────────
  private readonly formValue = signal(this.form.getRawValue());

  readonly previewAccent = computed(() => LICENSE_ACCENTS[this.formValue().accent ?? 'cyan']);

  /** Porcentaje de ahorro del plan anual frente a 12 mensualidades. */
  readonly ahorroAnual = computed(() => {
    const v = this.formValue();
    if (v.precioPersonalizado) return 0;
    const mensual = Number(v.precioMensual ?? 0);
    const anual   = Number(v.precioAnual ?? 0);
    if (mensual <= 0 || anual <= 0) return 0;
    const anualizado = mensual * 12;
    if (anual >= anualizado) return 0;
    return Math.round(((anualizado - anual) / anualizado) * 100);
  });

  readonly descripcionRestante = computed(() => 280 - (this.formValue().descripcion?.length ?? 0));

  readonly incluidasCount = computed(() => this.funciones().filter(f => f.incluido).length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const p  = id ? this.licensingSvc.findById(id) : null;

    if (!p) {
      this.router.navigate(['/licencias']);
      return;
    }

    this.paquete.set(p);
    this.funciones.set(p.funciones.map(f => ({ ...f })));

    this.form.patchValue({
      nombre:      p.nombre,
      etiqueta:    p.etiqueta,
      descripcion: p.descripcion,
      moneda:      p.moneda,
      precioPersonalizado: p.precioPersonalizado,
      precioMensual: p.precioMensual,
      precioAnual:   p.precioAnual,
      usuariosIlimitados:   p.maxUsuarios === null,
      maxUsuarios:          p.maxUsuarios ?? 10,
      sucursalesIlimitadas: p.maxSucursales === null,
      maxSucursales:        p.maxSucursales ?? 1,
      soporte:   p.soporte,
      accent:    p.accent,
      destacado: p.destacado,
      activo:    p.activo,
    });

    this.formValue.set(this.form.getRawValue());
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formValue.set(this.form.getRawValue());
        this.syncCamposDependientes();
      });

    this.syncCamposDependientes();
  }

  /**
   * Habilita/deshabilita los campos que dependen de un checkbox.
   * Se hace sobre el control (no con `[attr.disabled]`) porque un control
   * deshabilitado queda fuera de la validación: así `min(1)` en los límites no
   * bloquea el guardado cuando el paquete es ilimitado.
   */
  private syncCamposDependientes(): void {
    const v = this.form.getRawValue();
    const opts = { emitEvent: false };

    for (const campo of ['precioMensual', 'precioAnual', 'moneda']) {
      const c = this.form.get(campo)!;
      if (v.precioPersonalizado && c.enabled) c.disable(opts);
      if (!v.precioPersonalizado && c.disabled) c.enable(opts);
    }

    const usuarios = this.form.get('maxUsuarios')!;
    if (v.usuariosIlimitados && usuarios.enabled) usuarios.disable(opts);
    if (!v.usuariosIlimitados && usuarios.disabled) usuarios.enable(opts);

    const sucursales = this.form.get('maxSucursales')!;
    if (v.sucursalesIlimitadas && sucursales.enabled) sucursales.disable(opts);
    if (!v.sucursalesIlimitadas && sucursales.disabled) sucursales.enable(opts);
  }

  // ── Funciones del paquete ────────────────────────────────────────────────

  toggleFuncion(label: string): void {
    this.funciones.update(list =>
      list.map(f => f.label === label ? { ...f, incluido: !f.incluido } : f)
    );
  }

  agregarFuncion(): void {
    const label = this.nuevaFuncion().trim();
    if (!label) return;
    if (this.funciones().some(f => f.label.toLowerCase() === label.toLowerCase())) {
      this.nuevaFuncion.set('');
      return;
    }
    this.funciones.update(list => [...list, { label, incluido: true }]);
    this.nuevaFuncion.set('');
  }

  quitarFuncion(label: string): void {
    this.funciones.update(list => list.filter(f => f.label !== label));
  }

  onNuevaFuncionInput(event: Event): void {
    this.nuevaFuncion.set((event.target as HTMLInputElement).value);
  }

  // ── Formato ──────────────────────────────────────────────────────────────

  formatPrecio(valor: number, moneda: string): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(valor || 0);
  }

  previewPrecio(): string {
    const v = this.formValue();
    if (v.precioPersonalizado) return 'A cotizar';
    return this.formatPrecio(Number(v.precioMensual ?? 0), v.moneda ?? 'MXN');
  }

  previewLimite(esIlimitado: boolean | null, valor: number | null, singular: string, plural: string, ilimitado: string): string {
    if (esIlimitado) return ilimitado;
    const n = Number(valor ?? 0);
    return `${n} ${n === 1 ? singular : plural}`;
  }

  vista() {
    return this.formValue();
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const p = this.paquete();
    if (!p) return;

    const v = this.form.getRawValue();

    try {
      await this.licensingSvc.update(p.id, {
        nombre:      v.nombre!.trim(),
        etiqueta:    v.etiqueta?.trim() ?? '',
        descripcion: v.descripcion!.trim(),
        moneda:      v.moneda as Moneda,
        precioPersonalizado: !!v.precioPersonalizado,
        precioMensual: v.precioPersonalizado ? 0 : Number(v.precioMensual ?? 0),
        precioAnual:   v.precioPersonalizado ? 0 : Number(v.precioAnual ?? 0),
        maxUsuarios:   v.usuariosIlimitados   ? null : Number(v.maxUsuarios ?? 0),
        maxSucursales: v.sucursalesIlimitadas ? null : Number(v.maxSucursales ?? 0),
        soporte:   v.soporte?.trim() ?? '',
        accent:    v.accent as LicenseAccent,
        destacado: !!v.destacado,
        activo:    !!v.activo,
        funciones: this.funciones(),
      });
      this.router.navigate(['/licencias']);
    } catch {
      // el error ya quedó en la signal del servicio
    }
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
