import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { RoleContext } from '../../../shared/services/role-context.service';
import { TrainingService } from '../services/training.service';
import { TrainingMaterialService } from '../services/training-material.service';
import { RhService } from '../../rh/services/rh.service';
import { UserProfile } from '../../rh/rh.models';
import { SettingsService } from '../../settings/services/settings.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { ExamResponse } from '../../trainer/trainer.models';
import {
  CreateFromTemplateRequest,
  CreateTrainingRequest,
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
  private readonly role        = inject(RoleContext);
  readonly trainingSvc         = inject(TrainingService);
  readonly materialSvc         = inject(TrainingMaterialService);
  private readonly rhSvc       = inject(RhService);
  private readonly settingsSvc = inject(SettingsService);
  readonly catalogSvc          = inject(CatalogService);
  private readonly trainerSvc  = inject(TrainerService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly saving      = this.trainingSvc.saving;
  readonly error       = this.trainingSvc.error;
  readonly materialIcons = MATERIAL_TYPE_ICONS;
  readonly typeLabels  = MATERIAL_TYPE_LABELS;
  readonly allTypes: MaterialType[] = ['PDF', 'VIDEO', 'IMAGE', 'LINK'];
  readonly users       = this.rhSvc.users;
  readonly stores      = this.settingsSvc.stores;
  readonly templates   = this.trainingSvc.templates;
  readonly turnos      = ['TODOS', 'MATUTINO', 'VESPERTINO', 'NOCTURNO'];
  readonly sourceExam  = signal<ExamResponse | null>(null);

  readonly isAdmin   = this.role.isAdmin;
  readonly todayDate = new Date().toISOString().slice(0, 10);
  readonly currentStoreName = computed(() => {
    const storeId = this.authSvc.currentUser()?.storeId;
    if (!storeId) return 'Sucursal no disponible';
    const store = this.stores().find(s => s.id === storeId);
    return store?.nombre ?? storeId;
  });

  // ── Modo de creación ──────────────────────────────────────────────────────
  readonly mode             = signal<CreateMode>('scratch');
  readonly selectedTemplate = signal<TrainingTemplateSummary | null>(null);

  // ── Materiales ────────────────────────────────────────────────────────────
  readonly selectedMaterials = signal<TrainingMaterial[]>([]);
  readonly showSelectModal   = signal(false);
  readonly showCreateModal   = signal(false);
  readonly assignmentLoading = signal(false);
  readonly assignmentError   = signal('');
  readonly managerOptions     = signal<UserProfile[]>([]);
  readonly executorOptions    = signal<UserProfile[]>([]);
  readonly assignmentMode     = signal<'MANAGERS' | 'EXECUTORS'>('MANAGERS');
  readonly managerSearch      = signal('');
  readonly executorSearch     = signal('');
  readonly selectedManagerIds  = signal<string[]>([]);
  readonly selectedExecutorIds = signal<string[]>([]);

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
    storeId:         [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:           ['TODOS', Validators.required],
    assignedUserIds: [[] as string[], Validators.required],
    startDate:       ['', Validators.required],
    endDate:         ['', Validators.required],
  });

  // ── Formulario mínimo (reutilizar operación) ──────────────────────────────
  readonly templateForm = this.fb.group({
    storeId:         [this.authSvc.currentUser()?.storeId ?? '', Validators.required],
    shift:           ['TODOS', Validators.required],
    assignedUserIds: [[] as string[], Validators.required],
    startDate:       ['', Validators.required],
    endDate:         ['', Validators.required],
  });

  // ── Time picker 12h (scratch) ─────────────────────────────────────────────
  readonly scratchHour   = signal(12);
  readonly scratchMinute = signal(0);
  readonly scratchPeriod = signal<'AM' | 'PM'>('AM');

  // ── Time picker 12h (template) ────────────────────────────────────────────
  readonly tmplHour   = signal(12);
  readonly tmplMinute = signal(0);
  readonly tmplPeriod = signal<'AM' | 'PM'>('AM');

  readonly formShift      = toSignal(this.form.controls.shift.valueChanges,      { initialValue: 'TODOS' });
  readonly formStartDate  = toSignal(this.form.controls.startDate.valueChanges,  { initialValue: '' });
  readonly formEndDate    = toSignal(this.form.controls.endDate.valueChanges,    { initialValue: '' });
  readonly tmplStartDate  = toSignal(this.templateForm.controls.startDate.valueChanges, { initialValue: '' });
  readonly tmplEndDate    = toSignal(this.templateForm.controls.endDate.valueChanges,   { initialValue: '' });
  readonly isExamAssignment = computed(() => this.sourceExam() !== null);
  readonly assignmentStoreId = computed(() => this.sourceExam()?.storeId ?? this.form.getRawValue().storeId ?? this.authSvc.currentUser()?.storeId ?? '');
  readonly filteredManagerOptions = computed(() => {
    const q = this.managerSearch().trim().toLowerCase();
    return this.managerOptions().filter(user => {
      if (!q) return true;
      return [user.nombre, user.numeroUsuario, user.puesto]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(q));
    });
  });
  readonly selectedManagers = computed(() =>
    this.managerOptions().filter(user => this.selectedManagerIds().includes(user.id))
  );
  readonly filteredExecutors = computed(() => {
    const selectedManagers = this.selectedManagerIds();
    const q = this.executorSearch().trim().toLowerCase();
    return this.executorOptions()
      .filter(user => {
        const ownerId = user.managerOwnerId ?? '';
        const ownerNumero = user.managerOwnerNumeroUsuario ?? '';
        const visibleByManager = selectedManagers.length === 0
          ? false
          : selectedManagers.includes(ownerId)
            || selectedManagers.includes(ownerNumero);
        if (!visibleByManager) return false;
        if (!q) return true;
        return [user.nombre, user.numeroUsuario, user.puesto, user.managerOwnerNumeroUsuario ?? '']
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(q));
      });
  });
  readonly selectedRecipientsCount = computed(() => this.assignedRecipientIds().length);

  readonly durationDays = computed(() => {
    const s = this.formStartDate(), e = this.formEndDate();
    if (!s || !e) return 0;
    return Math.max(1, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
  });

  readonly dateRangeValid = computed(() => {
    const s = this.formStartDate(), e = this.formEndDate();
    return !s || !e || new Date(e) >= new Date(s);
  });

  readonly tmplDurationDays = computed(() => {
    const s = this.tmplStartDate(), e = this.tmplEndDate();
    if (!s || !e) return 0;
    return Math.max(1, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
  });

  readonly tmplDateRangeValid = computed(() => {
    const s = this.tmplStartDate(), e = this.tmplEndDate();
    return !s || !e || new Date(e) >= new Date(s);
  });
  readonly assignedRecipientIds = computed(() =>
    this.assignmentMode() === 'MANAGERS'
      ? this.selectedManagerIds()
      : this.selectedExecutorIds()
  );
  readonly assignableUsers = computed(() => {
    const all = this.users().filter(u => u.activo);
    if (this.isAdmin()) {
      return all.filter(u => (u.roles ?? []).some(role => role === 'GERENTE' || role === 'ROLE_GERENTE'));
    }
    return all.filter(u => (u.roles ?? []).some(role => role === 'EJECUTADOR' || role === 'ROLE_EJECUTADOR'));
  });
  readonly filteredUsers = computed(() => {
    const shift = this.formShift();
    const all = this.assignableUsers();
    return shift === 'TODOS' ? all : all.filter(u => u.turno === shift);
  });

  readonly templateFormShift = toSignal(this.templateForm.controls.shift.valueChanges, { initialValue: 'TODOS' });
  readonly templateFilteredUsers = computed(() => {
    const shift = this.templateFormShift();
    const all = this.assignableUsers();
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

  setAssignmentMode(mode: 'MANAGERS' | 'EXECUTORS'): void {
    if (this.assignmentMode() === mode) return;
    this.assignmentMode.set(mode);
    this.assignmentError.set('');
    this.selectedManagerIds.set([]);
    this.selectedExecutorIds.set([]);
    this.form.controls.assignedUserIds.setValue([]);
    if (mode === 'EXECUTORS' && this.isExamAssignment() && this.isAdmin()) {
      void this.refreshExecutorOptions();
    }
  }

  private syncAssignedRecipients(): void {
    this.form.controls.assignedUserIds.setValue(this.assignedRecipientIds());
    this.form.controls.assignedUserIds.markAsTouched();
  }

  private async refreshExecutorOptions(): Promise<void> {
    const storeId = this.assignmentStoreId();
    const managerIds = this.selectedManagerIds();
    if (!this.isExamAssignment() || !this.isAdmin() || !storeId || managerIds.length === 0) {
      this.executorOptions.set([]);
      this.selectedExecutorIds.set([]);
      this.syncAssignedRecipients();
      return;
    }

    this.assignmentLoading.set(true);
    this.assignmentError.set('');
    try {
      const executors = await this.rhSvc.getExecutorsByManagers(storeId, managerIds);
      this.executorOptions.set(executors);
      this.selectedExecutorIds.update(ids => ids.filter(id => executors.some(u => u.id === id)));
      this.syncAssignedRecipients();
    } catch {
      this.assignmentError.set('No se pudieron cargar los ejecutadores de los gerentes seleccionados.');
      this.executorOptions.set([]);
      this.selectedExecutorIds.set([]);
      this.syncAssignedRecipients();
    } finally {
      this.assignmentLoading.set(false);
    }
  }

  async toggleManagerSelection(id: string, checked?: boolean): Promise<void> {
    const current = new Set(this.selectedManagerIds());
    const shouldSelect = checked ?? !current.has(id);
    if (shouldSelect) current.add(id);
    else current.delete(id);
    this.selectedManagerIds.set([...current]);
    this.syncAssignedRecipients();
    if (this.assignmentMode() === 'EXECUTORS' && this.isExamAssignment() && this.isAdmin()) {
      await this.refreshExecutorOptions();
    }
  }

  async toggleAllManagers(checked: boolean): Promise<void> {
    this.selectedManagerIds.set(checked ? this.filteredManagerOptions().map(u => u.id) : []);
    this.syncAssignedRecipients();
    if (this.assignmentMode() === 'EXECUTORS' && this.isExamAssignment() && this.isAdmin()) {
      await this.refreshExecutorOptions();
    }
  }

  onToggleAllManagers(event: Event): void {
    void this.toggleAllManagers((event.target as HTMLInputElement).checked);
  }

  toggleExecutorSelection(id: string): void {
    const current = new Set(this.selectedExecutorIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.selectedExecutorIds.set([...current]);
    this.syncAssignedRecipients();
  }

  toggleAllExecutors(checked: boolean): void {
    this.selectedExecutorIds.set(checked ? this.filteredExecutors().map(u => u.id) : []);
    this.syncAssignedRecipients();
  }

  onToggleAllExecutors(event: Event): void {
    this.toggleAllExecutors((event.target as HTMLInputElement).checked);
  }

  isManagerSelected(id: string): boolean {
    return this.selectedManagerIds().includes(id);
  }

  isExecutorSelected(id: string): boolean {
    return this.selectedExecutorIds().includes(id);
  }

  isAllManagersSelected(): boolean {
    const items = this.filteredManagerOptions();
    return items.length > 0 && items.every(u => this.selectedManagerIds().includes(u.id));
  }

  isAllExecutorsSelected(): boolean {
    const items = this.filteredExecutors();
    return items.length > 0 && items.every(u => this.selectedExecutorIds().includes(u.id));
  }

  executorsForManager(manager: UserProfile): UserProfile[] {
    return this.filteredExecutors().filter(user =>
      user.managerOwnerId === manager.id || user.managerOwnerNumeroUsuario === manager.numeroUsuario
    );
  }

  toggleManagerExecutors(manager: UserProfile, checked: boolean): void {
    const current = new Set(this.selectedExecutorIds());
    const ids = this.executorsForManager(manager).map(user => user.id);
    if (checked) {
      ids.forEach(id => current.add(id));
    } else {
      ids.forEach(id => current.delete(id));
    }
    this.selectedExecutorIds.set([...current]);
    this.syncAssignedRecipients();
  }

  isAllExecutorsForManagerSelected(manager: UserProfile): boolean {
    const ids = this.executorsForManager(manager).map(user => user.id);
    return ids.length > 0 && ids.every(id => this.selectedExecutorIds().includes(id));
  }

  onToggleManagerExecutors(manager: UserProfile, event: Event): void {
    this.toggleManagerExecutors(manager, (event.target as HTMLInputElement).checked);
  }

  ngOnInit(): void {
    const examId = this.route.snapshot.queryParamMap.get('examId');
    if (examId) {
      this.loadSourceExam(examId);
    }
    this.trainingSvc.loadTemplateSummaries();
    if (this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }
    const user = this.authSvc.currentUser();
    if (!examId && this.isAdmin()) {
      this.form.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.form.get('assignedUserIds')!.reset([]); this.rhSvc.loadUsersByStore(storeId); }
      });
      this.templateForm.get('storeId')!.valueChanges.subscribe(storeId => {
        if (storeId) { this.templateForm.get('assignedUserIds')!.reset([]); this.rhSvc.loadUsersByStore(storeId); }
      });
      if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    } else if (examId && user?.storeId) {
      this.rhSvc.loadUsersByStore(user.storeId);
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

  private async loadSourceExam(examId: string): Promise<void> {
    try {
      const exam = await this.trainerSvc.getById(examId);
      this.sourceExam.set(exam);
      this.assignmentMode.set(this.isAdmin() ? 'MANAGERS' : 'EXECUTORS');
      this.form.get('storeId')?.disable({ emitEvent: false });
      this.form.patchValue({
        title: exam.title,
        description: exam.description || `Examen asignado: ${exam.title}`,
        storeId: exam.storeId,
      });
      if (this.isAdmin()) {
        await this.loadExamRecipientsForAdmin();
      } else {
        this.rhSvc.loadUsersByStore(exam.storeId);
      }
    } catch {
      // El formulario sigue disponible aunque el examen no pueda cargarse.
    }
  }

  private async loadExamRecipientsForAdmin(): Promise<void> {
    const storeId = this.assignmentStoreId();
    if (!storeId) return;
    this.assignmentLoading.set(true);
    this.assignmentError.set('');
    try {
      const managers = await this.rhSvc.getManagersByStore(storeId);
      this.managerOptions.set(managers);
      this.executorOptions.set([]);
      this.selectedManagerIds.set([]);
      this.selectedExecutorIds.set([]);
      this.syncAssignedRecipients();
    } catch {
      this.assignmentError.set('No se pudieron cargar los gerentes disponibles.');
      this.managerOptions.set([]);
    } finally {
      this.assignmentLoading.set(false);
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

  padNum(n: number): string {
    return String(n).padStart(2, '0');
  }

  private to24h(hour: number, minute: number, period: 'AM' | 'PM'): string {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  incrHour(isTemplate: boolean): void {
    const sig = isTemplate ? this.tmplHour : this.scratchHour;
    sig.update(h => (h % 12) + 1);
  }

  decrHour(isTemplate: boolean): void {
    const sig = isTemplate ? this.tmplHour : this.scratchHour;
    sig.update(h => h === 1 ? 12 : h - 1);
  }

  incrMinute(isTemplate: boolean): void {
    const sig = isTemplate ? this.tmplMinute : this.scratchMinute;
    sig.update(m => (m + 5) % 60);
  }

  decrMinute(isTemplate: boolean): void {
    const sig = isTemplate ? this.tmplMinute : this.scratchMinute;
    sig.update(m => m === 0 ? 55 : m - 5);
  }

  togglePeriod(isTemplate: boolean): void {
    const sig = isTemplate ? this.tmplPeriod : this.scratchPeriod;
    sig.update(p => p === 'AM' ? 'PM' : 'AM');
  }

  private toIsoDueAt(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  private buildAssignmentGroupId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    if (this.form.invalid || !this.dateRangeValid() || this.saving()) return;
    const v = this.form.getRawValue();
    const materialIds = this.selectedMaterials().map(m => m.id);
    const assignmentGroupId = this.buildAssignmentGroupId();

    try {
      for (const userId of v.assignedUserIds!) {
        const req: CreateTrainingRequest = {
          title:          v.title!,
          description:    v.description!,
          assignedUserId: userId,
          storeId:        v.storeId!,
          shift:          v.shift!,
          startDate:      new Date(v.startDate!).toISOString(),
          dueAt:          this.toIsoDueAt(v.endDate!, this.to24h(this.scratchHour(), this.scratchMinute(), this.scratchPeriod())),
          assignmentGroupId,
          materialIds:    materialIds,
        };
        await this.trainingSvc.create(req);
      }
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }

  // ── Submit reutilizar operación ───────────────────────────────────────────

  async onSubmitFromTemplate(): Promise<void> {
    const tmpl = this.selectedTemplate();
    if (!tmpl || this.templateForm.invalid || !this.tmplDateRangeValid() || this.saving()) return;
    const v = this.templateForm.getRawValue();
    const assignmentGroupId = this.buildAssignmentGroupId();

    try {
      for (const userId of v.assignedUserIds!) {
        const req: CreateFromTemplateRequest = {
          assignedUserId: userId,
          storeId:        v.storeId!,
          shift:          v.shift!,
          dueAt:          this.toIsoDueAt(v.endDate!, this.to24h(this.tmplHour(), this.tmplMinute(), this.tmplPeriod())),
          assignmentGroupId,
        };
        await this.trainingSvc.createFromTemplate(tmpl.id, req);
      }
      this.router.navigate(['/training']);
    } catch { /* error en service */ }
  }
}
