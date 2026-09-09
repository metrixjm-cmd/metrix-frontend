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
  readonly copiedKey = signal<string | null>(null);
  readonly instances = signal<MetrixInstance[]>([]);
  readonly trialDelta = signal(1);

  ngOnInit(): void {
    this.reload();
  }

  async copyText(event: MouseEvent, instanceId: string, kind: 'codigo' | 'admin', value: string | null | undefined): Promise<void> {
    event.stopPropagation();
    const text = value?.trim();
    if (!text) return;
    const key = `${instanceId}:${kind}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    this.copiedKey.set(key);
    setTimeout(() => {
      if (this.copiedKey() === key) this.copiedKey.set(null);
    }, 1200);
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
        this.error.set(this.apiMessage(err, 'No se pudieron cargar las instancias.'));
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
        this.actionError.set(this.apiMessage(err, `No se pudo ${label} la instancia.`));
        this.busyId.set(null);
      },
    });
  }

  deleteInstance(instance: MetrixInstance): void {
    const ok = confirm(
      `¿Eliminar permanentemente "${instance.empresaNombre}"?\n\n` +
        'Se borrará la instancia, el acceso de login y la base de datos del cliente. Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    this.busyId.set(instance.id);
    this.actionError.set('');
    this.platformSvc.deleteInstance(instance.id).subscribe({
      next: () => {
        this.instances.update(list => list.filter(i => i.id !== instance.id));
        this.busyId.set(null);
      },
      error: err => {
        this.actionError.set(this.apiMessage(err, 'No se pudo eliminar la instancia.'));
        this.busyId.set(null);
      },
    });
  }

  canAdjustTrial(instance: MetrixInstance): boolean {
    return (instance.onTrial === true && instance.status === 'ACTIVE')
      || instance.suspensionReason === 'TRIAL_EXPIRED';
  }

  canSubtractTrial(instance: MetrixInstance): boolean {
    if (!instance.onTrial || instance.status !== 'ACTIVE' || !instance.trialEndsAt) {
      return false;
    }
    return new Date(instance.trialEndsAt).getTime() > Date.now();
  }

  remainingTrialDays(instance: MetrixInstance): number | null {
    if (!instance.onTrial || !instance.trialEndsAt) return null;
    const ms = new Date(instance.trialEndsAt).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / 86_400_000);
  }

  onTrialDeltaInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const n = Number.isFinite(raw) ? Math.trunc(raw) : 1;
    this.trialDelta.set(Math.min(365, Math.max(1, n)));
  }

  adjustTrial(instance: MetrixInstance, sign: 1 | -1): void {
    const days = this.trialDelta();
    const deltaDays = sign * days;
    const verb = sign > 0 ? `sumar ${days} día(s)` : `restar ${days} día(s)`;
    if (!confirm(`¿${verb} de prueba a "${instance.empresaNombre}"?`)) {
      return;
    }

    this.busyId.set(instance.id);
    this.actionError.set('');
    this.platformSvc.adjustTrial(instance.id, deltaDays).subscribe({
      next: updated => {
        this.instances.update(list =>
          list.map(i => (i.id === updated.id ? updated : i)),
        );
        this.busyId.set(null);
      },
      error: err => {
        this.actionError.set(this.apiMessage(err, 'No se pudo ajustar el periodo de prueba.'));
        this.busyId.set(null);
      },
    });
  }

  private apiMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { error?: string; message?: string; details?: Record<string, string> } })?.error;
    if (body?.details && typeof body.details === 'object') {
      const first = Object.values(body.details)[0];
      if (first) return String(first);
    }
    return body?.message || body?.error || fallback;
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
