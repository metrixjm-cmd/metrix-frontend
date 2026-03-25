import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { IncidentService } from '../services/incident.service';
import { SettingsService } from '../../settings/services/settings.service';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from '../incident.models';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, AppDatePipe],
  templateUrl: './incident-detail.html',
})
export class IncidentDetail implements OnInit {
  private readonly auth        = inject(AuthService);
  readonly incidentSvc         = inject(IncidentService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly isManagerView = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly incident      = this.incidentSvc.selectedIncident;

  readonly statusLabels   = INCIDENT_STATUS_LABELS;
  readonly categoryLabels = INCIDENT_CATEGORY_LABELS;
  readonly severityLabels = INCIDENT_SEVERITY_LABELS;

  // ── Estado del modal de cierre ────────────────────────────────────────────
  readonly showCloseModal = signal(false);
  readonly closedByRol    = signal<'GERENTE' | 'ADMINISTRADOR' | 'OTRO'>('GERENTE');
  readonly closedByPuesto = signal('');

  readonly closeForm = this.fb.group({
    closedByName:    ['', Validators.required],
    resolutionNotes: ['', [Validators.required, Validators.minLength(10)]],
    notes:           [''],
  });

  readonly rolesClose: { value: 'GERENTE' | 'ADMINISTRADOR' | 'OTRO'; label: string }[] = [
    { value: 'GERENTE',       label: 'Gerente' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'OTRO',          label: 'Otro' },
  ];

  // ── Evidencias de cierre (opcional) ──────────────────────────────────────
  readonly closeFiles     = signal<File[]>([]);
  readonly closeUploadErr = signal<string | null>(null);
  readonly closeUploading = signal(false);
  readonly closeUploadProg = signal(0);

  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm',
  ];

  onCloseFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addCloseFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  private addCloseFiles(files: File[]): void {
    this.closeUploadErr.set(null);
    for (const file of files) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.closeUploadErr.set(`"${file.name}" no es soportado. Usa JPG, PNG, WebP, MP4 o WebM.`);
        continue;
      }
      const maxBytes = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        this.closeUploadErr.set(`"${file.name}" supera el límite (${file.type.startsWith('video/') ? '50' : '10'} MB).`);
        continue;
      }
      if (!this.closeFiles().some(f => f.name === file.name && f.size === file.size)) {
        this.closeFiles.update(list => [...list, file]);
      }
    }
  }

  removeCloseFile(file: File): void {
    this.closeFiles.update(list => list.filter(f => f !== file));
  }

  isImageFile(file: File): boolean { return file.type.startsWith('image/'); }
  filePreviewUrl(file: File): string { return URL.createObjectURL(file); }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getStoreName(storeId: string): string {
    const user = this.auth.currentUser();
    if (user?.storeId === storeId && user.storeName) return user.storeName;
    const store = this.settingsSvc.stores().find(s => s.id === storeId);
    return store?.nombre ?? store?.codigo ?? storeId;
  }

  ngOnInit(): void {
    this.settingsSvc.loadAll();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/incidents']); return; }
    this.incidentSvc.loadById(id);
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async takeResolution(): Promise<void> {
    const incident = this.incident();
    if (!incident || this.incidentSvc.saving()) return;
    try {
      await this.incidentSvc.updateStatus(incident.id, { newStatus: 'EN_RESOLUCION' });
    } catch { /* error en servicio */ }
  }

  async closeIncident(): Promise<void> {
    if (this.closeForm.invalid || this.incidentSvc.saving()) return;
    if (this.closedByRol() === 'OTRO' && !this.closedByPuesto().trim()) return;
    const incident = this.incident();
    if (!incident) return;
    const v = this.closeForm.getRawValue();
    const rol = this.closedByRol();
    const label = rol === 'OTRO'
      ? this.closedByPuesto().trim()
      : this.rolesClose.find(r => r.value === rol)!.label;
    const fullName = `${v.closedByName!} (${label})`;
    try {
      await this.incidentSvc.updateStatus(incident.id, {
        newStatus:        'CERRADA',
        closedByName:     fullName,
        resolutionNotes:  v.resolutionNotes!,
        notes:            v.notes ?? undefined,
      });
    } catch { return; }

    // Subir evidencias de cierre (opcional)
    const files = this.closeFiles();
    if (files.length > 0) {
      this.closeUploading.set(true);
      for (let i = 0; i < files.length; i++) {
        this.closeUploadProg.set(i + 1);
        try {
          await this.incidentSvc.uploadEvidence(incident.id, files[i]);
        } catch {
          this.closeUploadErr.set(`Incidencia cerrada, pero falló la carga de "${files[i].name}".`);
          break;
        }
      }
      this.closeUploading.set(false);
    }
    this.resetCloseModal();
  }

  resetCloseModal(): void {
    this.showCloseModal.set(false);
    this.closeForm.reset();
    this.closedByRol.set('GERENTE');
    this.closedByPuesto.set('');
    this.closeFiles.set([]);
    this.closeUploadErr.set(null);
    this.closeUploadProg.set(0);
  }

  async reopenIncident(): Promise<void> {
    const incident = this.incident();
    if (!incident || this.incidentSvc.saving()) return;
    try {
      await this.incidentSvc.updateStatus(incident.id, { newStatus: 'ABIERTA' });
    } catch { /* error en servicio */ }
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
  }

  // ── Helpers de estilo ─────────────────────────────────────────────────────

  severityBadgeClass(severity: IncidentSeverity): string {
    return ({
      BAJA:    'bg-stone-100 text-stone-600',
      MEDIA:   'bg-yellow-100 text-yellow-700',
      ALTA:    'bg-brand-100 text-brand-700',
      CRITICA: 'bg-red-100 text-red-700 font-bold',
    })[severity];
  }

  statusBadgeClass(status: IncidentStatus): string {
    return ({
      ABIERTA:       'bg-red-100 text-red-700',
      EN_RESOLUCION: 'bg-blue-100 text-blue-700',
      CERRADA:       'bg-emerald-100 text-emerald-700',
    })[status];
  }

  categoryBadgeClass(category: IncidentCategory): string {
    return ({
      EQUIPO:    'bg-indigo-100 text-indigo-700',
      INSUMOS:   'bg-teal-100 text-teal-700',
      PERSONAL:  'bg-purple-100 text-purple-700',
      SEGURIDAD: 'bg-red-100 text-red-700',
      OPERACION: 'bg-brand-50 text-brand-700',
      OTRO:      'bg-stone-100 text-stone-600',
    })[category];
  }

}
