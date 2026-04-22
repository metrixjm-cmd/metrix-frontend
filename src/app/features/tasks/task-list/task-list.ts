import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { TaskService } from '../services/task.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { TimeFormatPipe } from '../../../shared/pipes/time-format.pipe';
import {
  ProcessStepResponse,
  TaskResponse,
  TaskStatus,
  TaskShift,
  CATEGORY_LABELS,
  SHIFT_LABELS,
  STATUS_LABELS,
} from '../models/task.models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadgeComponent, AppDatePipe, TimeFormatPipe],
  templateUrl: './task-list.html',
})
export class TaskList implements OnInit, OnDestroy {
  readonly auth       = inject(AuthService);
  readonly taskSvc    = inject(TaskService);
  readonly catalogSvc = inject(CatalogService);
  readonly router     = inject(Router);
  @ViewChild('evidenceFileInput') evidenceFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('evidenceVideoInput') evidenceVideoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;

  private pendingProcessAction: { taskId: string; stepId: string; currentCompleted: boolean } | null = null;
  private cameraStream: MediaStream | null = null;

  // ── Filtros locales ──────────────────────────────────────────────────
  searchQuery    = signal('');
  selectedShift  = signal<TaskShift | ''>('');
  selectedStatus = signal<TaskStatus | ''>('');
  selectedCategory = signal('');
  selectedCritical = signal<'' | 'true' | 'false'>('');
  selectedRecurring = signal<'' | 'true' | 'false'>('');

  // ── Tabs para GERENTE ────────────────────────────────────────────────
  activeTab = signal<'mis-tareas' | 'delegadas'>('mis-tareas');

  readonly isManagerView = computed(() =>
    this.auth.hasAnyRole('ADMIN', 'GERENTE'),
  );

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  readonly isGerente = computed(() =>
    this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'),
  );

  /** Tareas filtradas por todos los criterios */
  readonly filteredTasks = computed(() => {
    let list = this.taskSvc.tasks();

    const q        = this.searchQuery().toLowerCase().trim();
    const shift    = this.selectedShift();
    const status   = this.selectedStatus();
    const category = this.selectedCategory();
    const critical = this.selectedCritical();
    const recurring = this.selectedRecurring();

    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignedToName?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }

    if (shift)    list = list.filter(t => t.shift === shift);
    if (status)   list = list.filter(t => t.status === status);
    if (category) list = list.filter(t => t.category === category);
    if (critical === 'true')  list = list.filter(t => t.isCritical);
    if (critical === 'false') list = list.filter(t => !t.isCritical);
    if (recurring === 'true')  list = list.filter(t => t.isRecurring);
    if (recurring === 'false') list = list.filter(t => !t.isRecurring);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  /** Contadores sobre el set filtrado */
  readonly filteredPending    = computed(() => this.filteredTasks().filter(t => t.status === 'PENDING').length);
  readonly filteredInProgress = computed(() => this.filteredTasks().filter(t => t.status === 'IN_PROGRESS').length);
  readonly filteredCompleted  = computed(() => this.filteredTasks().filter(t => t.status === 'COMPLETED').length);
  readonly filteredFailed     = computed(() => this.filteredTasks().filter(t => t.status === 'FAILED').length);

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery() || !!this.selectedShift() || !!this.selectedStatus() ||
    !!this.selectedCategory() || !!this.selectedCritical() || !!this.selectedRecurring()
  );

  // ── Labels para templates ────────────────────────────────────────────
  readonly categoryLabels = CATEGORY_LABELS;
  readonly shiftLabels    = SHIFT_LABELS;
  readonly statusLabels   = STATUS_LABELS;

  ngOnInit(): void {
    this.loadTasks();
    this.catalogSvc.loadCategorias();
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
  }

  loadTasks(): void {
    if (this.isAdmin()) {
      this.taskSvc.loadAllTasks();
    } else if (this.isGerente()) {
      this.loadGerenteTab();
    } else {
      this.taskSvc.loadMyTasks();
    }
  }

  switchTab(tab: 'mis-tareas' | 'delegadas'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.clearFilters();
    this.loadGerenteTab();
  }

  private loadGerenteTab(): void {
    if (this.activeTab() === 'mis-tareas') {
      this.taskSvc.loadMyTasks();
    } else {
      const storeId = this.auth.currentUser()?.storeId ?? '';
      this.taskSvc.loadTasksByStore(storeId);
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedShift.set('');
    this.selectedStatus.set('');
    this.selectedCategory.set('');
    this.selectedCritical.set('');
    this.selectedRecurring.set('');
  }

  onShiftChange(value: string): void { this.selectedShift.set(value as TaskShift | ''); }
  onStatusChange(value: string): void { this.selectedStatus.set(value as TaskStatus | ''); }
  onCategoryChange(value: string): void { this.selectedCategory.set(value); }
  onCriticalChange(value: string): void { this.selectedCritical.set(value as '' | 'true' | 'false'); }
  onRecurringChange(value: string): void { this.selectedRecurring.set(value as '' | 'true' | 'false'); }

  filterByStatus(status: TaskStatus): void {
    this.selectedStatus.set(this.selectedStatus() === status ? '' : status);
  }

  // ── Estado de tarjetas expandibles ─────────────────────────────────
  expandedTaskId = signal<string | null>(null);
  startingTaskId = signal<string | null>(null);
  completingTaskId = signal<string | null>(null);
  togglingStepId = signal<string | null>(null);
  processActionModalOpen = signal(false);
  processActionTitle = signal('');
  processActionUploading = signal(false);
  processActionCameraOpen = signal(false);
  processActionCameraStarting = signal(false);
  processActionError = signal<string | null>(null);
  processActionPendingFiles = signal<Array<{ file: File; previewUrl: string; evidenceType: 'IMAGE' | 'VIDEO' }>>([]);
  lightboxUrl   = signal<string | null>(null);
  lightboxType  = signal<'image' | 'video'>('image');
  actionError = signal<string | null>(null);

  // ── Confirmación de completar + mensaje de éxito ───────────────────
  confirmCompleteId = signal<string | null>(null);
  successTaskId = signal<string | null>(null);
  successTaskTitle = signal('');

  // ── Justificación de procesos incompletos ────────────────────────────
  justifyTask     = signal<TaskResponse | null>(null);
  justifySteps    = signal<ProcessStepResponse[]>([]);
  justifyIndex    = signal(0);
  justifyComment  = signal('');
  justifyComments = signal<string[]>([]);

  // ── Eliminación ────────────────────────────────────────────────────
  confirmingDeleteId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  // ── Helpers de permisos ────────────────────────────────────────────

  isAssignee(task: TaskResponse): boolean {
    return task.assignedToName === this.auth.currentUser()?.nombre;
  }

  canStartTask(task: TaskResponse): boolean {
    return task.status === 'PENDING' && this.isAssignee(task);
  }

  canCompleteTask(task: TaskResponse): boolean {
    return task.status === 'IN_PROGRESS' && this.isAssignee(task);
  }

  canCheckProcesses(task: TaskResponse): boolean {
    return this.isAssignee(task) && task.status === 'IN_PROGRESS';
  }

  // ── Acciones inline ────────────────────────────────────────────────

  toggleExpand(taskId: string): void {
    this.expandedTaskId.set(this.expandedTaskId() === taskId ? null : taskId);
    this.actionError.set(null);
    this.closeProcessActionModal();
  }

  quickStartTask(task: TaskResponse, event?: Event): void {
    event?.stopPropagation();
    this.startingTaskId.set(task.id);
    this.actionError.set(null);
    this.taskSvc.updateStatus(task.id, { newStatus: 'IN_PROGRESS' }).subscribe({
      next: () => {
        this.startingTaskId.set(null);
        // Colapsar tarjeta expandida — la vista inline de procesos aparece automáticamente
        this.expandedTaskId.set(null);
      },
      error: (err) => { this.startingTaskId.set(null); this.actionError.set(this.extractMsg(err)); },
    });
  }

  /** Abre modal de confirmación para completar */
  askCompleteTask(task: TaskResponse, event?: Event): void {
    event?.stopPropagation();
    const allDone = !task.processes?.length || task.processes.every(p => p.completed);
    if (allDone) {
      this.confirmAndComplete(task);
    } else {
      const incomplete = task.processes!.filter(p => !p.completed);
      this.justifyTask.set(task);
      this.justifySteps.set(incomplete);
      this.justifyIndex.set(0);
      this.justifyComment.set('');
      this.justifyComments.set([]);
    }
  }

  cancelJustify(): void {
    this.justifyTask.set(null);
  }

  nextJustify(): void {
    const comment = this.justifyComment().trim();
    if (!comment) return;

    const comments = [...this.justifyComments(), comment];
    this.justifyComments.set(comments);

    const steps = this.justifySteps();
    const nextIndex = this.justifyIndex() + 1;

    if (nextIndex < steps.length) {
      this.justifyIndex.set(nextIndex);
      this.justifyComment.set('');
    } else {
      const task = this.justifyTask()!;
      const builtComments = steps
        .map((s, i) => `• ${s.title}: ${comments[i]}`)
        .join('\n');
      this.justifyTask.set(null);
      this.confirmAndComplete(task, builtComments);
    }
  }

  cancelComplete(): void {
    this.confirmCompleteId.set(null);
  }

  /** Ejecuta el completado tras confirmación */
  confirmAndComplete(task: TaskResponse, incompleteComments?: string): void {
    this.confirmCompleteId.set(null);
    this.completingTaskId.set(task.id);
    this.actionError.set(null);
    const allDone = !task.processes?.length || task.processes.every(p => p.completed);
    const request = allDone
      ? { newStatus: 'COMPLETED' as const }
      : {
          newStatus: 'FAILED' as const,
          comments: incompleteComments ?? 'Finalizacion con procesos incompletos.',
        };

    this.taskSvc.updateStatus(task.id, request).subscribe({
      next: () => {
        this.completingTaskId.set(null);
        // Mostrar felicitación solo si cumplió todos sus procesos
        if (allDone) {
          this.successTaskId.set(task.id);
          this.successTaskTitle.set(task.title);
          setTimeout(() => {
            if (this.successTaskId() === task.id) {
              this.successTaskId.set(null);
              this.successTaskTitle.set('');
            }
          }, 4000);
        }
      },
      error: (err) => { this.completingTaskId.set(null); this.actionError.set(this.extractMsg(err)); },
    });
  }

  onProcessStepToggle(task: TaskResponse, step: ProcessStepResponse, event?: Event): void {
    event?.stopPropagation();
    this.actionError.set(null);

    if (step.completed) {
      this.toggleProcessStep(task.id, step.stepId, true);
      return;
    }

    this.pendingProcessAction = {
      taskId: task.id,
      stepId: step.stepId,
      currentCompleted: step.completed,
    };
    this.processActionTitle.set(step.title);
    this.processActionError.set(null);
    this.processActionUploading.set(false);
    this.processActionCameraOpen.set(false);
    this.processActionCameraStarting.set(false);
    this.processActionPendingFiles.set([]);
    this.processActionModalOpen.set(true);
  }

  closeProcessActionModal(): void {
    if (this.processActionUploading()) return;
    this.stopCameraStream();
    this.revokePendingUrls();
    this.processActionCameraOpen.set(false);
    this.processActionCameraStarting.set(false);
    this.processActionModalOpen.set(false);
    this.processActionError.set(null);
    this.pendingProcessAction = null;
    this.processActionTitle.set('');
  }

  chooseOnlyCheck(): void {
    if (!this.pendingProcessAction) return;
    const pending = this.pendingProcessAction;
    const files = this.processActionPendingFiles();

    this.stopCameraStream();
    this.processActionCameraOpen.set(false);
    this.processActionCameraStarting.set(false);
    this.processActionError.set(null);

    if (!files.length) {
      this.revokePendingUrls();
      this.processActionModalOpen.set(false);
      this.pendingProcessAction = null;
      this.processActionTitle.set('');
      this.toggleProcessStep(pending.taskId, pending.stepId, pending.currentCompleted);
      return;
    }

    this.processActionUploading.set(true);
    forkJoin(files.map(f => this.taskSvc.uploadEvidence(pending.taskId, f.file, f.evidenceType))).subscribe({
      next: () => {
        this.revokePendingUrls();
        this.processActionUploading.set(false);
        this.processActionModalOpen.set(false);
        this.pendingProcessAction = null;
        this.processActionTitle.set('');
        this.toggleProcessStep(pending.taskId, pending.stepId, pending.currentCompleted);
      },
      error: (err) => {
        this.processActionUploading.set(false);
        this.processActionError.set(this.extractMsg(err));
      },
    });
  }

  removePendingFile(index: number): void {
    const files = this.processActionPendingFiles();
    URL.revokeObjectURL(files[index].previewUrl);
    this.processActionPendingFiles.set(files.filter((_, i) => i !== index));
  }

  openEvidenceFilePicker(): void {
    this.processActionError.set(null);
    this.evidenceFileInput?.nativeElement.click();
  }

  async openEvidenceCameraPicker(): Promise<void> {
    this.processActionError.set(null);
    this.processActionCameraOpen.set(true);
    this.processActionCameraStarting.set(true);
    await this.startCameraStream();
  }

  openEvidenceVideoPicker(): void {
    this.processActionError.set(null);
    this.evidenceVideoInput?.nativeElement.click();
  }

  onEvidenceVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.queueEvidence(file);
    input.value = '';
  }

  closeCameraCapture(): void {
    if (this.processActionUploading()) return;
    this.stopCameraStream();
    this.processActionCameraOpen.set(false);
    this.processActionCameraStarting.set(false);
  }

  async takePhotoFromCamera(): Promise<void> {
    const video = this.cameraPreview?.nativeElement;
    if (!video || !this.cameraStream) {
      this.processActionError.set('No se pudo acceder al video de la camara.');
      return;
    }

    this.processActionError.set(null);

    const track = this.cameraStream.getVideoTracks()[0];
    if (!track) {
      this.processActionError.set('No se detecto un flujo de video activo.');
      return;
    }

    // Preferimos captura nativa del sensor para evitar frames negros.
    try {
      const imageCaptureCtor = (window as Window & { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture;
      if (imageCaptureCtor) {
        const imageCapture = new imageCaptureCtor(track);
        const photoBlob = await imageCapture.takePhoto();
        const nativeType = photoBlob.type || 'image/jpeg';
        const file = new File([photoBlob], `evidencia-${Date.now()}.jpg`, { type: nativeType });
        this.queueEvidence(file);
        return;
      }
    } catch {
      // Fallback a canvas si ImageCapture falla.
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || video.readyState < 2) {
      this.processActionError.set('La camara aun no esta lista. Espera un momento e intenta de nuevo.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.processActionError.set('No se pudo capturar la foto.');
      return;
    }

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(blob => {
      if (!blob || blob.size === 0) {
        this.processActionError.set('No se pudo generar la foto. Intenta nuevamente.');
        return;
      }
      const file = new File([blob], `evidencia-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.queueEvidence(file);
    }, 'image/jpeg', 0.95);
  }

  private async startCameraStream(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.processActionError.set('Tu navegador no soporta acceso a camara.');
      this.processActionCameraStarting.set(false);
      return;
    }

    this.processActionError.set(null);
    this.stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      this.cameraStream = stream;
      this.processActionCameraStarting.set(false);
      await this.attachCameraToPreview(stream);
    } catch (err) {
      this.processActionError.set(this.extractCameraMsg(err));
      this.processActionCameraOpen.set(false);
      this.processActionCameraStarting.set(false);
    }
  }

  onEvidenceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.queueEvidence(file);
    input.value = '';
  }

  toggleProcessStep(taskId: string, stepId: string, currentCompleted: boolean, event?: Event): void {
    event?.stopPropagation();
    this.togglingStepId.set(stepId);
    this.taskSvc.updateProcessStep(taskId, stepId, !currentCompleted).subscribe({
      next: () => this.togglingStepId.set(null),
      error: () => this.togglingStepId.set(null),
    });
  }

  openLightbox(url: string, type: 'image' | 'video'): void {
    this.lightboxUrl.set(url);
    this.lightboxType.set(type);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  private queueEvidence(file: File): void {
    const evidenceType = this.resolveEvidenceType(file);
    if (!evidenceType) {
      this.processActionError.set('Solo se permiten imagenes o videos.');
      return;
    }
    const serial = this.processActionPendingFiles().length + 1;
    const slug   = this.slugify(this.processActionTitle());
    const ext    = file.name.includes('.') ? file.name.split('.').pop()! : (evidenceType === 'VIDEO' ? 'mp4' : 'jpg');
    const renamed = new File([file], `${slug}_${serial}.${ext}`, { type: file.type });
    const previewUrl = URL.createObjectURL(renamed);
    this.processActionPendingFiles.update(list => [...list, { file: renamed, previewUrl, evidenceType }]);
    this.stopCameraStream();
    this.processActionCameraOpen.set(false);
    this.processActionCameraStarting.set(false);
    this.processActionError.set(null);
  }

  getTaskProcessReason(task: TaskResponse, processTitle: string): string | null {
    if (!task.comments) return null;
    for (const line of task.comments.split('\n')) {
      const trimmed = line.replace(/^[•\-]\s*/, '');
      const colonIdx = trimmed.indexOf(': ');
      if (colonIdx === -1) continue;
      if (trimmed.slice(0, colonIdx).trim().toLowerCase() === processTitle.toLowerCase()) {
        return trimmed.slice(colonIdx + 2).trim() || null;
      }
    }
    return null;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'evidencia';
  }

  private revokePendingUrls(): void {
    this.processActionPendingFiles().forEach(f => URL.revokeObjectURL(f.previewUrl));
    this.processActionPendingFiles.set([]);
  }

  private resolveEvidenceType(file: File): 'IMAGE' | 'VIDEO' | null {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'IMAGE';
    if (mime.startsWith('video/')) return 'VIDEO';
    return null;
  }

  private async attachCameraToPreview(stream: MediaStream): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 80));
    const video = this.cameraPreview?.nativeElement;
    if (!video) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
  }

  private stopCameraStream(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    const video = this.cameraPreview?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  getProcessProgress(task: TaskResponse): { done: number; total: number; percent: number } | null {
    if (!task.processes?.length) return null;
    const done = task.processes.filter(p => p.completed).length;
    return { done, total: task.processes.length, percent: Math.round((done / task.processes.length) * 100) };
  }

  // ── Navegación ─────────────────────────────────────────────────────

  goToCreate(): void {
    this.router.navigate(['/tasks/create']);
  }

  confirmDelete(taskId: string, event: Event): void {
    event.stopPropagation();
    this.confirmingDeleteId.set(taskId);
  }

  cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  executeDelete(taskId: string, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(taskId);
    this.taskSvc.deactivateTask(taskId).subscribe({
      next: () => { this.deletingId.set(null); this.confirmingDeleteId.set(null); },
      error: () => { this.deletingId.set(null); },
    });
  }

  trackById(_: number, task: TaskResponse): string {
    return task.id;
  }

  isOverdue(task: TaskResponse): boolean {
    if (task.status === 'COMPLETED' || task.status === 'FAILED') return false;
    if (task.isRecurring) return false;
    return new Date(task.dueAt) < new Date();
  }

  getCategoryLabel(category: string): string {
    return this.categoryLabels[category] || category;
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  getRelativeTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days}d`;
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { error?: string; message?: string } }).error;
      if (e?.error) return e.error;
      if (e?.message) return e.message;
    }
    return 'Ocurrió un error. Intenta de nuevo.';
  }
  private extractCameraMsg(err: unknown): string {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        return 'Permiso de camara denegado. Autoriza la camara en el navegador e intenta de nuevo.';
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return 'No se detecto una camara disponible en este dispositivo.';
      }
      if (err.name === 'NotReadableError') {
        return 'La camara esta en uso por otra aplicacion.';
      }
    }
    return 'No se pudo abrir la camara. Verifica permisos y que el sitio este en HTTPS.';
  }
}
