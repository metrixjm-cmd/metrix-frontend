import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { CreateExamQuestionDto, QuestionType } from '../trainer.models';

@Component({
  selector: 'app-exam-builder',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './exam-builder.html',
})
export class ExamBuilder {
  private readonly fb        = inject(FormBuilder);
  private readonly auth      = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly router    = inject(Router);

  readonly saving  = signal(false);
  readonly error   = signal('');

  readonly todayMin = new Date().toISOString().slice(0, 16);

  // ── Main form ─────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(120)]],
    description:      [''],
    passingScore:     [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    timeLimitMinutes: [null as number | null],
  });

  // ── Questions array ───────────────────────────────────────────────────
  readonly questions = signal<FormGroup[]>([]);

  readonly canSubmit = computed(() =>
    this.form.valid && this.questions().length > 0 &&
    this.questions().every(q => q.valid)
  );

  // ── Question helpers ──────────────────────────────────────────────────

  addQuestion(type: QuestionType): void {
    const options = type === 'TRUE_FALSE'
      ? this.fb.array([
          this.fb.control('Verdadero', Validators.required),
          this.fb.control('Falso', Validators.required),
        ])
      : this.fb.array([
          this.fb.control('', Validators.required),
          this.fb.control('', Validators.required),
          this.fb.control('', Validators.required),
          this.fb.control('', Validators.required),
        ]);

    const qGroup = this.fb.group({
      questionText:       ['', [Validators.required, Validators.maxLength(400)]],
      type:               [type],
      options:            options,
      correctOptionIndex: [0, Validators.required],
      points:             [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    });

    this.questions.update(list => [...list, qGroup]);
  }

  removeQuestion(idx: number): void {
    this.questions.update(list => list.filter((_, i) => i !== idx));
  }

  getOptions(qGroup: FormGroup): FormArray {
    return qGroup.get('options') as FormArray;
  }

  isTrueFalse(qGroup: FormGroup): boolean {
    return qGroup.get('type')?.value === 'TRUE_FALSE';
  }

  setCorrect(qGroup: FormGroup, idx: number): void {
    qGroup.get('correctOptionIndex')?.setValue(idx);
  }

  isCorrect(qGroup: FormGroup, idx: number): boolean {
    return qGroup.get('correctOptionIndex')?.value === idx;
  }

  // ── Submit ────────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');

    const user = this.auth.currentUser()!;
    const fv = this.form.value;

    const questionsDto: CreateExamQuestionDto[] = this.questions().map(q => ({
      questionText:       q.get('questionText')!.value,
      type:               q.get('type')!.value as QuestionType,
      options:            (q.get('options') as FormArray).controls.map(c => c.value as string),
      correctOptionIndex: q.get('correctOptionIndex')!.value,
      points:             q.get('points')!.value,
    }));

    try {
      const exam = await this.trainerSvc.createExam({
        title:            fv.title!,
        description:      fv.description || undefined,
        storeId:          user.storeId!,
        passingScore:     fv.passingScore!,
        timeLimitMinutes: fv.timeLimitMinutes || undefined,
        questions:        questionsDto,
      });
      this.router.navigate(['/trainer']);
    } catch {
      this.error.set('No se pudo guardar el examen. Verifica los datos e intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}
