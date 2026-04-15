import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-categoria-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './categoria-list.html',
})
export class CategoriaList implements OnInit {
  private readonly authSvc = inject(AuthService);
  readonly catalogSvc = inject(CatalogService);
  private readonly fb = inject(FormBuilder);

  readonly isManager = () => this.authSvc.hasRole('ADMIN') || this.authSvc.hasRole('GERENTE');

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly showCreateForm = signal(false);

  readonly createForm = this.fb.group({
    value: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.catalogSvc.loadCategorias();
  }

  startCreate(): void {
    this.createForm.reset();
    this.showCreateForm.set(true);
    this.error.set(null);
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
    this.createForm.reset();
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid || this.saving()) return;

    const newValue = this.createForm.getRawValue().value!.trim();
    const exists = this.catalogSvc.categorias().some(
      categoria => categoria.value.toLowerCase() === newValue.toLowerCase()
    );

    if (exists) {
      this.error.set('Ya existe esa categoria.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.catalogSvc.addEntry('CATEGORIA', newValue);
      await this.catalogSvc.loadCategorias();
      this.showCreateForm.set(false);
      this.createForm.reset();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al crear la categoria');
    } finally {
      this.saving.set(false);
    }
  }
}
