import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { AuthService } from '../../features/auth/services/auth.service';
import { homeRedirectGuard } from './home-redirect.guard';

describe('homeRedirectGuard', () => {
  let authenticated = false;

  beforeEach(() => {
    authenticated = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
      ],
    });
  });

  function run(): UrlTree {
    return TestBed.runInInjectionContext(
      () => homeRedirectGuard({} as never, {} as never),
    ) as UrlTree;
  }

  it('sends guests to /auth/login', () => {
    authenticated = false;
    const tree = run();
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/auth/login');
  });

  it('sends signed-in users to /dashboard', () => {
    authenticated = true;
    const tree = run();
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/dashboard');
  });
});
