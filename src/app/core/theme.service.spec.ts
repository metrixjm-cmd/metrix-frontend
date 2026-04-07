import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ThemeService } from './theme.service';
import { AuthService } from '../features/auth/services/auth.service';
import type { CurrentUser } from '../features/auth/models/auth.models';

class AuthServiceStub {
  private readonly _currentUser = signal<CurrentUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  setUser(user: CurrentUser | null): void {
    this._currentUser.set(user);
  }
}

describe('ThemeService', () => {
  let service: ThemeService;
  let authStub: AuthServiceStub;

  const adminUser: CurrentUser = {
    nombre: 'Admin Test',
    numeroUsuario: 'ADMIN001',
    storeId: '1',
    storeName: 'Sucursal Centro',
    turno: 'Manana',
    roles: ['ADMIN'],
  };

  beforeEach(() => {
    localStorage.clear();

    authStub = new AuthServiceStub();

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: AuthService, useValue: authStub },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('applies the profile theme when the user did not manually pick one', () => {
    authStub.setUser(adminUser);
    TestBed.flushEffects();

    expect(service.current()).toBe('blue');
    expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
  });

  it('keeps the manual login selection after the user signs in', () => {
    service.set('orange');
    TestBed.flushEffects();

    expect(service.current()).toBe('orange');
    expect(localStorage.getItem('metrix-theme-guest')).toBe('orange');

    authStub.setUser(adminUser);
    service.assignLoginSelectionToUser(adminUser.numeroUsuario);
    TestBed.flushEffects();

    expect(service.current()).toBe('orange');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orange');

    const preferences = JSON.parse(localStorage.getItem('metrix-theme-preferences') ?? '{}') as Record<string, string>;
    expect(preferences[adminUser.numeroUsuario]).toBe('orange');
  });
});
