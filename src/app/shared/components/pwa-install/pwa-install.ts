import { Component, computed, inject, input } from '@angular/core';

import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  templateUrl: './pwa-install.html',
})
export class PwaInstall {
  private readonly pwa = inject(PwaInstallService);

  /** `card` = sección completa; `banner` = aviso compacto y descartable. */
  readonly variant = input<'card' | 'banner'>('card');
  /** En Ayuda no se oculta aunque el usuario haya dicho "ahora no". */
  readonly persistent = input(false);

  readonly installed = this.pwa.installed;
  readonly canPrompt = this.pwa.canPrompt;
  readonly prompting = this.pwa.prompting;
  readonly isIos = this.pwa.isIos;

  readonly visible = computed(() => {
    if (this.installed()) return this.persistent();
    if (!this.persistent() && this.pwa.dismissed()) return false;
    if (this.variant() === 'banner') return this.canPrompt() || this.isIos();
    return true;
  });

  readonly isBanner = computed(() => this.variant() === 'banner');

  install(): void {
    void this.pwa.install();
  }

  dismiss(): void {
    this.pwa.dismiss();
  }
}
