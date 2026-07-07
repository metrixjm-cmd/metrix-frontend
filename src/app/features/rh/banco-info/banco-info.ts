import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { TaskTemplateService } from '../../tasks/services/task-template.service';

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
  readonly trainerSvc          = inject(TrainerService);
  readonly taskTemplateSvc     = inject(TaskTemplateService);

  readonly isAdmin   = computed(() => this.auth.hasRole('ADMIN'));
  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  readonly totalUsers      = computed(() => this.rhSvc.users().length);
  readonly totalStores     = computed(() => this.settingsSvc.stores().length);
  readonly activeUsers     = computed(() => this.rhSvc.users().filter(u => u.activo).length);
  readonly activeStores    = computed(() => this.settingsSvc.stores().filter(s => s.activo).length);
  readonly totalCategorias = computed(() => this.catalogSvc.categorias().length);
  readonly totalTaskTemplates = computed(() => this.taskTemplateSvc.templates().length);
  readonly totalExams      = computed(() => this.trainerSvc.exams().length);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (this.isAdmin()) {
      // ADMIN no tiene sucursal: usar endpoint global en vez de scope por storeId.
      this.rhSvc.loadAll();
      this.settingsSvc.loadAll();
    } else if (user?.storeId) {
      this.rhSvc.loadUsersByStore(user.storeId);
    }
    if (this.isAdmin()) {
      this.trainerSvc.loadAll();
    } else if (user?.storeId) {
      this.trainerSvc.loadByStore(user.storeId);
    }
    this.taskTemplateSvc.loadAll().catch(() => undefined);
    this.catalogSvc.loadCategorias();
  }
}
