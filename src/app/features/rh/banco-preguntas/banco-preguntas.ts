import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { QuestionBankService } from '../../trainer/services/question-bank.service';
import {
  BankQuestion,
  CreateBankQuestionRequest,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  QuestionDifficulty,
  QUESTION_TYPE_LABELS,
  QuestionType,
} from '../../trainer/trainer.models';

@Component({
  selector: 'app-banco-preguntas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './banco-preguntas.html',
})
export class BancoPreguntasComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly auth    = inject(AuthService);
  readonly bankSvc         = inject(QuestionBankService);

  readonly isManager  = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly typeLabels  = QUESTION_TYPE_LABELS;
  readonly diffLabels: Record<string, string>  = DIFFICULTY_LABELS;
  readonly diffColors: Record<string, string>  = DIFFICULTY_COLORS;
  readonly questionTypes: QuestionType[]    = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'OPEN_TEXT'];
  readonly difficulties: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

  // ── Filtros ────────────────────────────────────────────────────────────
  readonly filterType   = signal<string>('');
  readonly filterDiff   = signal<string>('');
  readonly filterSearch = signal<string>('');

  readonly filtered = computed(() => {
    const t = this.filterType();
    const d = this.filterDiff();
    const q = this.filterSearch().toLowerCase();
    return this.bankSvc.questions()
      .filter(bq => !t || bq.type === t)
      .filter(bq => !d || bq.difficulty === d)
      .filter(bq => !q || bq.questionText.toLowerCase().includes(q));
  });

  // ── Formulario ─────────────────────────────────────────────────────────
  readonly showForm = signal(false);
  readonly saving   = signal(false);
  readonly error    = signal('');

  readonly form = this.fb.group({
    questionText:         ['', [Validators.required, Validators.maxLength(400)]],
    type:                 ['MULTIPLE_CHOICE' as QuestionType, Validators.required],
    options:              this.fb.array([
      this.fb.control('', Validators.required),
      this.fb.control('', Validators.required),
      this.fb.control('', Validators.required),
      this.fb.control('', Validators.required),
    ]),
    correctOptionIndex:   [0],
    correctOptionIndexes: [[] as number[]],
    acceptedKeywords:     [''],
    explanation:          [''],
    points:               [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    difficulty:           ['MEDIUM' as QuestionDifficulty, Validators.required],
    category:             [''],
    tags:                 [''],
  });

  get options(): FormArray { return this.form.get('options') as FormArray; }
  get currentType(): QuestionType { return this.form.get('type')!.value as QuestionType; }
  get isMultiSelect(): boolean { return this.currentType === 'MULTI_SELECT'; }
  get isTrueFalse():   boolean { return this.currentType === 'TRUE_FALSE'; }
  get isOpenText():    boolean { return this.currentType === 'OPEN_TEXT'; }
  get isSingle():      boolean { return this.currentType === 'MULTIPLE_CHOICE' || this.currentType === 'TRUE_FALSE'; }

  onTypeChange(type: QuestionType): void {
    this.form.get('type')!.setValue(type);
    this.form.get('correctOptionIndex')!.setValue(0);
    this.form.get('correctOptionIndexes')!.setValue([]);
    const arr = this.form.get('options') as FormArray;
    while (arr.length) arr.removeAt(0);
    if (type === 'TRUE_FALSE') {
      arr.push(this.fb.control('Verdadero', Validators.required));
      arr.push(this.fb.control('Falso',     Validators.required));
    } else if (type !== 'OPEN_TEXT') {
      for (let i = 0; i < 4; i++) arr.push(this.fb.control('', Validators.required));
    }
  }

  setCorrect(idx: number): void { this.form.get('correctOptionIndex')!.setValue(idx); }
  isCorrect(idx: number): boolean { return this.form.get('correctOptionIndex')!.value === idx; }

  toggleMulti(idx: number): void {
    const ctrl = this.form.get('correctOptionIndexes')!;
    const curr = (ctrl.value as number[]) ?? [];
    const has  = curr.includes(idx);
    ctrl.setValue(has ? curr.filter(i => i !== idx) : [...curr, idx]);
  }
  isMultiCorrect(idx: number): boolean {
    return ((this.form.get('correctOptionIndexes')?.value ?? []) as number[]).includes(idx);
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    this.error.set('');
    if (!this.showForm()) this.form.reset({ type: 'MULTIPLE_CHOICE', points: 1, difficulty: 'MEDIUM', correctOptionIndex: 0, correctOptionIndexes: [] });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const fv   = this.form.value;
    const type = fv.type as QuestionType;
    const opts = this.options.controls.map(c => c.value as string);
    const req: CreateBankQuestionRequest = {
      type,
      questionText: fv.questionText!,
      points:       fv.points!,
      difficulty:   fv.difficulty as QuestionDifficulty,
      category:     fv.category || undefined,
      explanation:  fv.explanation || undefined,
      tags:         fv.tags ? (fv.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      storeId:      this.auth.currentUser()?.storeId,
    };
    if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
      req.options = opts;
      req.correctOptionIndex = fv.correctOptionIndex ?? 0;
    } else if (type === 'MULTI_SELECT') {
      req.options = opts;
      req.correctOptionIndexes = fv.correctOptionIndexes ?? [];
    } else {
      req.acceptedKeywords = (fv.acceptedKeywords as string)
        .split(',').map((k: string) => k.trim()).filter(Boolean);
    }
    try {
      await this.bankSvc.createQuestion(req);
      this.toggleForm();
    } catch {
      this.error.set('No se pudo guardar la pregunta.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  readonly deleting = signal<string | null>(null);

  async onDelete(bq: BankQuestion): Promise<void> {
    if (bq.usageCount > 0) return;
    if (!confirm(`¿Eliminar la pregunta "${bq.questionText.slice(0, 60)}…"?`)) return;
    this.deleting.set(bq.id);
    try {
      await this.bankSvc.deleteQuestion(bq.id);
    } catch {
      this.error.set('No se pudo eliminar la pregunta.');
    } finally {
      this.deleting.set(null);
    }
  }

  ngOnInit(): void {
    this.bankSvc.loadQuestions({ storeId: this.auth.currentUser()?.storeId });
  }
}
