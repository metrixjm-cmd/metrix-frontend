import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { ExamAudience, ExamResponse } from '../../trainer/trainer.models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-bitacora-examenes',
  standalone: true,
  imports: [RouterLink, AppDatePipe],
  templateUrl: './bitacora-examenes.html',
})
export class BitacoraExamenes implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly trainerSvc = inject(TrainerService);
  private readonly router     = inject(Router);

  readonly loading = this.trainerSvc.loading;
  readonly exams   = this.trainerSvc.exams;

  readonly confirmDeleteExam = signal<ExamResponse | null>(null);
  readonly deleting = signal(false);

  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly isGerenteOnly = computed(() =>
    this.auth.hasRole('GERENTE') && !this.auth.hasRole('ADMIN'));

  readonly activeTab = signal<ExamAudience>('GERENTE');

  readonly examsForGerentes = computed(() =>
    this.exams().filter(e => e.targetAudience === 'GERENTE')
  );

  readonly examsForExecutors = computed(() =>
    this.exams().filter(e => e.targetAudience === 'EJECUTADOR')
  );

  readonly filteredExams = computed(() =>
    this.activeTab() === 'GERENTE' ? this.examsForGerentes() : this.examsForExecutors()
  );

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (this.isGerenteOnly()) {
      this.activeTab.set('EJECUTADOR');
    }
    if (this.isAdmin()) {
      this.trainerSvc.loadAll();
    } else if (user?.storeId) {
      this.trainerSvc.loadByStore(user.storeId);
    }
  }

  goEdit(exam: ExamResponse): void {
    this.router.navigate(['/trainer', exam.id, 'edit'], {
      queryParams: { returnUrl: '/banco-info/bitacora-examenes' },
    });
  }

  goView(exam: ExamResponse): void {
    this.router.navigate(['/trainer', exam.id, 'view'], {
      queryParams: { returnUrl: '/banco-info/bitacora-examenes' },
    });
  }

  async confirmDelete(): Promise<void> {
    const exam = this.confirmDeleteExam();
    if (!exam) return;
    this.deleting.set(true);
    try {
      await this.trainerSvc.deleteExam(exam.id);
    } catch { /* silenciado */ }
    this.deleting.set(false);
    this.confirmDeleteExam.set(null);
  }
}
