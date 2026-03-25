import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TaskService } from '../services/task.service';

/**
 * Componente de upload de evidencias para METRIX (Sprint 5).
 *
 * Maneja selección por clic y drag-and-drop de imágenes o videos.
 * Llama a TaskService.uploadEvidence() y emite la URL resultante.
 *
 * Uso:
 *   <app-evidence-upload [taskId]="task().id" type="IMAGE" (uploaded)="onUploaded($event)" />
 */
@Component({
  selector: 'app-evidence-upload',
  standalone: true,
  imports: [],
  templateUrl: './evidence-upload.html',
})
export class EvidenceUpload {
  private readonly taskSvc = inject(TaskService);

  // ── Inputs ───────────────────────────────────────────────────────────────
  readonly taskId = input.required<string>();
  readonly type   = input.required<'IMAGE' | 'VIDEO'>();

  // ── Outputs ──────────────────────────────────────────────────────────────
  /** Emite la URL de GCS del archivo subido exitosamente. */
  readonly uploaded = output<string>();

  // ── Estado interno ───────────────────────────────────────────────────────
  readonly uploading   = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly dragOver    = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────

  readonly accept = computed(() =>
    this.type() === 'IMAGE'
      ? 'image/jpeg,image/png,image/webp'
      : 'video/mp4,video/quicktime,video/webm',
  );

  readonly label = computed(() =>
    this.type() === 'IMAGE' ? 'Imagen' : 'Video',
  );

  readonly maxSizeLabel = computed(() =>
    this.type() === 'IMAGE' ? '10 MB máx.' : '50 MB máx.',
  );

  readonly formatsLabel = computed(() =>
    this.type() === 'IMAGE' ? 'JPG, PNG, WebP' : 'MP4, MOV, WebM',
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.upload(input.files[0]);
      input.value = ''; // permite volver a seleccionar el mismo archivo
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.upload(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  private upload(file: File): void {
    this.uploading.set(true);
    this.uploadError.set(null);

    this.taskSvc.uploadEvidence(this.taskId(), file, this.type()).subscribe({
      next: res => {
        this.uploading.set(false);
        this.uploaded.emit(res.url);
      },
      error: err => {
        this.uploading.set(false);
        this.uploadError.set(this.extractMsg(err));
      },
    });
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string } }).error;
      if (body?.error) return body.error;
    }
    return 'Error al subir el archivo. Intenta de nuevo.';
  }
}
