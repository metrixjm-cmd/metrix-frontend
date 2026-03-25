import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BankQuestion, CreateBankQuestionRequest } from '../trainer.models';

@Injectable({ providedIn: 'root' })
export class QuestionBankService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/question-bank`;

  private readonly _questions = signal<BankQuestion[]>([]);
  private readonly _loading   = signal(false);

  readonly questions = this._questions.asReadonly();
  readonly loading   = this._loading.asReadonly();

  loadQuestions(filters?: {
    type?:       string;
    category?:   string;
    difficulty?: string;
    tag?:        string;
    storeId?:    string;
  }): void {
    this._loading.set(true);
    let params = new HttpParams();
    if (filters?.type)       params = params.set('type',       filters.type);
    if (filters?.category)   params = params.set('category',   filters.category);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.tag)        params = params.set('tag',        filters.tag);
    if (filters?.storeId)    params = params.set('storeId',    filters.storeId);

    this.http.get<BankQuestion[]>(this.apiUrl, { params }).subscribe({
      next:  q  => { this._questions.set(q); this._loading.set(false); },
      error: () => this._loading.set(false),
    });
  }

  async createQuestion(request: CreateBankQuestionRequest): Promise<BankQuestion> {
    const bq = await firstValueFrom(this.http.post<BankQuestion>(this.apiUrl, request));
    this._questions.update(list => [bq, ...list]);
    return bq;
  }

  async deleteQuestion(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
    this._questions.update(list => list.filter(q => q.id !== id));
  }
}
