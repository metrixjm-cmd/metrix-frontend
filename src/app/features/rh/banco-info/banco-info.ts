import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { QuestionBankService } from '../../trainer/services/question-bank.service';
import { ExamTemplateService } from '../../trainer/services/exam-template.service';

@Component({
  selector: 'app-banco-info',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './banco-info.html',
})
export class BancoInfo implements OnInit {
  private readonly auth        = inject(AuthService);
  private readonly rhSvc       = inject(RhService);
  private readonly settingsSvc = inject(SettingsService);
  readonly catalogSvc          = inject(CatalogService);
  readonly bankSvc             = inject(QuestionBankService);
  readonly templateSvc         = inject(ExamTemplateService);

  readonly isAdmin   = computed(() => this.auth.hasRole('ADMIN'));
  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  readonly totalUsers      = computed(() => this.rhSvc.users().length);
  readonly totalStores     = computed(() => this.settingsSvc.stores().length);
  readonly activeUsers     = computed(() => this.rhSvc.users().filter(u => u.activo).length);
  readonly activeStores    = computed(() => this.settingsSvc.stores().filter(s => s.activo).length);
  readonly totalCategorias = computed(() => this.catalogSvc.categorias().length);
  readonly totalBankQs     = computed(() => this.bankSvc.questions().length);
  readonly totalTemplates  = computed(() => this.templateSvc.summaries().length);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    if (this.isAdmin()) this.settingsSvc.loadAll();
    this.catalogSvc.loadCategorias();
    this.bankSvc.loadQuestions({ storeId: user?.storeId });
    this.templateSvc.loadSummaries();
  }
}
