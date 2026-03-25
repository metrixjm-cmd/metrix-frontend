import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerService } from '../services/trainer.service';
import { AttemptInfo, ExamAnswer, ExamForTakeResponse, ExamSubmissionResponse, QuestionType } from '../trainer.models';

@Component({
  selector: 'app-exam-take',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule],
  templateUrl: './exam-take.html',
})
export class ExamTake implements OnInit, OnDestroy {
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly trainerSvc  = inject(TrainerService);

  // ── Estado ─────────────────────────────────────────────────────────────
  readonly exam        = signal<ExamForTakeResponse | null>(null);
  readonly attemptInfo = signal<AttemptInfo | null>(null);
  readonly answers     = signal<ExamAnswer[]>([]);
  readonly loading     = signal(true);
  readonly submitting  = signal(false);
  readonly error       = signal('');
  readonly result      = signal<ExamSubmissionResponse | null>(null);

  readonly blocked = computed(() => {
    const info = this.attemptInfo();
    return info !== null && !info.canAttempt;
  });

  // ── Timer ──────────────────────────────────────────────────────────────
  readonly timeLeft   = signal(0);
  readonly startedAt  = signal(0);
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly timeLeftStr = computed(() => {
    const s = this.timeLeft();
    if (s <= 0) return '00:00';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  readonly timerWarning = computed(() =>
    this.exam()?.timeLimitMinutes != null && this.timeLeft() <= 60
  );

  // ── Derived ────────────────────────────────────────────────────────────

  readonly allAnswered = computed(() => {
    const exam = this.exam();
    if (!exam) return false;
    const ans  = this.answers();
    return ans.length === exam.questions.length &&
      exam.questions.every((q, i) => this.isAnswered(q.type, ans[i]));
  });

  readonly answeredCount = computed(() => {
    const exam = this.exam();
    if (!exam) return 0;
    return this.answers().filter((a, i) =>
      this.isAnswered(exam.questions[i]?.type ?? 'MULTIPLE_CHOICE', a)
    ).length;
  });

  private isAnswered(type: QuestionType, a: ExamAnswer): boolean {
    if (!a) return false;
    if (type === 'MULTI_SELECT')  return (a.selectedIndexes ?? []).length > 0;
    if (type === 'OPEN_TEXT')     return (a.textAnswer ?? '').trim().length > 0;
    return (a.selectedIndex ?? -1) >= 0;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId')!;
    Promise.all([
      this.trainerSvc.getForTake(examId),
      this.trainerSvc.getAttemptInfo(examId),
    ]).then(([exam, info]) => {
      this.exam.set(exam);
      this.attemptInfo.set(info);
      this.loading.set(false);
      if (!info.canAttempt) return; // bloqueado — no iniciar timer
      this.answers.set(exam.questions.map(() => ({})));
      this.startedAt.set(Date.now());
      if (exam.timeLimitMinutes) {
        this.timeLeft.set(exam.timeLimitMinutes * 60);
        this.timerInterval = setInterval(() => {
          this.timeLeft.update(t => {
            if (t <= 1) { this.onTimeUp(); return 0; }
            return t - 1;
          });
        }, 1000);
      }
    }).catch(() => {
      this.error.set('No se pudo cargar el examen.');
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void { this.clearTimer(); }

  private clearTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = undefined; }
  }

  private onTimeUp(): void {
    this.clearTimer();
    if (!this.result()) this.submit();
  }

  // ── MULTIPLE_CHOICE / TRUE_FALSE ────────────────────────────────────────

  selectAnswer(qIdx: number, optIdx: number): void {
    this.answers.update(list => {
      const copy = [...list];
      copy[qIdx] = { selectedIndex: optIdx };
      return copy;
    });
  }

  isSelected(qIdx: number, optIdx: number): boolean {
    return (this.answers()[qIdx]?.selectedIndex ?? -1) === optIdx;
  }

  // ── MULTI_SELECT ─────────────────────────────────────────────────────────

  toggleMulti(qIdx: number, optIdx: number): void {
    this.answers.update(list => {
      const copy     = [...list];
      const current  = copy[qIdx]?.selectedIndexes ?? [];
      const has      = current.includes(optIdx);
      copy[qIdx]     = { selectedIndexes: has ? current.filter(i => i !== optIdx) : [...current, optIdx] };
      return copy;
    });
  }

  isMultiSelected(qIdx: number, optIdx: number): boolean {
    return (this.answers()[qIdx]?.selectedIndexes ?? []).includes(optIdx);
  }

  // ── OPEN_TEXT ─────────────────────────────────────────────────────────────

  setTextAnswer(qIdx: number, text: string): void {
    this.answers.update(list => {
      const copy = [...list];
      copy[qIdx] = { textAnswer: text };
      return copy;
    });
  }

  getTextAnswer(qIdx: number): string {
    return this.answers()[qIdx]?.textAnswer ?? '';
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async submit(): Promise<void> {
    const exam = this.exam();
    if (!exam || this.submitting()) return;
    this.clearTimer();
    this.submitting.set(true);
    this.error.set('');
    const elapsed = Math.round((Date.now() - this.startedAt()) / 1000);
    try {
      const r = await this.trainerSvc.submitExam(exam.id, {
        answers:         this.answers(),
        timeTakenSeconds: elapsed,
      });
      this.result.set(r);
    } catch {
      this.error.set('Error al enviar las respuestas. Intenta de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }

  goBack(): void { this.router.navigate(['/trainer']); }

  scoreClass(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-red-600';
  }

  formatTime(seconds?: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return m > 0 ? `${m}min ${s}s` : `${s}s`;
  }
}
