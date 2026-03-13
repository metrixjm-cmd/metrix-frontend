import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateTaskRequest,
  EvidenceUploadResponse,
  TaskResponse,
  TaskShift,
  UpdateStatusRequest,
} from '../models/task.models';

/**
 * Servicio de tareas para METRIX (Sprint 4 — Frontend Task Management).
 *
 * - Expone estado reactivo vía Signals (lista activa, tarea seleccionada, loading).
 * - Mapea los 6 endpoints del TaskController del backend.
 * - El JWT se inyecta automáticamente por el AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http       = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl     = `${environment.apiUrl}/tasks`;

  // ── Estado reactivo ──────────────────────────────────────────────────────
  private readonly _tasks        = signal<TaskResponse[]>([]);
  private readonly _selectedTask = signal<TaskResponse | null>(null);
  private readonly _loading      = signal(false);
  private readonly _error        = signal<string | null>(null);

  readonly tasks        = this._tasks.asReadonly();
  readonly selectedTask = this._selectedTask.asReadonly();
  readonly loading      = this._loading.asReadonly();
  readonly error        = this._error.asReadonly();

  /** Contadores derivados */
  readonly pendingCount    = computed(() => this._tasks().filter(t => t.status === 'PENDING').length);
  readonly inProgressCount = computed(() => this._tasks().filter(t => t.status === 'IN_PROGRESS').length);
  readonly completedCount  = computed(() => this._tasks().filter(t => t.status === 'COMPLETED').length);
  readonly failedCount     = computed(() => this._tasks().filter(t => t.status === 'FAILED').length);

  // ── GET /my — Tareas del usuario autenticado ─────────────────────────────

  loadMyTasks(shift?: TaskShift): void {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (shift) params = params.set('shift', shift);

    this.http
      .get<TaskResponse[]>(`${this.apiUrl}/my`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  tasks => { this._tasks.set(tasks); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  // ── GET /store/{storeId} — Tareas de una sucursal (ADMIN / GERENTE) ──────

  loadTasksByStore(storeId: string, shift?: TaskShift): void {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (shift) params = params.set('shift', shift);

    this.http
      .get<TaskResponse[]>(`${this.apiUrl}/store/${storeId}`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  tasks => { this._tasks.set(tasks); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  // ── GET /user/{userId} — Portfolio de un colaborador (ADMIN / GERENTE) ───

  loadTasksByUser(userId: string, shift?: TaskShift): void {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (shift) params = params.set('shift', shift);

    this.http
      .get<TaskResponse[]>(`${this.apiUrl}/user/${userId}`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  tasks => { this._tasks.set(tasks); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  // ── GET /{id} — Detalle de una tarea ────────────────────────────────────

  loadTaskById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this._selectedTask.set(null);

    this.http
      .get<TaskResponse>(`${this.apiUrl}/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  task => { this._selectedTask.set(task); this._loading.set(false); },
        error: err  => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

  // ── POST / — Crear tarea (ADMIN / GERENTE) ───────────────────────────────

  createTask(request: CreateTaskRequest): Observable<TaskResponse> {
    return this.http
      .post<TaskResponse>(this.apiUrl, request)
      .pipe(
        tap(newTask => this._tasks.update(list => [newTask, ...list])),
      );
  }

  // ── PATCH /{id}/status — Actualizar estado ───────────────────────────────

  updateStatus(taskId: string, request: UpdateStatusRequest): Observable<TaskResponse> {
    return this.http
      .patch<TaskResponse>(`${this.apiUrl}/${taskId}/status`, request)
      .pipe(
        tap(updated => {
          // Actualiza la tarea en la lista y en el detalle seleccionado
          this._tasks.update(list =>
            list.map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── POST /{id}/evidence — Subir evidencia (EJECUTADOR) ──────────────────

  /**
   * Sube un archivo de evidencia al backend, que lo almacena en GCS.
   * Actualiza el signal `selectedTask` con la nueva URL para reflejar
   * la galería de inmediato sin recargar la tarea completa.
   */
  uploadEvidence(taskId: string, file: File, type: 'IMAGE' | 'VIDEO'): Observable<EvidenceUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.http
      .post<EvidenceUploadResponse>(`${this.apiUrl}/${taskId}/evidence`, formData)
      .pipe(
        tap(res => {
          const current = this._selectedTask();
          if (!current || current.id !== taskId) return;

          if (type === 'IMAGE') {
            this._selectedTask.set({
              ...current,
              evidenceImages: [...current.evidenceImages, res.url],
            });
          } else {
            this._selectedTask.set({
              ...current,
              evidenceVideos: [...current.evidenceVideos, res.url],
            });
          }
        }),
      );
  }

  // ── PATCH /{id}/quality — Calificar calidad (ADMIN / GERENTE) ───────────

  rateQuality(taskId: string, rating: number, comments?: string): Observable<TaskResponse> {
    return this.http
      .patch<TaskResponse>(`${this.apiUrl}/${taskId}/quality`, { rating, comments })
      .pipe(
        tap(updated => {
          this._tasks.update(list =>
            list.map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  clearTasks(): void {
    this._tasks.set([]);
    this._selectedTask.set(null);
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
