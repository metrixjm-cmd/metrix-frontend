import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
import { IncidentService } from '../services/incident.service';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  IncidentCategory,
  IncidentSeverity,
} from '../incident.models';

@Component({
  selector: 'app-incident-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './incident-create.html',
})
export class IncidentCreate {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly categories     = INCIDENT_CATEGORIES;
  readonly severities     = INCIDENT_SEVERITIES;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  readonly currentUser = this.auth.currentUser;

  // ── Implicados dinámicos ──────────────────────────────────────────────────
  readonly implicados      = signal<string[]>([]);
  readonly implicadoInput  = signal('');

  addImplicado(): void {
    const val = this.implicadoInput().trim();
    if (val && !this.implicados().includes(val)) {
      this.implicados.update(list => [...list, val]);
    }
    this.implicadoInput.set('');
  }

  removeImplicado(name: string): void {
    this.implicados.update(list => list.filter(n => n !== name));
  }

  onImplicadoKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addImplicado();
    }
  }

  // ── Evidencias pendientes de subir ────────────────────────────────────────
  readonly pendingFiles   = signal<File[]>([]);
  readonly dragOver       = signal(false);
  readonly uploadError    = signal<string | null>(null);
  readonly uploadProgress = signal(0);   // cuántos archivos ya subidos en esta sesión

  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm',
  ];

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  onFileSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.addFiles(files);
    // reset input para permitir re-selección del mismo archivo
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

  removeFile(file: File): void {
    this.pendingFiles.update(list => list.filter(f => f !== file));
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  filePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    title:               ['', [Validators.required, Validators.minLength(4), Validators.maxLength(200)]],
    description:         ['', [Validators.required, Validators.minLength(10)]],
    category:            ['' as IncidentCategory | '', Validators.required],
    severity:            ['' as IncidentSeverity | '', Validators.required],
    taskId:              [''],
    storeId:             [{ value: this.auth.currentUser()?.storeId ?? '', disabled: true }, Validators.required],
    shift:               [this.auth.currentUser()?.turno ?? '', Validators.required],
    followUpResponsible: [''],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.incidentSvc.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    try {
      const created = await this.incidentSvc.create({
        title:               v.title!,
        description:         v.description!,
        category:            v.category as IncidentCategory,
        severity:            v.severity as IncidentSeverity,
        taskId:              v.taskId?.trim() || undefined,
        storeId:             v.storeId!,
        shift:               v.shift!,
        implicados:          this.implicados().length > 0 ? this.implicados() : undefined,
        followUpResponsible: v.followUpResponsible?.trim() || undefined,
      });

      // Subir archivos adjuntos uno a uno
      const files = this.pendingFiles();
      for (let i = 0; i < files.length; i++) {
        this.uploadProgress.set(i + 1);
        await this.incidentSvc.uploadEvidence(created.id, files[i]);
      }

      this.router.navigate(['/incidents']);
    } catch {
      // error ya seteado en incidentSvc._error
    }
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }
}
