import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { QuestionBankService } from '../../trainer/services/question-bank.service';
import { ExamTemplateService } from '../../trainer/services/exam-template.service';
import {
  BankQuestion,
  CreateExamTemplateRequest,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  ExamTemplateSummary,
  QUESTION_TYPE_LABELS,
} from '../../trainer/trainer.models';

@Component({
  selector: 'app-plantillas-examen',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './plantillas-examen.html',
})
export class PlantillasExamenComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly auth        = inject(AuthService);
  readonly bankSvc             = inject(QuestionBankService);
  readonly templateSvc         = inject(ExamTemplateService);

  readonly isManager   = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly typeLabels  = QUESTION_TYPE_LABELS;
  readonly diffLabels  = DIFFICULTY_LABELS;
  readonly diffColors  = DIFFICULTY_COLORS;

  // ── Form toggle ────────────────────────────────────────────────────────
  readonly showForm = signal(false);
  readonly saving   = signal(false);
  readonly error    = signal('');

  toggleForm(): void {
    this.showForm.update(v => !v);
    this.error.set('');
    this.selectedBankQs.set([]);
    this.form.reset({ passingScore: 70, shuffleQuestions: false, shuffleOptions: false, maxAttempts: 0 });
    if (this.showForm() && this.bankSvc.questions().length === 0) {
      this.bankSvc.loadQuestions({ storeId: this.auth.currentUser()?.storeId });
    }
  }

  // ── Formulario plantilla ───────────────────────────────────────────────
  readonly form = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(120)]],
    description:      [''],
    category:         [''],
    passingScore:     [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    timeLimitMinutes: [null as number | null],
    shuffleQuestions: [false],
    shuffleOptions:   [false],
    maxAttempts:      [0, [Validators.min(0)]],
    tags:             [''],
  });

  // ── Picker de preguntas ────────────────────────────────────────────────
  readonly bankSearch     = signal('');
  readonly selectedBankQs = signal<BankQuestion[]>([]);

  readonly filteredBank = computed(() => {
    const q        = this.bankSearch().toLowerCase();
    const selected = new Set(this.selectedBankQs().map(bq => bq.id));
    return this.bankSvc.questions()
      .filter(bq => !selected.has(bq.id))
      .filter(bq => !q || bq.questionText.toLowerCase().includes(q));
  });

  addFromBank(bq: BankQuestion): void { this.selectedBankQs.update(list => [...list, bq]); }
  removeFromBank(id: string): void { this.selectedBankQs.update(list => list.filter(bq => bq.id !== id)); }

  readonly canSubmit = computed(() =>
    this.form.valid && this.selectedBankQs().length > 0
  );

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    const fv = this.form.value;
    const req: CreateExamTemplateRequest = {
      title:            fv.title!,
      description:      fv.description || undefined,
      category:         fv.category   || undefined,
      passingScore:     fv.passingScore!,
      timeLimitMinutes: fv.timeLimitMinutes || undefined,
      shuffleQuestions: fv.shuffleQuestions ?? false,
      shuffleOptions:   fv.shuffleOptions   ?? false,
      maxAttempts:      fv.maxAttempts       ?? 0,
      tags:             fv.tags ? (fv.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      storeId:          this.auth.currentUser()?.storeId,
      questions:        this.selectedBankQs().map((bq, i) => ({
        questionId:     bq.id,
        order:          i + 1,
        pointsOverride: 0,
      })),
    };
    try {
      await this.templateSvc.createTemplate(req);
      this.toggleForm();
    } catch {
      this.error.set('No se pudo guardar la plantilla.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  readonly deleting = signal<string | null>(null);

  async onDelete(tmpl: ExamTemplateSummary): Promise<void> {
    if (!confirm(`¿Eliminar la plantilla "${tmpl.title}"?`)) return;
    this.deleting.set(tmpl.id);
    try {
      await this.templateSvc.deleteTemplate(tmpl.id);
    } catch {
      this.error.set('No se pudo eliminar la plantilla.');
    } finally {
      this.deleting.set(null);
    }
  }

  ngOnInit(): void {
    this.templateSvc.loadSummaries();
  }
}
