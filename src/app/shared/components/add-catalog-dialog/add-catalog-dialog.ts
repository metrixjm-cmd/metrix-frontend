import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogEntry } from '../../../core/services/catalog.models';

@Component({
  selector: 'app-add-catalog-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-catalog-dialog.html',
})
export class AddCatalogDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly catalogSvc = inject(CatalogService);

  readonly catalogType = input<string>('PUESTO');
  readonly isOpen      = input<boolean>(false);

  @Output() readonly saved  = new EventEmitter<CatalogEntry>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly saving   = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.group({
    value: ['', [Validators.required, Validators.minLength(2)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    const newValue = this.form.get('value')!.value!.trim();
    
    // Verificar si el puesto ya existe localmente para evitar duplicados
    if (this.catalogType() === 'PUESTO') {
      const exists = this.catalogSvc.puestos().some(
        p => p.value.toLowerCase() === newValue.toLowerCase()
      );
      if (exists) {
        this.errorMsg.set('Ya existe ese puesto.');
        return;
      }
    }

    this.saving.set(true);
    this.errorMsg.set('');

    try {
      const entry = await this.catalogSvc.addEntry(
        this.catalogType(),
        newValue
      );
      this.form.reset();
      this.saved.emit(entry);
    } catch (err: unknown) {
      const e = err as { error?: { error?: string; message?: string } };
      this.errorMsg.set(e?.error?.error ?? e?.error?.message ?? 'Error al guardar el registro');
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.form.reset();
    this.errorMsg.set('');
    this.closed.emit();
  }
}
