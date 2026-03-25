import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { ExamResponse } from '../trainer.models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-trainer-home',
  standalone: true,
  imports: [RouterLink, AppDatePipe, DecimalPipe],
  templateUrl: './trainer-home.html',
})
export class TrainerHome implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly router    = inject(Router);

  readonly loading   = this.trainerSvc.loading;
  readonly exams     = this.trainerSvc.exams;
  readonly mySubs    = this.trainerSvc.mySubmissions;
  readonly attempted = this.trainerSvc.attemptedExamIds;
  readonly lastSub   = this.trainerSvc.lastSubmissionByExam;

  readonly isManager = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('GERENTE');
  });

  readonly statsCards = computed(() => {
    const exams = this.exams();
    const total = exams.length;
    const avgPass = total > 0
      ? Math.round(exams.reduce((s, e) => s + e.passRate, 0) / total)
      : 0;
    const totalSubs = exams.reduce((s, e) => s + e.submissionCount, 0);
    return { total, avgPass, totalSubs };
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.storeId) {
      this.trainerSvc.loadByStore(user.storeId);
    }
    this.trainerSvc.loadMySubmissions();
  }

  goTake(exam: ExamResponse): void {
    this.router.navigate(['/trainer', exam.id, 'take']);
  }

  goResults(exam: ExamResponse): void {
    this.router.navigate(['/trainer', exam.id, 'results']);
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-red-600';
  }

  passRateColor(rate: number): string {
    if (rate >= 70) return 'bg-emerald-500';
    if (rate >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }
}
