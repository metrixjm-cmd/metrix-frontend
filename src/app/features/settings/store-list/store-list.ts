import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../auth/services/auth.service';
import { SettingsService } from '../services/settings.service';
import { StoreResponse } from '../settings.models';

type FilterType = 'all' | 'active' | 'inactive';

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

  // ── Filtro ───────────────────────────────────────────────────────────
  readonly filter      = signal<FilterType>('all');

  readonly activeCount   = computed(() => this.stores().filter(s => s.activo).length);
  readonly inactiveCount = computed(() => this.stores().filter(s => !s.activo).length);

  readonly filteredStores = computed(() => {
    const f = this.filter();
    if (f === 'active')   return this.stores().filter(s => s.activo);
    if (f === 'inactive') return this.stores().filter(s => !s.activo);
    return this.stores();
  });

  ngOnInit(): void {
    this.settingsSvc.loadAll();
  }

  goToDetail(store: StoreResponse): void {
    this.router.navigate(['/banco-info/sucursales', store.id]);
  }

  setFilter(f: FilterType): void {
    this.filter.set(f);
  }

  clearFilter(): void {
    this.filter.set('all');
  }
}
