import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

export type PwaPlatform = 'ios' | 'android' | 'desktop';

/** Evento no tipado aún en lib.dom; lo declara Chrome/Edge/Android. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'metrix-pwa-install-dismissed';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly installed = signal(false);
  readonly canPrompt = signal(false);
  readonly platform = signal<PwaPlatform>('desktop');
  readonly dismissed = signal(false);
  readonly prompting = signal(false);

  readonly isIos = computed(() => this.platform() === 'ios');

  constructor() {
    const win = this.document.defaultView;
    if (!win) return;

    this.platform.set(detectPlatform(win));
    this.installed.set(isRunningAsPwa(win));
    this.dismissed.set(win.localStorage.getItem(DISMISS_KEY) === '1');

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    };
    const onInstalled = () => {
      this.deferredPrompt = null;
      this.canPrompt.set(false);
      this.installed.set(true);
    };

    win.addEventListener('beforeinstallprompt', onBeforeInstall);
    win.addEventListener('appinstalled', onInstalled);
    this.destroyRef.onDestroy(() => {
      win.removeEventListener('beforeinstallprompt', onBeforeInstall);
      win.removeEventListener('appinstalled', onInstalled);
    });
  }

  async install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const promptEvent = this.deferredPrompt;
    if (!promptEvent) return 'unavailable';

    this.prompting.set(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      this.deferredPrompt = null;
      this.canPrompt.set(false);
      if (outcome === 'accepted') this.installed.set(true);
      return outcome;
    } catch {
      return 'unavailable';
    } finally {
      this.prompting.set(false);
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.document.defaultView?.localStorage.setItem(DISMISS_KEY, '1');
  }
}

export function detectPlatform(win: Window): PwaPlatform {
  const nav = win.navigator;
  const ua = nav.userAgent ?? '';
  const isIos = /iPad|iPhone|iPod/i.test(ua)
    || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  if (isIos) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isRunningAsPwa(win: Window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (win.matchMedia?.('(display-mode: standalone)')?.matches) return true;
  if (win.matchMedia?.('(display-mode: window-controls-overlay)')?.matches) return true;
  return false;
}
