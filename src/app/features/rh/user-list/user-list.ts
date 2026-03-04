import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/services/auth.service';
import { RhService } from '../services/rh.service';
import { ROL_LABELS, TURNOS, UserProfile } from '../rh.models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-list.html',
})
export class UserList implements OnInit {
  private readonly authSvc   = inject(AuthService);
  private readonly rhSvc     = inject(RhService);
  private readonly router    = inject(Router);

  readonly loading  = this.rhSvc.loading;
  readonly error    = this.rhSvc.error;
  readonly rolLabels: Record<string, string | undefined> = ROL_LABELS;
  readonly turnos   = TURNOS;

  // ── Filtros ───────────────────────────────────────────────────────────────
  filterTurno = signal<string>('');
  filterRol   = signal<string>('');

  readonly filteredUsers = computed(() => {
    let list = this.rhSvc.users();
    const turno = this.filterTurno();
    const rol   = this.filterRol();
    if (turno) list = list.filter(u => u.turno === turno);
    if (rol)   list = list.filter(u => u.roles.includes(rol));
    return list;
  });

  readonly isAdmin   = computed(() => this.authSvc.hasRole('ADMIN'));
  readonly isGerente = computed(() => this.authSvc.hasAnyRole('ADMIN', 'GERENTE'));

  ngOnInit(): void {
    const user = this.authSvc.currentUser();
    if (user?.storeId) {
      this.rhSvc.loadUsersByStore(user.storeId);
    }
  }

  goToProfile(user: UserProfile): void {
    this.router.navigate(['/rh', user.id]);
  }

  igeoClass(igeo: number): string {
    if (igeo >= 80) return 'bg-emerald-100 text-emerald-700';
    if (igeo >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }
}
