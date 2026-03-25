import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrainerService } from '../services/trainer.service';
import { ExamStats, ExamSubmissionResponse, ReviewOpenTextItem } from '../trainer.models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [RouterLink, AppDatePipe, DecimalPipe],
  templateUrl: './exam-results.html',
})
export class ExamResults implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly trainerSvc = inject(TrainerService);

  readonly submissions  = signal<ExamSubmissionResponse[]>([]);
  readonly stats        = signal<ExamStats | null>(null);
  readonly loading      = signal(true);
  readonly examId       = signal('');

  readonly summaryStats = computed(() => {
    const subs = this.submissions();
    if (!subs.length) return null;
    const total    = subs.length;
    const passed   = subs.filter(s => s.passed).length;
    const avgScore = subs.reduce((a, s) => a + s.score, 0) / total;
    const passRate = Math.round((passed / total) * 100);
    const pending  = subs.filter(s => s.hasPendingReview && !s.reviewed).length;
    return { total, passed, passRate, avgScore, pending };
  });

  // ── Expanded row ───────────────────────────────────────────────────────
  readonly expanded = signal<string | null>(null);

  toggleExpand(id: string): void {
    this.expanded.update(cur => cur === id ? null : id);
    this.reviewState.set(null);
  }

  // ── Review OPEN_TEXT ───────────────────────────────────────────────────
  readonly reviewState  = signal<string | null>(null);  // submissionId in review mode
  readonly reviewItems  = signal<ReviewOpenTextItem[]>([]);
  readonly reviewing    = signal(false);
  readonly reviewError  = signal('');

  startReview(sub: ExamSubmissionResponse): void {
    this.reviewState.set(sub.id);
    this.expanded.set(sub.id);
    this.reviewError.set('');
    // Init review items for all pending OPEN_TEXT questions
    const items: ReviewOpenTextItem[] = (sub.questionResults ?? [])
      .map((qr, i) => ({ questionIndex: i, approved: qr.correct }));
    this.reviewItems.set(items);
  }

  setReviewApproval(questionIndex: number, approved: boolean): void {
    this.reviewItems.update(items =>
      items.map(item => item.questionIndex === questionIndex ? { ...item, approved } : item)
    );
  }

  isApproved(questionIndex: number): boolean {
    return this.reviewItems().find(i => i.questionIndex === questionIndex)?.approved ?? false;
  }

  async submitReview(sub: ExamSubmissionResponse): Promise<void> {
    this.reviewing.set(true);
    this.reviewError.set('');
    try {
      // Only send items where question isPendingReview
      const pendingItems = this.reviewItems().filter((_, i) => {
        const qr = sub.questionResults?.[i];
        return qr?.pendingReview ?? false;
      });
      const updated = await this.trainerSvc.reviewOpenText(sub.examId, sub.id, { reviews: pendingItems });
      this.submissions.update(list => list.map(s => s.id === updated.id ? updated : s));
      this.reviewState.set(null);
    } catch {
      this.reviewError.set('No se pudo guardar la revisión.');
    } finally {
      this.reviewing.set(false);
    }
  }

  cancelReview(): void {
    this.reviewState.set(null);
    this.reviewError.set('');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('examId')!;
    this.examId.set(id);
    Promise.all([
      this.trainerSvc.getSubmissions(id),
      this.trainerSvc.getExamStats(id),
    ]).then(([subs, s]) => {
      this.submissions.set(subs);
      this.stats.set(s);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  scoreClass(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-red-600';
  }

  formatTime(seconds?: number): string {
    if (!seconds || seconds < 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}min ${s}s` : `${s}s`;
  }

  fraudLabel(flag: string): string {
    const map: Record<string, string> = {
      RESPUESTA_MUY_RAPIDA:         'Respuesta muy rápida',
      PUNTAJE_PERFECTO_PRIMER_INTENTO: 'Perfecto en 1er intento',
    };
    return map[flag] ?? flag;
  }
}
