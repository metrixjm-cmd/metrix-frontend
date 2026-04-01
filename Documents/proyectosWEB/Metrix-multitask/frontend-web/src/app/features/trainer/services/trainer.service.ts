import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  CreateExamRequest,
  ExamForTakeResponse,
  ExamResponse,
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

  loadMySubmissions(): void {
    this.http.get<ExamSubmissionResponse[]>(`${this.apiUrl}/my-submissions`)
      .subscribe({ next: s => this._mySubmissions.set(s) });
  }

  // ── Promises for mutations ────────────────────────────────────────────

  createExam(request: CreateExamRequest): Promise<ExamResponse> {
    return this.http.post<ExamResponse>(this.apiUrl, request).toPromise()
      .then(exam => {
        this._exams.update(list => [exam!, ...list]);
        return exam!;
      });
  }

  getForTake(examId: string): Promise<ExamForTakeResponse> {
    return this.http.get<ExamForTakeResponse>(`${this.apiUrl}/${examId}/take`).toPromise() as Promise<ExamForTakeResponse>;
  }

  submitExam(examId: string, request: SubmitExamRequest): Promise<ExamSubmissionResponse> {
    return this.http.post<ExamSubmissionResponse>(`${this.apiUrl}/${examId}/submit`, request).toPromise()
      .then(result => {
        this._mySubmissions.update(list => [result!, ...list]);
        return result!;
      });
  }

  getSubmissions(examId: string): Promise<ExamSubmissionResponse[]> {
    return this.http.get<ExamSubmissionResponse[]>(`${this.apiUrl}/${examId}/submissions`).toPromise() as Promise<ExamSubmissionResponse[]>;
  }
}
