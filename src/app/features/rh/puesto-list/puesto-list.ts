import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../auth/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogEntry } from '../../../core/services/catalog.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-puesto-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './puesto-list.html',
})
export class PuestoList implements OnInit {
  private readonly authSvc    = inject(AuthService);
  readonly catalogSvc         = inject(CatalogService);
  private readonly http       = inject(HttpClient);
  private readonly fb         = inject(FormBuilder);

  readonly isAdmin   = () => this.authSvc.hasRole('ADMIN');
  readonly isManager = () => this.authSvc.hasRole('ADMIN') || this.authSvc.hasRole('GERENTE');

  readonly saving  = signal(false);
  readonly error   = signal<string | null>(null);

  // ── Inline create form ───────────────────────────────────────────────
  readonly showCreateForm = signal(false);
  readonly createForm = this.fb.group({
    value: ['', [Validators.required, Validators.minLength(2)]],
  });

  // ── Inline edit state ────────────────────────────────────────────────
  readonly editingId   = signal<string | null>(null);
  readonly editForm    = this.fb.group({
    value: ['', [Validators.required, Validators.minLength(2)]],
  });

  // ── Delete confirm ───────────────────────────────────────────────────
  readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.catalogSvc.loadPuestos();
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
    
    const v = this.createForm.getRawValue();
    const newValue = v.value!.trim();
    
    const exists = this.catalogSvc.puestos().some(
      p => p.value.toLowerCase() === newValue.toLowerCase()
    );
    if (exists) {
      this.error.set('Ya existe ese puesto.');
      return;
    }
    
    this.saving.set(true);
    this.error.set(null);

    try {
      await this.catalogSvc.addEntry('PUESTO', newValue);
      this.catalogSvc.loadPuestos();
      this.showCreateForm.set(false);
      this.createForm.reset();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al crear el puesto');
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(entry: CatalogEntry): void {
    this.editingId.set(entry.id);
    this.editForm.patchValue({ value: entry.value });
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.reset();
  }

  async submitEdit(): Promise<void> {
    if (this.editForm.invalid || this.saving()) return;
    const id = this.editingId();
    if (!id) return;
    
    const v = this.editForm.getRawValue();
    const newValue = v.value!.trim();

    // Validar duplicado al editar (ignorando el mismo puesto que se está editando)
    const exists = this.catalogSvc.puestos().some(
      p => p.id !== id && p.value.toLowerCase() === newValue.toLowerCase()
    );
    if (exists) {
      this.error.set('Ya existe ese puesto.');
      return;
    }
    
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.http.put(
        `${environment.apiUrl}/catalogs/PUESTO/${id}`,
        { value: newValue }
      ).toPromise();
      this.catalogSvc.loadPuestos();
      this.editingId.set(null);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al actualizar el puesto');
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  async executeDelete(): Promise<void> {
    const id = this.deletingId();
    if (!id) return;
    this.saving.set(true);
    try {
      await this.http.delete(`${environment.apiUrl}/catalogs/PUESTO/${id}`).toPromise();
      this.catalogSvc.loadPuestos();
      this.deletingId.set(null);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Error al eliminar el puesto');
    } finally {
      this.saving.set(false);
    }
  }
}
