import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { IncidentService } from '../services/incident.service';
import { SettingsService } from '../../settings/services/settings.service';
import { RhService } from '../../rh/services/rh.service';
import {
  IMPLICADO_TIPO_LABELS,
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  ImplicadoEntry,
  ImplicadoTipo,
  IncidentCategory,
  IncidentResponse,
  IncidentSeverity,
} from '../incident.models';

@Component({
  selector: 'app-incident-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TitleCasePipe],
  templateUrl: './incident-create.html',
})
export class IncidentCreate implements OnInit {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly rhSvc       = inject(RhService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly categories     = INCIDENT_CATEGORIES;
  readonly severities     = INCIDENT_SEVERITIES;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;
  readonly tipoLabels     = IMPLICADO_TIPO_LABELS;
  readonly shifts         = ['MATUTINO', 'VESPERTINO', 'NOCTURNO'] as const;
  readonly tiposImplicado: ImplicadoTipo[] = ['EXTERNO', 'EJECUTADOR', 'GERENTE'];

  // ── Implicados ──────────────────────────────────────────────────────────
  readonly implicados      = signal<ImplicadoEntry[]>([]);
  readonly newNombre       = signal('');
  readonly newTipo         = signal<ImplicadoTipo>('EXTERNO');
  readonly newResponsab    = signal('');
  readonly implicadoError  = signal<string | null>(null);

  addImplicado(): void {
    const nombre = this.newNombre().trim();
    if (!nombre) { this.implicadoError.set('El nombre es obligatorio.'); return; }
    if (this.newTipo() === 'EXTERNO' && !this.newResponsab().trim()) {
      this.implicadoError.set('Indica la responsabilidad del externo.'); return;
    }
    this.implicadoError.set(null);
    this.implicados.update(list => [
      ...list,
      {
        nombre,
        tipo: this.newTipo(),
        responsabilidad: this.newTipo() === 'EXTERNO' ? this.newResponsab().trim() : undefined,
      },
    ]);
    this.newNombre.set('');
    this.newResponsab.set('');
    this.newTipo.set('EXTERNO');
  }

  removeImplicado(index: number): void {
    this.implicados.update(list => list.filter((_, i) => i !== index));
  }

  readonly currentUser = this.auth.currentUser;
  readonly isAdmin     = computed(() => this.auth.hasRole('ADMIN'));
  readonly isGerente   = computed(() => this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'));

  /** Stores activas para el dropdown del ADMIN */
  readonly activeStores = computed(() => this.settingsSvc.stores().filter(s => s.activo));

  /** Nombre de la sucursal del usuario (GERENTE/EJECUTADOR) */
  readonly currentStoreName = computed(() => {
    const user = this.auth.currentUser();
    if (!user?.storeId) return 'Tu sucursal';
    if (user.storeName) return user.storeName;
    const store = this.settingsSvc.stores().find(s => s.id === user.storeId);
    return store?.nombre ?? store?.codigo ?? user.storeId;
  });

  /** Gerentes de la sucursal seleccionada (para ADMIN) */
  readonly gerentes = computed(() =>
    this.rhSvc.users().filter(u => u.roles?.includes('GERENTE') && u.activo)
  );

  /**
   * Responsable automático por jerarquía:
   * - Admin → selecciona gerente del dropdown
   * - Gerente → "Administrador"
   * - Ejecutador → "Gerente de sucursal"
   */
  readonly autoResponsable = computed(() => {
    if (this.isAdmin()) return '';  // Admin elige del dropdown
    if (this.isGerente()) return 'Administrador';
    return 'Gerente de sucursal';
  });

  readonly responsableLabel = computed(() => {
    if (this.isAdmin()) return 'Selecciona al gerente responsable';
    if (this.isGerente()) return 'Se asignará al Administrador';
    return 'Se asignará al Gerente de tu sucursal';
  });

  // ── Evidencias pendientes ───────────────────────────────────────────────
  readonly pendingFiles   = signal<File[]>([]);
  readonly dragOver       = signal(false);
  readonly uploadError    = signal<string | null>(null);
  readonly uploadProgress = signal(0);

  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm',
  ];

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void { this.dragOver.set(false); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onFileSelected(event: Event): void {
    this.addFiles(Array.from((event.target as HTMLInputElement).files ?? []));
    (event.target as HTMLInputElement).value = '';
  }

  private addFiles(files: File[]): void {
    this.uploadError.set(null);
    for (const file of files) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.uploadError.set(`"${file.name}" no es soportado. Usa JPG, PNG, WebP, MP4 o WebM.`);
        continue;
      }
      const maxBytes = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        this.uploadError.set(`"${file.name}" supera el límite (${file.type.startsWith('video/') ? '50' : '10'} MB).`);
        continue;
      }
      if (!this.pendingFiles().some(f => f.name === file.name && f.size === file.size)) {
        this.pendingFiles.update(list => [...list, file]);
      }
    }
  }

  removeFile(file: File): void { this.pendingFiles.update(list => list.filter(f => f !== file)); }
  isImageFile(file: File): boolean { return file.type.startsWith('image/'); }
  filePreviewUrl(file: File): string { return URL.createObjectURL(file); }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  ngOnInit(): void {
    this.settingsSvc.loadAll();
    if (this.isAdmin()) {
      const storeId = this.auth.currentUser()?.storeId ?? '';
      if (storeId) this.rhSvc.loadUsersByStore(storeId);
    }
  }

  /** ADMIN cambia sucursal → recarga gerentes */
  onStoreChange(storeId: string): void {
    this.form.patchValue({ storeId, followUpResponsible: '' });
    if (storeId) this.rhSvc.loadUsersByStore(storeId);
  }

  // ── Formulario ──────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(4), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category:    ['' as IncidentCategory | '', Validators.required],
    severity:    ['' as IncidentSeverity | '', Validators.required],
    storeId:             [this.auth.currentUser()?.storeId ?? '', Validators.required],
    shift:               [this.auth.currentUser()?.turno ?? '', Validators.required],
    followUpResponsible: [''],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.incidentSvc.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    let created: IncidentResponse;
    try {
      created = await this.incidentSvc.create({
        title:               v.title!,
        description:         v.description!,
        category:            v.category as IncidentCategory,
        severity:            v.severity as IncidentSeverity,
        storeId:             v.storeId!,
        shift:               v.shift!,
        implicados:          this.implicados().length > 0 ? this.implicados() : undefined,
        followUpResponsible: this.isAdmin()
          ? v.followUpResponsible?.trim() || undefined
          : this.autoResponsable(),
      });
    } catch {
      return; // error ya seteado en incidentSvc._error
    }

    // Incidencia creada — subir evidencias (si falla, redirigir igual)
    const files = this.pendingFiles();
    let uploadFailed = false;
    for (let i = 0; i < files.length; i++) {
      this.uploadProgress.set(i + 1);
      try {
        await this.incidentSvc.uploadEvidence(created.id, files[i]);
      } catch {
        this.incidentSvc.clearError();
        this.uploadError.set(
          `Incidencia creada, pero falló la carga de "${files[i].name}". Puedes adjuntar evidencia después.`
        );
        uploadFailed = true;
        break;
      }
    }

    if (uploadFailed) {
      await new Promise(r => setTimeout(r, 3000));
    }
    this.router.navigate(['/incidents']);
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }
}
