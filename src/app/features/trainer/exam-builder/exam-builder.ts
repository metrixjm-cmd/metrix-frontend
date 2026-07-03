import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { merge, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../../settings/services/settings.service';
import { TrainerService } from '../services/trainer.service';
import {
  CreateExamQuestionDto,
  EXAM_AUDIENCE_LABELS,
  ExamResponse,
  ExamAudience,
  QUESTION_TYPE_LABELS,
  QuestionType,
} from '../trainer.models';

@Component({
  selector: 'app-exam-builder',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './exam-builder.html',
  styles: [`
    @keyframes questionIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes questionOut {
      from { opacity: 1; transform: translateY(0); max-height: 500px; }
      to   { opacity: 0; transform: translateY(-8px); max-height: 0; padding-top: 0; padding-bottom: 0; }
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }
    .animate-question-in  { animation: questionIn 0.25s ease-out both; }
    .animate-question-out { animation: questionOut 0.2s ease-in both; overflow: hidden; }
    .animate-toast-in     { animation: toastIn 0.25s ease-out both; }
  `],
})
export class ExamBuilder implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly auth        = inject(AuthService);
  private readonly trainerSvc  = inject(TrainerService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);

  /** El ADMIN no tiene sucursal propia: debe elegir a cuál pertenece el examen. */
  readonly needsStoreSelector = computed(() =>
    this.auth.hasRole('ADMIN') || !this.auth.currentUser()?.storeId
  );
  readonly stores = this.settingsSvc.stores;

  readonly saving        = signal(false);
  readonly error         = signal('');
  readonly toast         = signal('');
  readonly removingIndex = signal<number | null>(null);
  readonly typeLabels    = QUESTION_TYPE_LABELS;
  readonly audienceLabels = EXAM_AUDIENCE_LABELS;
  readonly audiences: ExamAudience[] = ['GERENTE', 'EJECUTADOR'];
  readonly hours = Array.from({ length: 24 }, (_, i) => i + 1);

  readonly editMode = signal(false);
  readonly editExamId = signal<string | null>(null);
  readonly loadingExam = signal(false);
  readonly returnUrl = signal('/trainer');

  // ══════════════════════════════════════════════════════════════════════
  // MODO: DESDE CERO
  // ══════════════════════════════════════════════════════════════════════

  readonly form = this.fb.group({
    title:          ['', [Validators.required, Validators.maxLength(120)]],
    description:    [''],
    storeId:        [this.auth.currentUser()?.storeId ?? '', Validators.required],
    targetAudience: ['EJECUTADOR' as ExamAudience, Validators.required],
    passingScore:   [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    timeLimitHours: [null as number | null, [Validators.required, Validators.min(1), Validators.max(24)]],
  });

  readonly questions = signal<FormGroup[]>([]);

  // Trackea validez del formulario principal como signal (form.valid no es signal)
  private readonly _formValid = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status), map(s => s === 'VALID')),
    { initialValue: this.form.valid }
  );

  // Cuando cambia el array de preguntas, rebuilds la suscripción a todos sus statusChanges
  private readonly _questionsAllValid = toSignal(
    toObservable(this.questions).pipe(
      switchMap(qs => {
        if (qs.length === 0) return of(false);
        return merge(...qs.map(q => q.statusChanges.pipe(startWith(q.status)))).pipe(
          map(() => qs.every(q => q.valid))
        );
      })
    ),
    { initialValue: false }
  );

  ngOnInit(): void {
    const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requestedReturnUrl === '/banco-info/bitacora-examenes') {
      this.returnUrl.set(requestedReturnUrl);
    }

    if (this.needsStoreSelector() && this.settingsSvc.stores().length === 0) {
      this.settingsSvc.loadAll();
    }

    const examId = this.route.snapshot.paramMap.get('examId');
    if (examId) {
      this.editMode.set(true);
      this.editExamId.set(examId);
      this.loadExamForEdit(examId);
    }
  }

  private async loadExamForEdit(examId: string): Promise<void> {
    this.loadingExam.set(true);
    try {
      const exam: ExamResponse = await this.trainerSvc.getById(examId);
      this.form.patchValue({
        title: exam.title,
        description: exam.description || '',
        storeId: exam.storeId || this.auth.currentUser()?.storeId || '',
        targetAudience: exam.targetAudience ?? 'EJECUTADOR',
        passingScore: exam.passingScore,
        timeLimitHours: exam.timeLimitMinutes ? Math.ceil(exam.timeLimitMinutes / 60) : null,
      });
      const groups: FormGroup[] = exam.questions.map(q => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let options: FormArray<any>;
        if (q.type === 'TRUE_FALSE') {
          options = this.fb.array(
            (q.options ?? ['Verdadero', 'Falso']).map(o => this.fb.control(o, Validators.required))
          );
        } else {
          options = this.fb.array(
            (q.options ?? []).map(o => this.fb.control(o, Validators.required))
          );
        }
        return this.fb.group({
          questionText:         [q.questionText, [Validators.required, Validators.maxLength(400)]],
          type:                 [q.type],
          options,
          correctOptionIndex:   [q.correctOptionIndex ?? 0],
          correctOptionIndexes: [q.correctOptionIndexes ?? []],
          acceptedKeywords:     [''],
          explanation:          [''],
          points:               [q.points, [Validators.required, Validators.min(1), Validators.max(10)]],
        });
      });
      this.questions.set(groups);
    } catch {
      this.error.set('No se pudo cargar el examen.');
    } finally {
      this.loadingExam.set(false);
    }
  }

  readonly canSubmit = computed(() => {
    if (!this._formValid()) return false;
    const qs = this.questions();
    if (qs.length < 5) return false;
    this._questionsAllValid();
    return qs.every(q => q.valid);
  });

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }

  private hasIncompleteQuestion(): boolean {
    return this.questions().some(q => {
      if (!q.get('questionText')?.value?.trim()) return true;
      const type = q.get('type')?.value as QuestionType;
      if (type === 'TRUE_FALSE') return false;
      const opts = (q.get('options') as FormArray).controls;
      return opts.some(o => !o.value?.trim());
    });
  }

  addQuestion(type: QuestionType): void {
    if (this.hasIncompleteQuestion()) {
      this.showToast('Completa la pregunta y sus opciones antes de agregar otra.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let options: FormArray<any>;

    if (type === 'TRUE_FALSE') {
      options = this.fb.array([
        this.fb.control('Verdadero', Validators.required),
        this.fb.control('Falso',     Validators.required),
      ]);
    } else {
      options = this.fb.array([
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
    this.removingIndex.set(idx);
    setTimeout(() => {
      this.questions.update(list => list.filter((_, i) => i !== idx));
      this.removingIndex.set(null);
    }, 200);
  }

  getOptions(qGroup: FormGroup): FormArray { return qGroup.get('options') as FormArray; }
  getType(qGroup: FormGroup): QuestionType { return qGroup.get('type')?.value as QuestionType; }
  isSingleSelect(qGroup: FormGroup): boolean { return this.getType(qGroup) === 'SINGLE_SELECT'; }
  isTrueFalse(qGroup: FormGroup):    boolean { return this.getType(qGroup) === 'TRUE_FALSE'; }
  isMultiSelect(qGroup: FormGroup):  boolean { return this.getType(qGroup) === 'MULTI_SELECT'; }

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

  onSave(): void {
    if (this.canSubmit()) { this.onSubmit(); return; }

    const fv = this.form.controls;
    if (fv.title.invalid)          { this.showToast('El título del examen es obligatorio.'); return; }
    if (fv.storeId.invalid)        { this.showToast('Selecciona la sucursal a la que pertenece el examen.'); return; }
    if (fv.timeLimitHours.invalid) { this.showToast('Selecciona la duración del examen.'); return; }
    if (fv.passingScore.invalid)   { this.showToast('El puntaje mínimo debe estar entre 1 y 100.'); return; }

    const qs = this.questions();
    if (qs.length < 5) {
      this.showToast(`Necesitas al menos 5 preguntas (tienes ${qs.length}).`);
      return;
    }

    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q.get('questionText')?.value?.trim()) {
        this.showToast(`La pregunta ${i + 1} no tiene texto.`);
        return;
      }
      const type = q.get('type')?.value as QuestionType;
      if (type !== 'TRUE_FALSE') {
        const opts = (q.get('options') as FormArray).controls;
        for (let j = 0; j < opts.length; j++) {
          if (!opts[j].value?.trim()) {
            this.showToast(`La opción ${j + 1} de la pregunta ${i + 1} está vacía.`);
            return;
          }
        }
      }
      if (type === 'MULTI_SELECT') {
        const selected = (q.get('correctOptionIndexes')?.value ?? []) as number[];
        if (selected.length === 0) {
          this.showToast(`Marca al menos una opción correcta en la pregunta ${i + 1}.`);
          return;
        }
      }
    }

    this.showToast('Revisa que todos los campos estén completos.');
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    const fv   = this.form.value;
    const payload = {
      title:       fv.title!,
      description: fv.description || undefined,
      storeId:     fv.storeId!,
      targetAudience: fv.targetAudience!,
      passingScore:     fv.passingScore!,
      timeLimitMinutes: fv.timeLimitHours! * 60,
      questions:        this.buildQuestionsFromForm(),
    };
    try {
      if (this.editMode() && this.editExamId()) {
        await this.trainerSvc.updateExam(this.editExamId()!, payload);
      } else {
        await this.trainerSvc.createExam(payload);
      }
      this.router.navigateByUrl(this.returnUrl());
    } catch (err) {
      this.error.set(this.extractMsg(err));
    } finally {
      this.saving.set(false);
    }
  }

  private extractMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as {
        error?: { message?: string; error?: string; details?: Record<string, string> };
      }).error;
      if (e?.details && typeof e.details === 'object') {
        const first = Object.values(e.details)[0];
        if (first) return first;
      }
      if (e?.message) return e.message;
      if (typeof e?.error === 'string' && e.error) return e.error;
    }
    return 'No se pudo guardar el examen. Verifica los datos e intenta de nuevo.';
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
      if (type === 'TRUE_FALSE' || type === 'SINGLE_SELECT') {
        return { ...base, options: opts, correctOptionIndex: q.get('correctOptionIndex')!.value };
      }
      return { ...base, options: opts, correctOptionIndexes: q.get('correctOptionIndexes')!.value };
    });
  }
}
