import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { TrainingTemplateService } from '../../training/services/training-template.service';
import { TrainingMaterialService } from '../../training/services/training-material.service';
import {
  CreateTrainingTemplateRequest,
  TemplateMaterialRequest,
  TrainingTemplate,
} from '../../training/training-template.models';
import { TrainingMaterial } from '../../training/training-material.models';
import {
  TRAINING_LEVELS,
  TRAINING_LEVEL_LABELS,
  TrainingLevel,
} from '../../training/training.models';

type ModalTab = 'info' | 'materiales';

// Material seleccionado en el picker (con datos para mostrar)
interface PickedMaterial {
  materialId: string;
  title:      string;
  type:       string;
  required:   boolean;
  notes:      string;
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './template-list.html',
})
export class TemplateList implements OnInit {
  private readonly auth      = inject(AuthService);
  readonly templateSvc       = inject(TrainingTemplateService);
  readonly materialSvc       = inject(TrainingMaterialService);
  readonly catalogSvc        = inject(CatalogService);
  private readonly fb        = inject(FormBuilder);

  readonly isAdmin   = computed(() => this.auth.hasRole('ADMIN'));
  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  readonly levels      = TRAINING_LEVELS;
  readonly levelLabels = TRAINING_LEVEL_LABELS;

  // ── Filtros de lista ──────────────────────────────────────────────────────
  readonly filterCategory = signal('');
  readonly filterLevel    = signal<TrainingLevel | ''>('');

  // ── Modal ─────────────────────────────────────────────────────────────────
  readonly showModal    = signal(false);
  readonly modalTab     = signal<ModalTab>('info');
  readonly editingId    = signal<string | null>(null);

  // Formulario de datos generales
  readonly form = this.fb.group({
    title:         ['', [Validators.required, Validators.minLength(3)]],
    description:   [''],
    category:      [''],
    level:         ['BASICO', Validators.required],
    durationHours: [2, [Validators.required, Validators.min(1), Validators.max(40)]],
    minPassGrade:  [7, [Validators.required, Validators.min(0), Validators.max(10)]],
    tagsRaw:       [''],
  });

  // ── Selector de materiales ────────────────────────────────────────────────
  readonly pickedMaterials = signal<PickedMaterial[]>([]);
  readonly materialSearch  = signal('');

  readonly filteredBankMaterials = computed(() => {
    const q       = this.materialSearch().toLowerCase();
    const picked  = new Set(this.pickedMaterials().map(p => p.materialId));
    return this.materialSvc.materials()
      .filter(m => !picked.has(m.id))
      .filter(m => !q || m.title.toLowerCase().includes(q)
                       || m.category?.toLowerCase().includes(q)
                       || m.tags.some(t => t.toLowerCase().includes(q)));
  });

  readonly materialTypeIcon: Record<string, string> = {
    PDF: '📄', VIDEO: '🎬', IMAGE: '🖼', LINK: '🔗',
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.catalogSvc.loadCategorias();
    this.templateSvc.load();
    this.materialSvc.load({ size: 100 });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  applyFilters(): void {
    this.templateSvc.load({
      category: this.filterCategory() || undefined,
      level:    (this.filterLevel() || undefined) as TrainingLevel | undefined,
    });
  }

  setCategory(c: string): void { this.filterCategory.set(c); this.applyFilters(); }
  setLevel(l: string): void    { this.filterLevel.set(l as TrainingLevel | ''); this.applyFilters(); }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ level: 'BASICO', durationHours: 2, minPassGrade: 7 });
    this.pickedMaterials.set([]);
    this.materialSearch.set('');
    this.modalTab.set('info');
    this.templateSvc.clearError();
    this.showModal.set(true);
  }

  openEdit(t: TrainingTemplate): void {
    this.editingId.set(t.id);
    this.form.patchValue({
      title:         t.title,
      description:   t.description ?? '',
      category:      t.category ?? '',
      level:         t.level,
      durationHours: t.durationHours,
      minPassGrade:  t.minPassGrade,
      tagsRaw:       t.tags.join(', '),
    });
    this.pickedMaterials.set(
      t.materials
        .sort((a, b) => a.order - b.order)
        .map(m => ({
          materialId: m.materialId,
          title:      m.title,
          type:       m.type,
          required:   m.required,
          notes:      m.notes ?? '',
        }))
    );
    this.materialSearch.set('');
    this.modalTab.set('info');
    this.templateSvc.clearError();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  // ── Selector de materiales ────────────────────────────────────────────────

  addMaterial(m: TrainingMaterial): void {
    this.pickedMaterials.update(list => [...list, {
      materialId: m.id,
      title:      m.title,
      type:       m.type,
      required:   true,
      notes:      '',
    }]);
  }

  removeMaterial(materialId: string): void {
    this.pickedMaterials.update(list => list.filter(p => p.materialId !== materialId));
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.pickedMaterials.update(list => {
      const next = [...list];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  moveDown(index: number): void {
    const list = this.pickedMaterials();
    if (index >= list.length - 1) return;
    this.pickedMaterials.update(l => {
      const next = [...l];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  toggleRequired(index: number): void {
    this.pickedMaterials.update(list => {
      const next = [...list];
      next[index] = { ...next[index], required: !next[index].required };
      return next;
    });
  }

  updateNotes(index: number, notes: string): void {
    this.pickedMaterials.update(list => {
      const next = [...list];
      next[index] = { ...next[index], notes };
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async submit(): Promise<void> {
    if (this.form.invalid || this.templateSvc.saving()) return;
    if (this.pickedMaterials().length === 0) {
      this.modalTab.set('materiales');
      return;
    }

    const v = this.form.getRawValue();
    const materials: TemplateMaterialRequest[] = this.pickedMaterials().map((p, i) => ({
      materialId: p.materialId,
      order:      i + 1,
      required:   p.required,
      notes:      p.notes,
    }));

    const req: CreateTrainingTemplateRequest = {
      title:         v.title!,
      description:   v.description ?? '',
      category:      v.category ?? '',
      level:         v.level as TrainingLevel,
      durationHours: Number(v.durationHours),
      minPassGrade:  Number(v.minPassGrade),
      materials,
      tags: (v.tagsRaw ?? '').split(',').map((t: string) => t.trim()).filter((t: string) => t),
    };

    try {
      const id = this.editingId();
      if (id) {
        await this.templateSvc.update(id, req);
      } else {
        await this.templateSvc.create(req);
      }
      this.closeModal();
    } catch { /* error en signal */ }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async deleteTemplate(t: TrainingTemplate): Promise<void> {
    if (!confirm(`¿Eliminar la plantilla "${t.title}"?`)) return;
    try { await this.templateSvc.delete(t.id); } catch { /* error en signal */ }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  levelBadgeClass(level: TrainingLevel): string {
    return ({ BASICO: 'bg-stone-100 text-stone-600', INTERMEDIO: 'bg-blue-50 text-blue-600', AVANZADO: 'bg-purple-100 text-purple-700' })[level];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
