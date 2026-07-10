import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AttemptInfo,
  CreateExamRequest,
  CreateFromTemplateRequest,
  ExamForTakeResponse,
  ExamResponse,
  ExamStats,
  ExamSubmissionResponse,
  SubmitExamRequest,
} from '../trainer.models';

@Injectable({ providedIn: 'root' })
export class TrainerService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/exams`;

  // ── State signals ─────────────────────────────────────────────────────
  private readonly _exams        = signal<ExamResponse[]>([]);
  private readonly _mySubmissions = signal<ExamSubmissionResponse[]>([]);
  private readonly _loading      = signal(false);

  readonly exams         = this._exams.asReadonly();
  readonly mySubmissions = this._mySubmissions.asReadonly();
  readonly loading       = this._loading.asReadonly();

  /** Exámenes que ya respondí (al menos una submission). */
  readonly attemptedExamIds = computed(() =>
    new Set(this._mySubmissions().map(s => s.examId))
  );

  /** Última submission por examen. */
  readonly lastSubmissionByExam = computed(() => {
    const map = new Map<string, ExamSubmissionResponse>();
    for (const s of this._mySubmissions()) {
      if (!map.has(s.examId)) map.set(s.examId, s);
    }
    return map;
  });

  // ── Loaders ───────────────────────────────────────────────────────────

  loadByStore(storeId: string): void {
    this._loading.set(true);
    this.http.get<ExamResponse[]>(`${this.apiUrl}/store/${storeId}`)
      .subscribe({
        next:  exams => { this._exams.set(exams); this._loading.set(false); },
        error: ()    => this._loading.set(false),
      });
  }

  /** Todos los exámenes del sistema (todas las sucursales). Solo ADMIN. */
  loadAll(): void {
    this._loading.set(true);
    this.http.get<ExamResponse[]>(this.apiUrl)
      .subscribe({
        next:  exams => { this._exams.set(exams); this._loading.set(false); },
        error: ()    => this._loading.set(false),
      });
  }

  loadMySubmissions(): void {
    this.http.get<ExamSubmissionResponse[]>(`${this.apiUrl}/my-submissions`)
      .subscribe({ next: s => this._mySubmissions.set(s) });
  }

  // ── Promises for mutations ────────────────────────────────────────────

  async createExam(request: CreateExamRequest): Promise<ExamResponse> {
    const exam = await firstValueFrom(this.http.post<ExamResponse>(this.apiUrl, request));
    this._exams.update(list => [exam, ...list]);
    return exam;
  }

  getById(examId: string): Promise<ExamResponse> {
    return firstValueFrom(this.http.get<ExamResponse>(`${this.apiUrl}/${examId}`));
  }

  getForTake(examId: string): Promise<ExamForTakeResponse> {
    return firstValueFrom(this.http.get<ExamForTakeResponse>(`${this.apiUrl}/${examId}/take`));
  }

  async submitExam(examId: string, request: SubmitExamRequest): Promise<ExamSubmissionResponse> {
    const result = await firstValueFrom(
      this.http.post<ExamSubmissionResponse>(`${this.apiUrl}/${examId}/submit`, request));
    this._mySubmissions.update(list => [result, ...list]);
    return result;
  }

  getSubmissions(examId: string): Promise<ExamSubmissionResponse[]> {
    return firstValueFrom(this.http.get<ExamSubmissionResponse[]>(`${this.apiUrl}/${examId}/submissions`));
  }

  getAttemptInfo(examId: string): Promise<AttemptInfo> {
    return firstValueFrom(this.http.get<AttemptInfo>(`${this.apiUrl}/${examId}/attempt-info`));
  }

  getExamStats(examId: string): Promise<ExamStats> {
    return firstValueFrom(this.http.get<ExamStats>(`${this.apiUrl}/${examId}/stats`));
  }

  async updateExam(examId: string, request: CreateExamRequest): Promise<ExamResponse> {
    const updated = await firstValueFrom(this.http.put<ExamResponse>(`${this.apiUrl}/${examId}`, request));
    this._exams.update(list => list.map(e => e.id === examId ? updated : e));
    return updated;
  }

  async deleteExam(examId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${examId}`));
    this._exams.update(list => list.filter(e => e.id !== examId));
  }

  /** GERENTE solicita al ADMIN eliminar un examen — no lo borra, marca el examen y notifica. */
  async requestExamDeletion(examId: string): Promise<ExamResponse> {
    const updated = await firstValueFrom(
      this.http.post<ExamResponse>(`${this.apiUrl}/${examId}/request-deletion`, {}));
    this._exams.update(list => list.map(e => e.id === examId ? updated : e));
    return updated;
  }

  /** ADMIN descarta una solicitud de eliminación sin borrar el examen. */
  async dismissDeletionRequest(examId: string): Promise<ExamResponse> {
    const updated = await firstValueFrom(
      this.http.post<ExamResponse>(`${this.apiUrl}/${examId}/dismiss-deletion-request`, {}));
    this._exams.update(list => list.map(e => e.id === examId ? updated : e));
    return updated;
  }

  async createFromTemplate(templateId: string, request: CreateFromTemplateRequest): Promise<ExamResponse> {
    const exam = await firstValueFrom(
      this.http.post<ExamResponse>(`${this.apiUrl}/from-template/${templateId}`, request)
    );
    this._exams.update(list => [exam, ...list]);
    return exam;
  }
}
