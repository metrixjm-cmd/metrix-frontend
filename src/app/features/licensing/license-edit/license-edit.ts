import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { LicensingService } from '../services/licensing.service';
import {
  ACCENTS_DISPONIBLES,
  LICENSE_ACCENTS,
  LICENSE_PRICING_LABELS,
  LICENSE_PRICING_MODELS,
  LicenseAccent,
  LicenseFeature,
  LicensePackage,
  LicensePricingModel,
  MONEDAS,
  Moneda,
  sufijoPrecio,
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
  readonly pricingModels = LICENSE_PRICING_MODELS;
  readonly pricingLabels = LICENSE_PRICING_LABELS;

  readonly paquete = signal<LicensePackage | null>(null);
  readonly funciones = signal<LicenseFeature[]>([]);
  readonly nuevaFuncion = signal('');

  readonly form = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    etiqueta:    [''],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    moneda:      ['MXN' as Moneda, Validators.required],
    pricingModel: ['FLAT_MONTHLY' as LicensePricingModel, Validators.required],
    precioPersonalizado: [false],
    precioMensual: [0, [Validators.required, Validators.min(0)]],
    precioAnual:   [0, [Validators.required, Validators.min(0)]],
    precioImplementacion: [0, [Validators.required, Validators.min(0)]],
    usuariosIlimitados:   [false],
    minUsuarios:   [null as number | null],
    maxUsuarios:   [0, [Validators.min(1)]],
    sucursalesIlimitadas: [false],
    minSucursales: [null as number | null],
    maxSucursales: [0, [Validators.min(1)]],
    soporte:   [''],
    diasPrueba: [7, [Validators.required, Validators.min(0), Validators.max(90)]],
    accent:    ['cyan' as LicenseAccent, Validators.required],
    destacado: [false],
    activo:    [true],
  });

  private readonly formValue = signal(this.form.getRawValue());

  readonly previewAccent = computed(() => LICENSE_ACCENTS[this.formValue().accent ?? 'cyan']);

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

  readonly descripcionRestante = computed(() => 500 - (this.formValue().descripcion?.length ?? 0));

  readonly incluidasCount = computed(() => this.funciones().filter(f => f.incluido).length);

  readonly previewSufijo = computed(() => {
    const v = this.formValue();
    return sufijoPrecio(v.pricingModel ?? 'FLAT_MONTHLY', 'MENSUAL');
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/licencias']);
      return;
    }

    try {
      const p = await this.licensingSvc.loadById(id);
      this.bindPaquete(p);
    } catch {
      void this.router.navigate(['/licencias']);
    }
  }

  private bindPaquete(p: LicensePackage): void {
    this.paquete.set(p);
    this.funciones.set(p.funciones.map(f => ({ ...f })));

    this.form.patchValue({
      nombre:      p.nombre,
      etiqueta:    p.etiqueta,
      descripcion: p.descripcion,
      moneda:      p.moneda,
      pricingModel: p.pricingModel,
      precioPersonalizado: p.precioPersonalizado,
      precioMensual: p.precioMensual,
      precioAnual:   p.precioAnual,
      precioImplementacion: p.precioImplementacion,
      usuariosIlimitados:   p.maxUsuarios === null,
      minUsuarios:          p.minUsuarios,
      maxUsuarios:          p.maxUsuarios ?? 10,
      sucursalesIlimitadas: p.maxSucursales === null,
      minSucursales:        p.minSucursales,
      maxSucursales:        p.maxSucursales ?? 1,
      soporte:   p.soporte,
      diasPrueba: p.diasPrueba ?? 7,
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

  private syncCamposDependientes(): void {
    const v = this.form.getRawValue();
    const personalizado = !!v.precioPersonalizado;

    const precioMensual = this.form.get('precioMensual');
    const precioAnual = this.form.get('precioAnual');
    const precioImplementacion = this.form.get('precioImplementacion');
    if (personalizado) {
      precioMensual?.disable({ emitEvent: false });
      precioAnual?.disable({ emitEvent: false });
    } else {
      precioMensual?.enable({ emitEvent: false });
      precioAnual?.enable({ emitEvent: false });
    }
    precioImplementacion?.enable({ emitEvent: false });

    const maxUsuarios = this.form.get('maxUsuarios');
    if (v.usuariosIlimitados) maxUsuarios?.disable({ emitEvent: false });
    else maxUsuarios?.enable({ emitEvent: false });

    const maxSucursales = this.form.get('maxSucursales');
    if (v.sucursalesIlimitadas) maxSucursales?.disable({ emitEvent: false });
    else maxSucursales?.enable({ emitEvent: false });
  }

  toggleFuncion(label: string): void {
    this.funciones.update(list =>
      list.map(f => (f.label === label ? { ...f, incluido: !f.incluido } : f))
    );
  }

  agregarFuncion(): void {
    const label = this.nuevaFuncion().trim();
    if (!label) return;
    if (this.funciones().some(f => f.label.toLowerCase() === label.toLowerCase())) return;
    this.funciones.update(list => [...list, { label, incluido: true }]);
    this.nuevaFuncion.set('');
  }

  quitarFuncion(label: string): void {
    this.funciones.update(list => list.filter(f => f.label !== label));
  }

  onNuevaFuncionInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.nuevaFuncion.set(target.value);
  }

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
        pricingModel: v.pricingModel as LicensePricingModel,
        precioPersonalizado: !!v.precioPersonalizado,
        precioMensual: v.precioPersonalizado ? 0 : Number(v.precioMensual ?? 0),
        precioAnual:   v.precioPersonalizado ? 0 : Number(v.precioAnual ?? 0),
        precioImplementacion: Number(v.precioImplementacion ?? 0),
        minUsuarios:   v.usuariosIlimitados ? null : (v.minUsuarios ?? null),
        maxUsuarios:   v.usuariosIlimitados ? null : Number(v.maxUsuarios ?? 0),
        minSucursales: v.sucursalesIlimitadas ? null : (v.minSucursales ?? null),
        maxSucursales: v.sucursalesIlimitadas ? null : Number(v.maxSucursales ?? 0),
        soporte:   v.soporte?.trim() ?? '',
        diasPrueba: Number(v.diasPrueba ?? 7),
        accent:    v.accent as LicenseAccent,
        destacado: !!v.destacado,
        activo:    !!v.activo,
        funciones: this.funciones(),
      });
      void this.router.navigate(['/licencias']);
    } catch {
      // el error ya quedó en la signal del servicio
    }
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
