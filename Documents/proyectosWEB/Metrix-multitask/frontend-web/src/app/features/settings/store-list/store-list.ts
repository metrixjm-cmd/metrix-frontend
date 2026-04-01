import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../services/settings.service';
import { StoreResponse } from '../settings.models';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './store-list.html',
})
export class StoreList implements OnInit {
  private readonly authSvc     = inject(AuthService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly router      = inject(Router);

  readonly loading = this.settingsSvc.loading;
  readonly error   = this.settingsSvc.error;
  readonly stores  = this.settingsSvc.stores;

  readonly isAdmin = computed(() => this.authSvc.hasRole('ADMIN'));

  ngOnInit(): void {
    this.settingsSvc.loadAll();
  }

  goToDetail(store: StoreResponse): void {
    this.router.navigate(['/banco-info/sucursales', store.id]);
  }
}
