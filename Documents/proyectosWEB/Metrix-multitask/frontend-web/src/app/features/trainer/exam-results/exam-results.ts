import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrainerService } from '../services/trainer.service';
import { ExamSubmissionResponse } from '../trainer.models';
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

  readonly submissions = signal<ExamSubmissionResponse[]>([]);
  readonly loading     = signal(true);
  readonly examId      = signal('');

  readonly stats = computed(() => {
    const subs = this.submissions();
    if (!subs.length) return null;
    const total   = subs.length;
    const passed  = subs.filter(s => s.passed).length;
    const avgScore = subs.reduce((a, s) => a + s.score, 0) / total;
    const passRate = Math.round((passed / total) * 100);
    return { total, passed, passRate, avgScore };
  });

  // expanded submission for breakdown
  readonly expanded = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('examId')!;
    this.examId.set(id);
    this.trainerSvc.getSubmissions(id).then(subs => {
      this.submissions.set(subs);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  toggleExpand(id: string): void {
    this.expanded.update(cur => cur === id ? null : id);
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
