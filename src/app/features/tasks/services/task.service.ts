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

  // ── GET /admin/all — Todas las tareas del sistema (solo ADMIN) ────────────

  loadAllTasks(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<TaskResponse[]>(`${this.apiUrl}/admin/all`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  tasks => { this.setTasks(tasks); this._loading.set(false); },
        error: err   => { this._error.set(this.extractMessage(err)); this._loading.set(false); },
      });
  }

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
        next:  tasks => { this.setTasks(tasks); this._loading.set(false); },
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
      .get<TaskResponse[] | { content?: TaskResponse[] }>(`${this.apiUrl}/store/${storeId}`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  response => { this.setTasks(response); this._loading.set(false); },
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
        next:  tasks => { this.setTasks(tasks); this._loading.set(false); },
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
        tap(newTask => this._tasks.update(list => [newTask, ...this.normalizeTasks(list)])),
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
            this.normalizeTasks(list).map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── PATCH /{id}/quality — Calificar calidad (creador de la tarea) ─────

  rateQuality(taskId: string, rating: number, comments?: string): Observable<TaskResponse> {
    return this.http
      .patch<TaskResponse>(`${this.apiUrl}/${taskId}/quality`, { rating, comments })
      .pipe(
        tap(updated => {
          this._tasks.update(list =>
            this.normalizeTasks(list).map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── PATCH /{id}/process/{stepId} — Actualizar paso de checklist ─────────

  updateProcessStep(taskId: string, stepId: string, completed: boolean, notes?: string): Observable<TaskResponse> {
    return this.http
      .patch<TaskResponse>(`${this.apiUrl}/${taskId}/process/${stepId}`, { completed, notes })
      .pipe(
        tap(updated => {
          this._tasks.update(list =>
            this.normalizeTasks(list).map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── PUT /{id}/process/{stepId} — Editar paso de proceso (ADMIN) ─────────

  editProcessStep(taskId: string, stepId: string, title: string, description?: string): Observable<TaskResponse> {
    return this.http
      .put<TaskResponse>(`${this.apiUrl}/${taskId}/process/${stepId}`, { title, description })
      .pipe(
        tap(updated => {
          this._tasks.update(list =>
            this.normalizeTasks(list).map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }

  // ── DELETE /{id}/process/{stepId} — Editar paso de proceso (ADMIN) ────

  deleteProcessStep(taskId: string, stepId: string): Observable<TaskResponse> {
    return this.http
      .delete<TaskResponse>(`${this.apiUrl}/${taskId}/process/${stepId}`)
      .pipe(
        tap(updated => {
          this._tasks.update(list =>
            this.normalizeTasks(list).map(t => t.id === updated.id ? updated : t),
          );
          if (this._selectedTask()?.id === updated.id) {
            this._selectedTask.set(updated);
          }
        }),
      );
  }


  // ── PATCH /{id}/deactivate — Soft-delete tarea (ADMIN) ──────────────────

  uploadEvidence(taskId: string, file: File, type: 'IMAGE' | 'VIDEO'): Observable<EvidenceUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);

    return this.http
      .post<EvidenceUploadResponse>(`${this.apiUrl}/${taskId}/evidence`, form)
      .pipe(
        tap(uploaded => {
          this._tasks.update(list =>
            this.normalizeTasks(list).map(t => {
              if (t.id !== taskId) return t;
              if (uploaded.type === 'IMAGE') {
                return { ...t, evidenceImages: [...(t.evidenceImages ?? []), uploaded.url] };
              }
              return { ...t, evidenceVideos: [...(t.evidenceVideos ?? []), uploaded.url] };
            }),
          );
          if (this._selectedTask()?.id === taskId) {
            const selected = this._selectedTask()!;
            if (uploaded.type === 'IMAGE') {
              this._selectedTask.set({
                ...selected,
                evidenceImages: [...(selected.evidenceImages ?? []), uploaded.url],
              });
            } else {
              this._selectedTask.set({
                ...selected,
                evidenceVideos: [...(selected.evidenceVideos ?? []), uploaded.url],
              });
            }
          }
        }),
      );
  }

  deactivateTask(taskId: string): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/${taskId}/deactivate`, {})
      .pipe(
        tap(() => {
          this._tasks.update(list => this.normalizeTasks(list).filter(t => t.id !== taskId));
        }),
      );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  clearTasks(): void {
    this._tasks.set([]);
    this._selectedTask.set(null);
  }

  private setTasks(response: TaskResponse[] | { content?: TaskResponse[] }): void {
    this._tasks.set(this.normalizeTasks(response));
  }

  private normalizeTasks(response: unknown): TaskResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && typeof response === 'object' && 'content' in response) {
      const content = (response as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    }

    return [];
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { error?: string; message?: string } }).error;
      if (typeof body === 'string') return body;
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}


