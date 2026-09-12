import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PwaInstallService } from '../../../core/services/pwa-install.service';
import { PwaInstall } from './pwa-install';

describe('PwaInstall', () => {
  const canPrompt = signal(true);
  const installed = signal(false);
  const prompting = signal(false);
  const dismissed = signal(false);
  const install = vi.fn();
  const dismiss = vi.fn();

  beforeEach(async () => {
    canPrompt.set(true);
    installed.set(false);
    prompting.set(false);
    dismissed.set(false);
    install.mockReset();
    dismiss.mockReset();

    await TestBed.configureTestingModule({
      imports: [PwaInstall],
      providers: [
        {
          provide: PwaInstallService,
          useValue: {
            installed,
            canPrompt,
            prompting,
            dismissed,
            isIos: signal(false),
            install,
            dismiss,
          },
        },
      ],
    }).compileComponents();
  });

  it('muestra el botón Instalar METRIX cuando el navegador ofrece el diálogo', () => {
    const fixture = TestBed.createComponent(PwaInstall);
    fixture.componentRef.setInput('variant', 'card');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Instalar METRIX');
  });

  it('llama al servicio al pulsar Instalar', () => {
    const fixture = TestBed.createComponent(PwaInstall);
    fixture.componentRef.setInput('variant', 'card');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button.ds-btn--primary').click();
    expect(install).toHaveBeenCalledTimes(1);
  });
});
