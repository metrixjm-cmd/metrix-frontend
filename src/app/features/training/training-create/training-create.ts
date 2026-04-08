import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { TrainingService } from '../services/training.service';
import { TrainingMaterialService } from '../services/training-material.service';
import { RhService } from '../../rh/services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CatalogService } from '../../../core/services/catalog.service';
import {
  CreateFromTemplateRequest,
  CreateTrainingRequest,
  TRAINING_LEVELS,
  TRAINING_LEVEL_LABELS,
  TrainingTemplateSummary,
  MATERIAL_TYPE_ICONS,
} from '../training.models';
import { TrainingMaterial, MaterialType, MATERIAL_TYPE_LABELS } from '../training-material.models';

type CreateMode = 'scratch' | 'template';

@Component({
  selector: 'app-training-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './training-create.html',
})
export class TrainingCreate implements OnInit {
  private readonly authSvc     = inject(AuthService);
  readonly trainingSvc         = inject(TrainingService);
  readonly materialSvc         = inject(TrainingMaterialService);
  private readonly rhSvc       = inject(RhService);
  private readonly settingsSvc = inject(SettingsService);
  readonly catalogSvc          = inject(CatalogService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly saving      = this.trainingSvc.saving;
  readonly error       = this.trainingSvc.error;
  readonly levels      = TRAINING_LEVELS;
  readonly levelLabels = TRAINING_LEVEL_LABELS;
  readonly materialIcons = MATERIAL_TYPE_ICONS;
  readonly typeLabels  = MATERIAL_TYPE_LABELS;
  readonly allTypes: MaterialType[] = ['PDF', 'VIDEO', 'IMAGE', 'LINK'];
  readonly users       = this.rhSvc.users;
  readonly stores      = this.settingsSvc.stores;
  readonly templates   = this.trainingSvc.templates;
  readonly turnos      = ['TODOS', 'MATUTINO', 'VESPERTINO', 'NOCTURNO'];

  readonly isAdmin   = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly todayDate = new Date().toISOString().slice(0, 10);
  readonly timeOptions = this.buildTimeOptions();

  // ── Modo de creación ──────────────────────────────────────────────────────
  readonly mode             = signal<CreateMode>('scratch');
  readonly selectedTemplate = signal<TrainingTemplateSummary | null>(null);

  // ── Materiales ────────────────────────────────────────────────────────────
  readonly selectedMaterials = signal<TrainingMaterial[]>([]);
  readonly showSelectModal   = signal(false);
  readonly showCreateModal   = signal(false);

  readonly filterType        = signal<MaterialType | ''>('');
  readonly filterCategory    = signal('');

  readonly activeTab         = signal<'file' | 'link'>('file');
  readonly selectedFile      = signal<File | null>(null);
  readonly fileError         = signal<string | null>(null);
  readonly ACCEPTED          = 'application/pdf,video/mp4,video/webm,image/jpeg,image/png,image/webp';

  readonly materialForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    url:         [''],
  });

  // ── Formulario (desde cero) ───────────────────────────────────────────────
  readonly form = this.fb.group({
    title:           ['', [Validators.required, Validators.minLength(3)]],
    description:     ['', Validators.required],
    level:           ['BASICO', Validators.required],
    durationHours:   [1, [Validators.required, Validators.min(1), Validators.max(40)]],
    storeId:         [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:           ['TODOS', Validators.required],
    assignedUserIds: [[] as string[], Validators.required],
    dueDate:         ['', Validators.required],
    dueTime:         ['', Validators.required],
  });

  // ── Formulario mínimo (desde plantilla) ───────────────────────────────────
  readonly templateForm = this.fb.group({
    storeId:         [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:           ['TODOS', Validators.required],
    assignedUserIds: [[] as string[], Validators.required],
    dueDate:         ['', Validators.required],
    dueTime:         ['', Validators.required],
  });

  readonly formShift = toSignal(this.form.controls.shift.valueChanges, { initialValue: 'TODOS' });
  readonly filteredUsers = computed(() => {
    const shift = this.formShift();
    const all = this.users();
    return shift === 'TODOS' ? all : all.filter(u => u.turno === shift);
  });

  readonly templateFormShift = toSignal(this.templateForm.controls.shift.valueChanges, { initialValue: 'TODOS' });
  readonly templateFilteredUsers = computed(() => {
    const shift = this.templateFormShift();
    const all = this.users();
    return shift === 'TODOS' ? all : all.filter(u => u.turno === shift);
  });

  // ── Selección de Usuarios en Tabla ────────────────────────────────────────

  toggleUser(id: string, isTemplate: boolean): void {
    const form = isTemplate ? this.templateForm : this.form;
    const control = form.controls.assignedUserIds;
    const current = control.value as string[];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      control.setValue(current.filter(x => x !== id));
    } else {
      control.setValue([...current, id]);
    }
    control.markAsTouched();
  }

  toggleAllUsers(isTemplate: boolean, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const control = isTemplate ? this.templateForm.controls.assignedUserIds : this.form.controls.assignedUserIds;
    if (checked) {
      const users = isTemplate ? this.templateFilteredUsers() : this.filteredUsers();
      control.setValue(users.map(u => u.id));
    } else {
      control.setValue([]);
    }
    control.markAsTouched();
  }

  isUserSelected(id: string, isTemplate: boolean): boolean {
    const control = isTemplate ? this.templateForm.controls.assignedUserIds : this.form.controls.assignedUserIds;
    const current = control.value as string[];
    return current.includes(id);
  }

  isAllUsersSelected(isTemplate: boolean): boolean {
    const control = isTemplate ? this.templateForm.controls.assignedUserIds : this.form.controls.assignedUserIds;
    const current = control.value as string[];
    const users = isTemplate ? this.templateFilteredUsers() : this.filteredUsers();
    return users.length > 0 && current.length === users.length;
  }

  ngOnInit(): void {
    this.trainingSvc.loadTemplateSummaries();
    const user = this.authSvc.currentUser();
    if (this.isAdmin()) {
      this.settingsSvc.loadAll();
      this.form.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.form.get('assignedUserIds')!.reset([]); this.rhSvc.loadUsersByStore(storeId); }
      });
      this.templateForm.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.templateForm.get('assignedUserIds')!.reset([]); this.rhSvc.loadUsersByStore(storeId); }
      });
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    } else {
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
      
      this.form.get('shift')!.valueChanges.subscribe(() => {
        this.form.get('assignedUserIds')!.reset([]);
      });
      this.templateForm.get('shift')!.valueChanges.subscribe(() => {
        this.templateForm.get('assignedUserIds')!.reset([]);
      });
    }
  }

  // ── Modo ──────────────────────────────────────────────────────────────────

  setMode(m: CreateMode): void {
    this.mode.set(m);
    this.selectedTemplate.set(null);
    this.trainingSvc.clearError();
  }

  selectTemplate(t: TrainingTemplateSummary): void {
    this.selectedTemplate.set(t);
  }

  // ── Materiales Logic ──────────────────────────────────────────────────────

  removeMaterial(m: TrainingMaterial): void {
    this.selectedMaterials.update(list => list.filter(x => x.id !== m.id));
  }

  openSelectModal(): void {
    this.catalogSvc.loadCategorias();
    this.applyFilters();
    this.showSelectModal.set(true);
  }

  closeSelectModal(): void {
    this.showSelectModal.set(false);
  }

  applyFilters(): void {
    this.materialSvc.load({
      type: this.filterType() || undefined,
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

  toggleSelection(m: TrainingMaterial): void {
    this.selectedMaterials.update(list => {
      if (list.some(x => x.id === m.id)) {
        return list.filter(x => x.id !== m.id);
      } else {
        return [...list, m];
      }
    });
  }

  isSelected(m: TrainingMaterial): boolean {
    return this.selectedMaterials().some(x => x.id === m.id);
  }

  openCreateModal(): void {
    this.materialForm.reset();
    this.selectedFile.set(null);
    this.fileError.set(null);
    this.activeTab.set('file');
    this.materialSvc.clearError();
    this.catalogSvc.loadCategorias();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  setTab(tab: 'file' | 'link'): void {
    this.activeTab.set(tab);
    this.fileError.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
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
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type.startsWith('image/')) return '🖼';
    return '📎';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  buildTimeOptions(): string[] {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 15) {
        options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return options;
  }

  private toIsoDueAt(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  parseTags(raw: string): string[] {
    return raw.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  async submitMaterial(): Promise<void> {
    if (this.materialSvc.saving()) return;
    const v = this.materialForm.getRawValue();

    if (this.activeTab() === 'file') {
      const file = this.selectedFile();
      if (!file) { this.fileError.set('Selecciona un archivo.'); return; }
      if (!v.title?.trim()) { this.materialForm.get('title')?.markAsTouched(); return; }
      try {
        const m = await this.materialSvc.uploadFile(file, v.title!, v.description ?? '', '', []);
        this.selectedMaterials.update(list => [...list, m]);
        this.closeCreateModal();
      } catch { /* signal error */ }
    } else {
      if (!v.title?.trim() || !v.url?.trim()) {
        this.materialForm.markAllAsTouched(); return;
      }
      try {
        const m = await this.materialSvc.createLink({
          title: v.title!,
          description: v.description ?? '',
          url: v.url!,
          category: '',
          tags: [],
        });
        this.selectedMaterials.update(list => [...list, m]);
        this.closeCreateModal();
      } catch { /* signal error */ }
    }
  }

  typeIcon(type: MaterialType): string {
    return { PDF: '📄', VIDEO: '🎬', IMAGE: '🖼', LINK: '🔗' }[type];
  }

  // ── Submit desde cero ─────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const materialIds = this.selectedMaterials().map(m => m.id);
    
    try {
      for (const userId of v.assignedUserIds!) {
        const req: CreateTrainingRequest = {
          title:          v.title!,
          description:    v.description!,
          level:          v.level as CreateTrainingRequest['level'],
          durationHours:  Number(v.durationHours),
          assignedUserId: userId,
          storeId:        v.storeId!,
          shift:          v.shift!,
          dueAt:          this.toIsoDueAt(v.dueDate!, v.dueTime!),
          materialIds:    materialIds,
        };
        await this.trainingSvc.create(req);
      }
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }

  // ── Submit desde plantilla ────────────────────────────────────────────────

  async onSubmitFromTemplate(): Promise<void> {
    const tmpl = this.selectedTemplate();
    if (!tmpl || this.templateForm.invalid || this.saving()) return;
    const v = this.templateForm.getRawValue();
    
    try {
      for (const userId of v.assignedUserIds!) {
        const req: CreateFromTemplateRequest = {
          assignedUserId: userId,
          storeId:        v.storeId!,
          shift:          v.shift!,
          dueAt:          this.toIsoDueAt(v.dueDate!, v.dueTime!),
        };
        await this.trainingSvc.createFromTemplate(tmpl.id, req);
      }
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }
}
