import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { RhService } from '../../rh/services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogEntry } from '../../../core/services/catalog.models';
import { TaskCategoriaService } from '../services/task-categoria.service';
import { TaskCategoriaEntry } from '../models/task-categoria.models';
import { AddCatalogDialog } from '../../../shared/components/add-catalog-dialog/add-catalog-dialog';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DayTimePicker, DayTimeValue } from '../../../shared/components/day-time-picker/day-time-picker';
import { TaskCategory, WEEK_DAYS, WeekDay, ProcessStepRequest } from '../models/task.models';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, LowerCasePipe, ButtonComponent, AddCatalogDialog, DayTimePicker],
  templateUrl: './task-create.html',
})
export class TaskCreate implements OnInit {
  readonly auth            = inject(AuthService);
  readonly taskSvc         = inject(TaskService);
  readonly rhSvc           = inject(RhService);
  readonly settingsSvc     = inject(SettingsService);
  readonly catalogSvc      = inject(CatalogService);
  readonly categoriaTaskSvc = inject(TaskCategoriaService);
  readonly router          = inject(Router);
  readonly fb              = inject(FormBuilder);

  submitting  = signal(false);
  submitError = signal<string | null>(null);
  submitted   = signal(false);

  /** Secciones colapsables — orden: definition → assignment → scheduling */
  sectionOpen = signal({ definition: true, assignment: true, scheduling: true });

  toggleSection(section: 'definition' | 'assignment' | 'scheduling'): void {
    this.sectionOpen.update(s => ({ ...s, [section]: !s[section] }));
  }

  /** Progreso del formulario
   *  Paso 1 — Tarea:        título + descripción + categoría
   *  Paso 2 — Responsables: sucursal + al menos un colaborador
   *  Paso 3 — Ejecución:    si repetitiva → días + horas; si única → fechas completas
   */
  readonly step1Done = computed(() =>
    !!this.form.get('title')?.value &&
    !!this.form.get('description')?.value &&
    !!this.form.get('category')?.value
  );
  readonly step2Done = computed(() =>
    !!this.form.get('storeId')?.value &&
    (this.form.get('assignedToIds')?.value?.length || 0) > 0
  );
  readonly step3Done = computed(() => {
    if (this.isRecurring()) {
      return this.selectedDays().size > 0 &&
        !!this.form.get('recurrenceStartTime')?.value &&
        !!this.form.get('recurrenceEndTime')?.value;
    }
    return !!this.form.get('startDay')?.value &&
      !!this.form.get('startMonth')?.value &&
      !!this.form.get('startTime')?.value &&
      !!this.form.get('dueDay')?.value &&
      !!this.form.get('dueMonth')?.value &&
      !!this.form.get('dueTime')?.value;
  });

  // ── Combobox de categorias para tareas ──────────────────────────────────

  /** Entrada seleccionada de categorias (null = modo manual) */
  selectedTemplate = signal<TaskCategoriaEntry | null>(null);

  /** Controla visibilidad del dropdown de resultados */
  templateDropdownOpen = signal(false);

  /** Acceso directo a los resultados y estado de búsqueda del servicio */
  readonly templateResults  = this.categoriaTaskSvc.results;
  readonly templateSearching = this.categoriaTaskSvc.searching;

  /** Temporizador de debounce para no disparar una request por cada tecla */
  private _searchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Se llama al escribir en el input de título.
   * Después de 300ms de inactividad busca categorias que coincidan.
   */
  onTitleInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.form.get('title')?.setValue(query, { emitEvent: false });

    // Si ya hay una entrada seleccionada y el usuario edita manualmente, la limpiamos
    if (this.selectedTemplate() && query !== this.selectedTemplate()!.title) {
      this.selectedTemplate.set(null);
    }

    // Debounce 300ms
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      if (query.trim().length >= 1) {
        this.categoriaTaskSvc.searchAndUpdate(query);
        this.templateDropdownOpen.set(true);
      } else {
        this.categoriaTaskSvc.clearResults();
        this.templateDropdownOpen.set(false);
      }
    }, 300);
  }

  /** Abre el dropdown con categorias (al hacer foco en el input vacío) */
  onTitleFocus(): void {
    const query = this.form.get('title')?.value ?? '';
    if (!this.selectedTemplate() && this.templateResults().length === 0) {
      this.categoriaTaskSvc.searchAndUpdate(query);
    }
    if (this.templateResults().length > 0) {
      this.templateDropdownOpen.set(true);
    }
  }

  async loadTaskTemplatePicker(): Promise<void> {
    await this.categoriaTaskSvc.searchAndUpdate('');
    this.templateDropdownOpen.set(true);
  }

  /**
   * Aplica una entrada de categorias al formulario:
   * rellena título, descripción, categoría y pasos de proceso.
   */
  selectTemplate(template: TaskCategoriaEntry): void {
    this.selectedTemplate.set(template);
    this.templateDropdownOpen.set(false);
    this.categoriaTaskSvc.clearResults();

    // Rellenar campos del formulario
    this.form.get('title')?.setValue(template.title);
    this.form.get('description')?.setValue(template.description);
    this.form.get('category')?.setValue(template.category as TaskCategory);

    // Rellenar pasos de proceso (el usuario puede editarlos antes de guardar)
    if (template.steps && template.steps.length > 0) {
      this.processSteps.set(
        template.steps.map(s => ({
          title: s.title,
          description: s.description ?? '',
          saved: true,
        }))
      );
    }

    // Marcar campos como touched para que las validaciones se muestren si hay error
    this.form.get('title')?.markAsTouched();
    this.form.get('description')?.markAsTouched();
    this.form.get('category')?.markAsTouched();
  }

  /**
   * Limpia la entrada seleccionada y vuelve al modo de creación manual.
   * El título queda editable pero vacío para que el usuario lo reescriba.
   */
  clearTemplate(): void {
    this.selectedTemplate.set(null);
    this.form.get('title')?.setValue('');
    this.form.get('description')?.setValue('');
    this.form.get('category')?.setValue('');
    this.processSteps.set([]);
    this.categoriaTaskSvc.clearResults();
    this.templateDropdownOpen.set(false);
  }

  /** Cierra el dropdown si el click fue fuera (llamado desde el host del documento) */
  closeTemplateDropdown(): void {
    this.templateDropdownOpen.set(false);
  }

  // ── Input inline para agregar proceso rápido ────────────────────────────
  newProcessTitle = signal('');

  addQuickProcess(): void {
    const title = this.newProcessTitle().trim();
    if (!title) return;
    this.processSteps.update(steps => [...steps, { title, description: '', saved: true }]);
    this.newProcessTitle.set('');
  }

  /** Dialog para agregar categoría */
  categoriaDialogOpen = signal(false);

  /** Rol destino determinado por el rol del creador:
   *  ADMIN → solo asigna a GERENTE
   *  GERENTE → solo asigna a EJECUTADOR */
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly targetRole = computed(() => this.isAdmin() ? 'GERENTE' : 'EJECUTADOR');
  readonly targetRoleLabel = computed(() => this.isAdmin() ? 'Gerente' : 'Ejecutador');

  /** Usuarios disponibles en la sucursal seleccionada, filtrados por rol destino */
  filteredUsers = computed(() => {
    const role = this.targetRole();
    return this.rhSvc.users().filter(u => u.activo && u.roles.includes(role));
  });

  /** Sucursales activas */
  activeStores = computed(() => this.settingsSvc.stores().filter(s => s.activo));

  /** Nombre de la sucursal del usuario actual (para GERENTE) */
  currentStoreName = computed(() => {
    const storeId = this.auth.currentUser()?.storeId;
    if (!storeId) return 'Tu sucursal';
    const store = this.settingsSvc.stores().find(s => s.id === storeId);
    return store ? `${store.nombre} (${store.codigo})` : storeId;
  });

  /** Al cambiar sucursal, recargar usuarios y limpiar selección de colaborador */
  onStoreChange(storeId: string): void {
    this.form.get('storeId')?.setValue(storeId);
    this.form.get('assignedToIds')?.setValue([]);
    if (storeId) {
      this.rhSvc.loadUsersByStore(storeId);
    }
  }

  /** Meses disponibles */
  readonly months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  /** Dias disponibles (1-31) */
  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);

  readonly currentYear = new Date().getFullYear();

  /** Error de fecha invalida */
  dueDateError = signal<string | null>(null);

  /** Horas y minutos para picker estilo Apple */
  readonly hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  readonly minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  recStartHour = signal('08');
  recStartMin  = signal('00');
  recEndHour   = signal('17');
  recEndMin    = signal('00');

  updateRecurrenceTime(): void {
    this.form.get('recurrenceStartTime')?.setValue(`${this.recStartHour()}:${this.recStartMin()}`);
    this.form.get('recurrenceEndTime')?.setValue(`${this.recEndHour()}:${this.recEndMin()}`);
  }

  setRecStartHour(v: string): void { this.recStartHour.set(v); this.updateRecurrenceTime(); }
  setRecStartMin(v: string): void  { this.recStartMin.set(v); this.updateRecurrenceTime(); }
  setRecEndHour(v: string): void   { this.recEndHour.set(v); this.updateRecurrenceTime(); }
  setRecEndMin(v: string): void    { this.recEndMin.set(v); this.updateRecurrenceTime(); }

  /** Días seleccionados para el picker (two-way) */
  pickerDays = signal<string[]>([]);

  /** Sync cuando cambia el DayTimePicker */
  onDayTimeChange(val: DayTimeValue): void {
    this.selectedDays.set(new Set(val.days as WeekDay[]));
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.form.get('recurrenceStartTime')?.setValue(`${pad(val.startHour)}:${pad(val.startMinute)}`);
    this.form.get('recurrenceEndTime')?.setValue(`${pad(val.endHour)}:${pad(val.endMinute)}`);
  }

  /** Días de la semana disponibles */
  readonly weekDays = WEEK_DAYS;

  /** Días seleccionados para recurrencia */
  selectedDays = signal<Set<WeekDay>>(new Set());

  /** Pasos de proceso guardados */
  processSteps = signal<{ title: string; description: string; saved: boolean }[]>([]);

  /** Paso en edición (formulario abierto) */
  editingStepIndex = signal<number | null>(null);
  editingStepTitle = signal('');
  editingStepDescription = signal('');

  addProcessStep(): void {
    this.editingStepIndex.set(-1); // -1 = nuevo
    this.editingStepTitle.set('');
    this.editingStepDescription.set('');
  }

  editProcessStep(index: number): void {
    const step = this.processSteps()[index];
    this.editingStepIndex.set(index);
    this.editingStepTitle.set(step.title);
    this.editingStepDescription.set(step.description);
  }

  saveProcessStep(): void {
    const title = this.editingStepTitle().trim();
    if (!title) return;
    const desc = this.editingStepDescription().trim();
    const idx = this.editingStepIndex();

    if (idx === -1) {
      this.processSteps.update(steps => [...steps, { title, description: desc, saved: true }]);
    } else if (idx !== null) {
      this.processSteps.update(steps => steps.map((s, i) =>
        i === idx ? { ...s, title, description: desc } : s
      ));
    }
    this.cancelEditStep();
  }

  cancelEditStep(): void {
    this.editingStepIndex.set(null);
    this.editingStepTitle.set('');
    this.editingStepDescription.set('');
  }

  removeProcessStep(index: number): void {
    this.processSteps.update(steps => steps.filter((_, i) => i !== index));
  }

  readonly form = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category:    ['' as TaskCategory | '', Validators.required],
    isCritical:  [false],
    isRecurring: [false],
    recurrenceStartTime: [''],
    recurrenceEndTime:   [''],
    assignedToIds:[[] as string[], [Validators.required, Validators.minLength(1)]],
    storeId:     [this.auth.currentUser()?.storeId ?? '', Validators.required],
    startDay:    ['' as string | number, Validators.required],
    startMonth:  ['' as string | number, Validators.required],
    startTime:   ['', Validators.required],
    dueDay:      ['' as string | number, Validators.required],
    dueMonth:    ['' as string | number, Validators.required],
    dueTime:     ['', Validators.required],
  });

  toggleUser(userId: string): void {
    const current = this.form.get('assignedToIds')?.value || [];
    const index = current.indexOf(userId);
    if (index >= 0) {
      this.form.get('assignedToIds')?.setValue(current.filter((id: string) => id !== userId));
    } else {
      this.form.get('assignedToIds')?.setValue([...current, userId]);
    }
  }

  isUserSelected(userId: string): boolean {
    return (this.form.get('assignedToIds')?.value || []).includes(userId);
  }

  selectAllUsers(): void {
    const allIds = this.filteredUsers().map(u => u.id);
    this.form.get('assignedToIds')?.setValue(allIds);
  }

  clearUsers(): void {
    this.form.get('assignedToIds')?.setValue([]);
  }

  /** Signal: si el toggle de recurrencia está activo */
  isRecurring = signal(false);

  toggleRecurring(value: boolean): void {
    this.isRecurring.set(value);
    const dateFields = ['startDay', 'startMonth', 'startTime', 'dueDay', 'dueMonth', 'dueTime'];
    if (value) {
      dateFields.forEach(f => { this.form.get(f)?.clearValidators(); this.form.get(f)?.setValue(''); });
    } else {
      dateFields.forEach(f => { this.form.get(f)?.setValidators(Validators.required); });
      this.selectedDays.set(new Set());
      this.form.get('recurrenceStartTime')?.setValue('');
      this.form.get('recurrenceEndTime')?.setValue('');
    }
    dateFields.forEach(f => this.form.get(f)?.updateValueAndValidity());
    this.dueDateError.set(null);
  }

  toggleDay(day: WeekDay): void {
    this.selectedDays.update(days => {
      const next = new Set(days);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  isDaySelected(day: WeekDay): boolean {
    return this.selectedDays().has(day);
  }

  ngOnInit(): void {
    const storeId = this.auth.currentUser()?.storeId;
    if (storeId) {
      this.rhSvc.loadUsersByStore(storeId);
    }
    this.settingsSvc.loadAll();
    this.catalogSvc.loadCategorias();
  }

  onCategoriaAdded(entry: CatalogEntry): void {
    this.categoriaDialogOpen.set(false);
    this.catalogSvc.loadCategorias();
    this.form.get('category')?.setValue(entry.value as TaskCategory);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Validación de recurrencia
    if (this.isRecurring()) {
      if (this.selectedDays().size === 0) {
        this.submitError.set('Debes seleccionar al menos un día de repetición.');
        return;
      }
      const v = this.form.getRawValue();
      if (!v.recurrenceStartTime || !v.recurrenceEndTime) {
        this.submitError.set('La hora de inicio y fin son obligatorias para tareas repetitivas.');
        return;
      }
      if (v.recurrenceStartTime >= v.recurrenceEndTime) {
        this.submitError.set('La hora de inicio debe ser anterior a la hora de fin.');
        return;
      }
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.dueDateError.set(null);

    const v = this.form.getRawValue();
    const recurring = this.isRecurring();

    let dueAt: string;
    if (recurring) {
      const placeholder = new Date();
      placeholder.setFullYear(placeholder.getFullYear() + 1);
      dueAt = placeholder.toISOString();
    } else {
      const year = new Date().getFullYear();

      // Construir fecha inicio
      const sMonth = Number(v.startMonth);
      const sDay = Number(v.startDay);
      const [sH, sM] = (v.startTime || '00:00').split(':').map(Number);
      const startDate = new Date(year, sMonth - 1, sDay, sH, sM);

      if (startDate.getMonth() !== sMonth - 1 || startDate.getDate() !== sDay) {
        this.dueDateError.set(`El dia ${sDay} no existe en el mes de inicio seleccionado.`);
        this.submitting.set(false);
        return;
      }
      if (startDate.getTime() < Date.now()) {
        this.dueDateError.set('La fecha de inicio no puede ser anterior al momento actual.');
        this.submitting.set(false);
        return;
      }

      // Construir fecha fin
      const eMonth = Number(v.dueMonth);
      const eDay = Number(v.dueDay);
      const [eH, eM] = (v.dueTime || '00:00').split(':').map(Number);
      const endDate = new Date(year, eMonth - 1, eDay, eH, eM);

      if (endDate.getMonth() !== eMonth - 1 || endDate.getDate() !== eDay) {
        this.dueDateError.set(`El dia ${eDay} no existe en el mes limite seleccionado.`);
        this.submitting.set(false);
        return;
      }
      if (endDate.getTime() <= startDate.getTime()) {
        this.dueDateError.set('La fecha limite debe ser posterior a la fecha de inicio.');
        this.submitting.set(false);
        return;
      }

      dueAt = endDate.toISOString();
    }

    // Mapear pasos de proceso
    const steps = this.processSteps();
    const processes: ProcessStepRequest[] | undefined = steps.length > 0
      ? steps.filter(s => s.title.trim()).map(s => ({
          title: s.title.trim(),
          description: s.description.trim() || undefined,
          tags: [],
        }))
      : undefined;

    this.taskSvc.createTask({
      title:        v.title!,
      description:  v.description!,
      category:     v.category as TaskCategory,
      isCritical:   v.isCritical ?? false,
      assignedToIds: v.assignedToIds as string[],
      storeId:      v.storeId!,
      dueAt,
      processes,
      isRecurring:         recurring,
      recurrenceDays:      recurring ? [...this.selectedDays()] : undefined,
      recurrenceStartTime: recurring ? v.recurrenceStartTime! : undefined,
      recurrenceEndTime:   recurring ? v.recurrenceEndTime! : undefined,
    }).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
        this.selectedTemplate.set(null);
      },
      error: err => {
        this.submitError.set(this.extractMsg(err));
        this.submitting.set(false);
      },
    });
  }

  goToList(): void {
    this.router.navigate(['/tasks']);
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Error al crear la tarea. Verifica los datos e intenta de nuevo.';
  }
}
