import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { SettingsService } from '../../settings/services/settings.service';

interface EntityCard {
  label: string;
  description: string;
  route: string;
  iconPath: string;
  stat?: () => number | string;
  statLabel?: string;
  adminOnly?: boolean;
}

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

  readonly isAdmin   = computed(() => this.auth.hasRole('ADMIN'));
  readonly isManager = computed(() => this.auth.hasAnyRole('ADMIN', 'GERENTE'));

  readonly totalUsers   = computed(() => this.rhSvc.users().length);
  readonly totalStores  = computed(() => this.settingsSvc.stores().length);
  readonly activeUsers  = computed(() => this.rhSvc.users().filter(u => u.activo).length);
  readonly activeStores = computed(() => this.settingsSvc.stores().filter(s => s.activo).length);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.storeId) this.rhSvc.loadUsersByStore(user.storeId);
    if (this.isAdmin()) this.settingsSvc.loadAll();
  }
}
