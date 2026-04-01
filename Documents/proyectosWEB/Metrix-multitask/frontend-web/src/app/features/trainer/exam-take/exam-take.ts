import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TrainerService } from '../services/trainer.service';
import { ExamForTakeResponse, ExamSubmissionResponse } from '../trainer.models';

@Component({
  selector: 'app-exam-take',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './exam-take.html',
})
export class ExamTake implements OnInit, OnDestroy {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly trainerSvc = inject(TrainerService);

  // ── State ─────────────────────────────────────────────────────────────
  readonly exam       = signal<ExamForTakeResponse | null>(null);
  readonly answers    = signal<number[]>([]);
  readonly loading    = signal(true);
  readonly submitting = signal(false);
  readonly error      = signal('');
  readonly result     = signal<ExamSubmissionResponse | null>(null);

  // ── Timer ─────────────────────────────────────────────────────────────
  readonly timeLeft   = signal(0);       // seconds
  readonly startedAt  = signal(0);       // Date.now()
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly timeLeftStr = computed(() => {
    const s = this.timeLeft();
    if (s <= 0) return '00:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  readonly timerWarning = computed(() =>
    this.exam()?.timeLimitMinutes != null && this.timeLeft() <= 60
  );

  // ── Derived ───────────────────────────────────────────────────────────
  readonly allAnswered = computed(() => {
    const exam = this.exam();
    if (!exam) return false;
    const ans = this.answers();
    return ans.length === exam.questions.length && ans.every(a => a >= 0);
  });

  readonly answeredCount = computed(() =>
    this.answers().filter(a => a >= 0).length
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId')!;
    this.trainerSvc.getForTake(examId).then(exam => {
      this.exam.set(exam);
      this.answers.set(new Array(exam.questions.length).fill(-1));
      this.loading.set(false);
      this.startedAt.set(Date.now());

      if (exam.timeLimitMinutes) {
        this.timeLeft.set(exam.timeLimitMinutes * 60);
        this.timerInterval = setInterval(() => {
          this.timeLeft.update(t => {
            if (t <= 1) {
              this.onTimeUp();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    }).catch(() => {
      this.error.set('No se pudo cargar el examen.');
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private onTimeUp(): void {
    this.clearTimer();
    if (!this.result()) this.submit();
  }

  // ── Interactions ──────────────────────────────────────────────────────

  selectAnswer(questionIdx: number, optionIdx: number): void {
    this.answers.update(list => {
      const copy = [...list];
      copy[questionIdx] = optionIdx;
      return copy;
    });
  }

  isSelected(questionIdx: number, optionIdx: number): boolean {
    return this.answers()[questionIdx] === optionIdx;
  }

  async submit(): Promise<void> {
    const exam = this.exam();
    if (!exam || this.submitting()) return;
    this.clearTimer();
    this.submitting.set(true);
    this.error.set('');

    const elapsedSeconds = Math.round((Date.now() - this.startedAt()) / 1000);

    try {
      const r = await this.trainerSvc.submitExam(exam.id, {
        answers: this.answers(),
        timeTakenSeconds: elapsedSeconds,
      });
      this.result.set(r);
    } catch {
      this.error.set('Error al enviar las respuestas. Intenta de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/trainer']);
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-red-600';
  }

  formatTime(seconds?: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}min ${s}s` : `${s}s`;
  }
}
