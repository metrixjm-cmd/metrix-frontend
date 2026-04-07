import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { Login } from './login';
import { ThemeService } from '../../../core/theme.service';
import { AuthService } from '../services/auth.service';
import type { AuthResponse } from '../models/auth.models';

class RouterStub {
  navigateByUrl = vi.fn();
}

class ActivatedRouteStub {
  snapshot = {
    queryParamMap: {
      get: vi.fn().mockReturnValue(null),
    },
  };
}

class AuthServiceStub {
  private readonly _currentUser = signal<any>(null);
  readonly currentUser = this._currentUser.asReadonly();

  setUser(response: AuthResponse | null): void {
    this._currentUser.set(
      response
        ? {
            nombre: response.nombre,
            numeroUsuario: response.numeroUsuario,
            storeId: response.storeId,
            storeName: response.storeName,
            turno: response.turno,
            roles: response.roles,
          }
        : null
    );
  }

  login = vi.fn();
}

describe('Login', () => {
  let router: RouterStub;
  let auth: AuthServiceStub;
  let themeService: ThemeService;

  const adminResponse: AuthResponse = {
    token: 'token-admin',
    numeroUsuario: 'ADMIN001',
    nombre: 'Administrador General',
    storeId: '69a28cd0ac87f10b7122ce7e',
    storeName: 'Sucursal Centro',
    turno: 'MATUTINO',
    roles: ['ADMIN'],
  };

  beforeEach(async () => {
    localStorage.clear();
    router = new RouterStub();
    auth = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        ThemeService,
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
  });

  it('keeps the manually selected login theme after signing in as admin', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;

    themeService.set('orange');
    TestBed.flushEffects();

    component.form.patchValue({
      numeroUsuario: 'ADMIN001',
      password: 'Admin123456',
    });

    auth.login.mockImplementationOnce(() => new Observable<AuthResponse>(subscriber => {
      auth.setUser(adminResponse);
      subscriber.next(adminResponse);
      subscriber.complete();
    }));

    component.onSubmit();
    TestBed.flushEffects();

    expect(themeService.current()).toBe('orange');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orange');

    const preferences = JSON.parse(localStorage.getItem('metrix-theme-preferences') ?? '{}') as Record<string, string>;
    expect(preferences['ADMIN001']).toBe('orange');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
