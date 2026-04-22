import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-evidence-upload',
  standalone: true,
  imports: [],
  templateUrl: './evidence-upload.html',
})
export class EvidenceUpload {
  private readonly taskSvc = inject(TaskService);

  readonly taskId = input.required<string>();
  readonly type = input.required<'IMAGE' | 'VIDEO'>();

  readonly uploaded = output<string>();

  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly dragOver = signal(false);

  readonly accept = computed(() =>
    this.type() === 'IMAGE'
      ? 'image/jpeg,image/png,image/webp'
      : 'video/mp4,video/quicktime,video/webm',
  );

  readonly label = computed(() =>
    this.type() === 'IMAGE' ? 'Imagen' : 'Video',
  );

  readonly maxSizeLabel = computed(() =>
    this.type() === 'IMAGE' ? '10 MB max.' : '50 MB max.',
  );

  readonly formatsLabel = computed(() =>
    this.type() === 'IMAGE' ? 'JPG, PNG, WebP' : 'MP4, MOV, WebM',
  );

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.upload(input.files[0]);
      input.value = '';
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

  private upload(file: File): void {
    this.uploading.set(true);
    this.uploadError.set(null);

    this.taskSvc.uploadEvidence(this.taskId(), file, this.type()).subscribe({
      next: response => {
        this.uploading.set(false);
        this.uploaded.emit(response.url);
      },
      error: err => {
        this.uploadError.set(this.extractMsg(err));
        this.uploading.set(false);
      },
    });
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } | string }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Error al subir el archivo. Intenta de nuevo.';
  }
}
