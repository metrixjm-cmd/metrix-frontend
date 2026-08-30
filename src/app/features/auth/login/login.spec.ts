import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { Login } from './login';
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
  let route: ActivatedRouteStub;

  const adminResponse: AuthResponse = {
    token: 'token-admin',
    numeroUsuario: 'ADMIN001',
    nombre: 'Administrador General',
    storeId: '69a28cd0ac87f10b7122ce7e',
    storeName: 'Sucursal Centro',
    turno: 'MATUTINO',
    roles: ['ADMIN'],
  };

  /** Simula un login exitoso: publica el usuario y emite la respuesta. */
  function stubSuccessfulLogin(): void {
    auth.login.mockImplementationOnce(() => new Observable<AuthResponse>(subscriber => {
      auth.setUser(adminResponse);
      subscriber.next(adminResponse);
      subscriber.complete();
    }));
  }

  beforeEach(async () => {
    localStorage.clear();
    router = new RouterStub();
    auth = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    route = TestBed.inject(ActivatedRoute) as unknown as ActivatedRouteStub;
  });

  it('redirects to the dashboard after signing in without returnUrl', () => {
    const component = TestBed.createComponent(Login).componentInstance;

    component.form.patchValue({
      numeroUsuario: 'ADMIN001',
      password: 'Admin123456',
    });
    stubSuccessfulLogin();

    component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('honours the returnUrl the guard preserved', () => {
    route.snapshot.queryParamMap.get.mockReturnValue('/kpi');
    const component = TestBed.createComponent(Login).componentInstance;

    component.form.patchValue({
      numeroUsuario: 'ADMIN001',
      password: 'Admin123456',
    });
    stubSuccessfulLogin();

    component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/kpi');
  });
});
