import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { PlatformService } from '../services/platform.service';
import { MetrixInstance, MetrixInstanceStatus } from '../platform.models';

@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './instance-list.html',
})
export class InstanceList implements OnInit {
  private readonly platformSvc = inject(PlatformService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly busyId = signal<string | null>(null);
  readonly instances = signal<MetrixInstance[]>([]);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.platformSvc.listInstances().subscribe({
      next: list => {
        this.instances.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'No se pudieron cargar las instancias.');
        this.loading.set(false);
      },
    });
  }

  toggleStatus(instance: MetrixInstance): void {
    const next: MetrixInstanceStatus = instance.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const label = next === 'SUSPENDED' ? 'suspender' : 'reactivar';
    if (!confirm(`¿Seguro que quieres ${label} "${instance.empresaNombre}"?`)) {
      return;
    }

    this.busyId.set(instance.id);
    this.actionError.set('');
    this.platformSvc.updateStatus(instance.id, next).subscribe({
      next: updated => {
        this.instances.update(list =>
          list.map(i => (i.id === updated.id ? updated : i)),
        );
        this.busyId.set(null);
      },
      error: err => {
        this.actionError.set(
          err?.error?.error ?? err?.error?.message ?? `No se pudo ${label} la instancia.`,
        );
        this.busyId.set(null);
      },
    });
  }

  limitsLabel(i: MetrixInstance): string {
    const users = i.maxUsuarios != null ? `${i.maxUsuarios} usuarios` : 'usuarios n/d';
    const branches = i.sucursalesContratadas != null
      ? `${i.sucursalesContratadas} suc.`
      : (i.maxSucursales != null ? `máx ${i.maxSucursales} suc.` : 'suc. n/d');
    return `${users} · ${branches}`;
  }

  modulesLabel(i: MetrixInstance): string {
    const codes = i.featureCodes ?? [];
    if (codes.length === 0) return 'Operación básica';
    return codes.join(' · ');
  }
}
