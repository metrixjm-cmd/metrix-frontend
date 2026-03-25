import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingMaterialService } from '../../training/services/training-material.service';
import { CatalogService } from '../../../core/services/catalog.service';
import {
  MATERIAL_TYPE_COLORS,
  MATERIAL_TYPE_LABELS,
  MaterialType,
  TrainingMaterial,
} from '../../training/training-material.models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './material-list.html',
})
export class MaterialList implements OnInit {
  private readonly auth       = inject(AuthService);
  readonly materialSvc        = inject(TrainingMaterialService);
  readonly catalogSvc         = inject(CatalogService);
  private readonly fb         = inject(FormBuilder);

  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isAdmin   = computed(() => this.auth.hasRole('ADMIN'));

  // ── Labels ────────────────────────────────────────────────────────────────
  readonly typeLabels = MATERIAL_TYPE_LABELS;
  readonly typeColors = MATERIAL_TYPE_COLORS;
  readonly allTypes: MaterialType[] = ['PDF', 'VIDEO', 'IMAGE', 'LINK'];

  // ── Filtros ───────────────────────────────────────────────────────────────
  readonly filterType     = signal<MaterialType | ''>('');
  readonly filterCategory = signal('');

  // ── Modal de alta ─────────────────────────────────────────────────────────
  readonly showModal  = signal(false);
  readonly activeTab  = signal<'file' | 'link'>('file');

  // Form compartido para ambas tabs
  readonly form = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    category:    [''],
    tagsRaw:     [''],   // "tag1, tag2, tag3"
    // solo tab link
    url:         [''],
  });

  // Upload de archivo
  readonly selectedFile    = signal<File | null>(null);
  readonly fileError       = signal<string | null>(null);

  readonly ACCEPTED = 'application/pdf,video/mp4,video/webm,image/jpeg,image/png,image/webp';

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.catalogSvc.loadCategorias();
    this.materialSvc.loadTags();
    this.applyFilters();
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  applyFilters(): void {
    this.materialSvc.load({
      type:     this.filterType()  || undefined,
      category: this.filterCategory() || undefined,
    });
  }

  setType(type: MaterialType | ''): void {
    this.filterType.set(type);
    this.applyFilters();
  }

  setCategory(cat: string): void {
    this.filterCategory.set(cat);
    this.applyFilters();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openModal(): void {
    this.form.reset();
    this.selectedFile.set(null);
    this.fileError.set(null);
    this.activeTab.set('file');
    this.materialSvc.clearError();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  setTab(tab: 'file' | 'link'): void {
    this.activeTab.set(tab);
    this.fileError.set(null);
  }

  // ── Selección de archivo ──────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    input.value = '';
    this.fileError.set(null);
    if (!file) return;

    const maxBytes = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      const max = file.type.startsWith('video/') ? '50 MB' : '20 MB';
      this.fileError.set(`El archivo supera el límite permitido (${max}).`);
      return;
    }
    this.selectedFile.set(file);
  }

  fileTypeIcon(file: File): string {
    if (file.type === 'application/pdf')    return '📄';
    if (file.type.startsWith('video/'))     return '🎬';
    if (file.type.startsWith('image/'))     return '🖼';
    return '📎';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  parseTags(raw: string): string[] {
    return raw.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async submit(): Promise<void> {
    if (this.materialSvc.saving()) return;
    const v    = this.form.getRawValue();
    const tags = this.parseTags(v.tagsRaw ?? '');

    if (this.activeTab() === 'file') {
      const file = this.selectedFile();
      if (!file) { this.fileError.set('Selecciona un archivo.'); return; }
      if (!v.title?.trim()) { this.form.get('title')?.markAsTouched(); return; }
      try {
        await this.materialSvc.uploadFile(file, v.title!, v.description ?? '',
                                          v.category ?? '', tags);
        this.closeModal();
      } catch { /* error en signal */ }

    } else {
      if (!v.title?.trim() || !v.url?.trim()) {
        this.form.markAllAsTouched(); return;
      }
      try {
        await this.materialSvc.createLink({
          title:       v.title!,
          description: v.description ?? '',
          url:         v.url!,
          category:    v.category ?? '',
          tags,
        });
        this.closeModal();
      } catch { /* error en signal */ }
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async deleteMaterial(m: TrainingMaterial): Promise<void> {
    if (m.usageCount > 0) return;
    if (!confirm(`¿Eliminar "${m.title}"?`)) return;
    try { await this.materialSvc.delete(m.id); } catch { /* error en signal */ }
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  typeIcon(type: MaterialType): string {
    return { PDF: '📄', VIDEO: '🎬', IMAGE: '🖼', LINK: '🔗' }[type];
  }

  openUrl(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
