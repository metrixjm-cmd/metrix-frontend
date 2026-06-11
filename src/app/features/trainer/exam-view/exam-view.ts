import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrainerService } from '../services/trainer.service';
import { ExamQuestion, ExamResponse, QUESTION_TYPE_LABELS } from '../trainer.models';

@Component({
  selector: 'app-exam-view',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './exam-view.html',
})
export class ExamView implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly trainerSvc = inject(TrainerService);

  readonly exam = signal<ExamResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly returnUrl = signal('/trainer');
  readonly typeLabels = QUESTION_TYPE_LABELS;

  async ngOnInit(): Promise<void> {
    const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requestedReturnUrl) {
      this.returnUrl.set(requestedReturnUrl);
    }

    const examId = this.route.snapshot.paramMap.get('examId');
    if (!examId) {
      this.error.set('No se encontró el examen.');
      this.loading.set(false);
      return;
    }

    try {
      this.exam.set(await this.trainerSvc.getById(examId));
    } catch {
      this.error.set('No se pudo cargar el examen.');
    } finally {
      this.loading.set(false);
    }
  }

  isCorrectOption(question: ExamQuestion, optionIndex: number): boolean {
    if (question.type === 'MULTI_SELECT') {
      return (question.correctOptionIndexes ?? []).includes(optionIndex);
    }
    return question.correctOptionIndex === optionIndex;
  }
}
