import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { QuestionBankService } from '../services/question-bank.service';
import { ExamTemplateService } from '../services/exam-template.service';
import { TrainingService } from '../../training/services/training.service';
import {
  BankQuestion,
  CreateExamQuestionDto,
  CreateFromTemplateRequest,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  ExamTemplateDetail,
  ExamTemplateSummary,
  QUESTION_TYPE_LABELS,
  QuestionType,
} from '../trainer.models';

type CreateMode = 'scratch' | 'template' | 'bank';

@Component({
  selector: 'app-exam-builder',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './exam-builder.html',
})
export class ExamBuilder implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly auth        = inject(AuthService);
  private readonly trainerSvc  = inject(TrainerService);
  private readonly bankSvc     = inject(QuestionBankService);
  private readonly templateSvc = inject(ExamTemplateService);
  private readonly trainingSvc = inject(TrainingService);
  private readonly router      = inject(Router);

  readonly trainings = this.trainingSvc.trainings;

  readonly saving      = signal(false);
  readonly error       = signal('');
  readonly typeLabels  = QUESTION_TYPE_LABELS;
  readonly diffLabels  = DIFFICULTY_LABELS;
  readonly diffColors  = DIFFICULTY_COLORS;
  readonly questionTypes: QuestionType[] = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'OPEN_TEXT'];

  // ── Modo de creación ──────────────────────────────────────────────────
  readonly mode = signal<CreateMode>('scratch');

  setMode(m: CreateMode): void {
    this.mode.set(m);
    this.error.set('');
    if (m === 'bank' && this.bankSvc.questions().length === 0) {
      this.bankSvc.loadQuestions({ storeId: this.auth.currentUser()?.storeId });
    }
    if (m === 'template' && this.templateSvc.summaries().length === 0) {
      this.templateSvc.loadSummaries();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MODO: DESDE CERO
  // ══════════════════════════════════════════════════════════════════════

  readonly form = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(120)]],
    description:      [''],
    trainingId:       [null as string | null],
    passingScore:     [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    timeLimitMinutes: [null as number | null],
    maxAttempts:      [0, [Validators.required, Validators.min(0)]],
  });

  readonly questions = signal<FormGroup[]>([]);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.storeId) this.trainingSvc.loadByStore(user.storeId);
  }

  readonly canSubmit = computed(() =>
    this.form.valid && this.questions().length > 0 &&
    this.questions().every(q => q.valid)
  );

  addQuestion(type: QuestionType): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let options: FormArray<any>;

    if (type === 'TRUE_FALSE') {
      options = this.fb.array([
        this.fb.control('Verdadero', Validators.required),
        this.fb.control('Falso',     Validators.required),
      ]);
    } else if (type === 'OPEN_TEXT') {
      options = this.fb.array([]);
    } else {
      options = this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]);
    }

    const qGroup = this.fb.group({
      questionText:         ['', [Validators.required, Validators.maxLength(400)]],
      type:                 [type],
      options,
      correctOptionIndex:   [0],
      correctOptionIndexes: [[] as number[]],
      acceptedKeywords:     [''],
      explanation:          [''],
      points:               [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    });

    this.questions.update(list => [...list, qGroup]);
  }

  removeQuestion(idx: number): void {
    this.questions.update(list => list.filter((_, i) => i !== idx));
  }

  getOptions(qGroup: FormGroup): FormArray { return qGroup.get('options') as FormArray; }
  getType(qGroup: FormGroup): QuestionType { return qGroup.get('type')?.value as QuestionType; }
  isTrueFalse(qGroup: FormGroup):    boolean { return this.getType(qGroup) === 'TRUE_FALSE'; }
  isMultiSelect(qGroup: FormGroup):  boolean { return this.getType(qGroup) === 'MULTI_SELECT'; }
  isOpenText(qGroup: FormGroup):     boolean { return this.getType(qGroup) === 'OPEN_TEXT'; }
  isSingleChoice(qGroup: FormGroup): boolean {
    const t = this.getType(qGroup);
    return t === 'MULTIPLE_CHOICE' || t === 'TRUE_FALSE';
  }

  setCorrect(qGroup: FormGroup, idx: number): void { qGroup.get('correctOptionIndex')?.setValue(idx); }
  isCorrect(qGroup: FormGroup, idx: number):  boolean { return qGroup.get('correctOptionIndex')?.value === idx; }

  toggleMultiCorrect(qGroup: FormGroup, idx: number): void {
    const ctrl    = qGroup.get('correctOptionIndexes')!;
    const current = (ctrl.value as number[]) ?? [];
    const has     = current.includes(idx);
    ctrl.setValue(has ? current.filter((i: number) => i !== idx) : [...current, idx]);
  }

  isMultiCorrect(qGroup: FormGroup, idx: number): boolean {
    return ((qGroup.get('correctOptionIndexes')?.value ?? []) as number[]).includes(idx);
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    const user = this.auth.currentUser()!;
    const fv   = this.form.value;
    try {
      await this.trainerSvc.createExam({
        title:            fv.title!,
        description:      fv.description || undefined,
        trainingId:       (fv.trainingId && fv.trainingId !== '') ? fv.trainingId : undefined,
        storeId:          user.storeId!,
        passingScore:     fv.passingScore!,
        timeLimitMinutes: fv.timeLimitMinutes || undefined,
        maxAttempts:      fv.maxAttempts ?? 0,
        questions:        this.buildQuestionsFromForm(),
      });
      this.router.navigate(['/trainer']);
    } catch {
      this.error.set('No se pudo guardar el examen. Verifica los datos e intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MODO: DESDE PLANTILLA
  // ══════════════════════════════════════════════════════════════════════

  readonly templateLoading  = this.templateSvc.loading;
  readonly templates        = this.templateSvc.summaries;
  readonly selectedTemplate = signal<ExamTemplateSummary | null>(null);
  readonly templateDetail   = signal<ExamTemplateDetail | null>(null);
  readonly loadingDetail    = signal(false);

  readonly overrideForm = this.fb.group({
    passingScore:     [null as number | null, [Validators.min(1), Validators.max(100)]],
    timeLimitMinutes: [null as number | null, [Validators.min(1)]],
  });

  async selectTemplate(summary: ExamTemplateSummary): Promise<void> {
    this.selectedTemplate.set(summary);
    this.templateDetail.set(null);
    this.error.set('');
    this.loadingDetail.set(true);
    try {
      const detail = await this.templateSvc.getDetail(summary.id);
      this.templateDetail.set(detail);
      this.overrideForm.patchValue({
        passingScore:     summary.passingScore,
        timeLimitMinutes: summary.timeLimitMinutes ?? null,
      });
    } catch {
      this.error.set('No se pudo cargar el detalle de la plantilla.');
    } finally {
      this.loadingDetail.set(false);
    }
  }

  clearTemplate(): void {
    this.selectedTemplate.set(null);
    this.templateDetail.set(null);
  }

  async onSubmitTemplate(): Promise<void> {
    const tmpl = this.selectedTemplate();
    if (!tmpl) return;
    this.saving.set(true);
    this.error.set('');
    const fv = this.overrideForm.value;
    const req: CreateFromTemplateRequest = {
      storeId:          this.auth.currentUser()!.storeId!,
      passingScore:     fv.passingScore ?? undefined,
      timeLimitMinutes: fv.timeLimitMinutes ?? undefined,
    };
    try {
      await this.trainerSvc.createFromTemplate(tmpl.id, req);
      this.router.navigate(['/trainer']);
    } catch {
      this.error.set('No se pudo crear el examen desde la plantilla.');
    } finally {
      this.saving.set(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MODO: DEL BANCO
  // ══════════════════════════════════════════════════════════════════════

  readonly bankLoading    = this.bankSvc.loading;
  readonly bankAll        = this.bankSvc.questions;
  readonly bankSearch     = signal('');
  readonly bankTypeFilter = signal('');
  readonly selectedBankQs = signal<BankQuestion[]>([]);

  readonly filteredBank = computed(() => {
    const q        = this.bankSearch().toLowerCase();
    const typeF    = this.bankTypeFilter();
    const selected = new Set(this.selectedBankQs().map(bq => bq.id));
    return this.bankAll()
      .filter(bq => !selected.has(bq.id))
      .filter(bq => !typeF || bq.type === typeF)
      .filter(bq => !q || bq.questionText.toLowerCase().includes(q));
  });

  addFromBank(bq: BankQuestion): void {
    this.selectedBankQs.update(list => [...list, bq]);
  }

  removeFromBank(id: string): void {
    this.selectedBankQs.update(list => list.filter(bq => bq.id !== id));
  }

  readonly bankForm = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(120)]],
    description:      [''],
    passingScore:     [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    timeLimitMinutes: [null as number | null],
    maxAttempts:      [0, [Validators.required, Validators.min(0)]],
  });

  readonly canSubmitBank = computed(() =>
    this.bankForm.valid && this.selectedBankQs().length > 0
  );

  async onSubmitBank(): Promise<void> {
    if (!this.canSubmitBank()) return;
    this.saving.set(true);
    this.error.set('');
    const user = this.auth.currentUser()!;
    const fv   = this.bankForm.value;
    const questionsDto: CreateExamQuestionDto[] = this.selectedBankQs().map(bq => {
      const base: CreateExamQuestionDto = {
        questionText: bq.questionText,
        type:         bq.type,
        points:       bq.points,
        explanation:  bq.explanation,
      };
      if (bq.type === 'MULTIPLE_CHOICE' || bq.type === 'TRUE_FALSE') {
        return { ...base, options: bq.options, correctOptionIndex: bq.correctOptionIndex };
      }
      if (bq.type === 'MULTI_SELECT') {
        return { ...base, options: bq.options, correctOptionIndexes: bq.correctOptionIndexes };
      }
      return { ...base, acceptedKeywords: bq.acceptedKeywords };
    });
    try {
      await this.trainerSvc.createExam({
        title:            fv.title!,
        description:      fv.description || undefined,
        storeId:          user.storeId!,
        passingScore:     fv.passingScore!,
        timeLimitMinutes: fv.timeLimitMinutes || undefined,
        maxAttempts:      fv.maxAttempts ?? 0,
        questions:        questionsDto,
      });
      this.router.navigate(['/trainer']);
    } catch {
      this.error.set('No se pudo guardar el examen.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────

  private buildQuestionsFromForm(): CreateExamQuestionDto[] {
    return this.questions().map(q => {
      const type: QuestionType = q.get('type')!.value;
      const opts = (q.get('options') as FormArray).controls.map(c => c.value as string);
      const base: CreateExamQuestionDto = {
        questionText: q.get('questionText')!.value,
        type,
        points:       q.get('points')!.value,
        explanation:  q.get('explanation')!.value || undefined,
      };
      if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
        return { ...base, options: opts, correctOptionIndex: q.get('correctOptionIndex')!.value };
      }
      if (type === 'MULTI_SELECT') {
        return { ...base, options: opts, correctOptionIndexes: q.get('correctOptionIndexes')!.value };
      }
      const kw = (q.get('acceptedKeywords')!.value as string)
        .split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      return { ...base, acceptedKeywords: kw };
    });
  }
}
