import { TestBed } from '@angular/core/testing';

import {
  detectPlatform,
  isRunningAsPwa,
  PwaInstallService,
  type BeforeInstallPromptEvent,
} from './pwa-install.service';

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted'): {
  prompt: ReturnType<typeof vi.fn>;
  event: BeforeInstallPromptEvent;
} {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    platforms: ['web'],
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  window.dispatchEvent(event);
  return { prompt, event };
}

describe('PwaInstallService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('captura beforeinstallprompt y abre el diálogo nativo', async () => {
    const service = TestBed.inject(PwaInstallService);
    const { prompt } = fireBeforeInstallPrompt('accepted');

    expect(service.canPrompt()).toBe(true);

    await expect(service.install()).resolves.toBe('accepted');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(service.installed()).toBe(true);
    expect(service.canPrompt()).toBe(false);
  });

  it('recuerda que el usuario pospuso la instalación', () => {
    const service = TestBed.inject(PwaInstallService);
    service.dismiss();

    expect(service.dismissed()).toBe(true);
    expect(localStorage.getItem('metrix-pwa-install-dismissed')).toBe('1');
  });

  it('detecta iPhone y PWA en modo standalone', () => {
    const iosWin = {
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 },
    } as Window;
    expect(detectPlatform(iosWin)).toBe('ios');

    const standaloneWin = {
      navigator: { userAgent: 'Mozilla/5.0', standalone: true },
      matchMedia: () => ({ matches: false }),
    } as unknown as Window;
    expect(isRunningAsPwa(standaloneWin)).toBe(true);
  });
});
