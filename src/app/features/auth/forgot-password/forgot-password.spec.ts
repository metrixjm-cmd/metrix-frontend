import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable } from 'rxjs';

import { ForgotPassword } from './forgot-password';
import { AuthService } from '../services/auth.service';

class AuthServiceStub {
  requestPasswordReset = vi.fn();
}

describe('ForgotPassword', () => {
  let auth: AuthServiceStub;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('sends codigoEmpresa and numeroUsuario', () => {
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    component.form.patchValue({
      codigoEmpresa: 'tacos-a3f2',
      numeroUsuario: ' ADMIN001 ',
    });
    auth.requestPasswordReset.mockImplementationOnce(() => new Observable<void>(sub => {
      sub.next();
      sub.complete();
    }));

    component.onSubmit();

    expect(auth.requestPasswordReset).toHaveBeenCalledWith('TACOS-A3F2', 'ADMIN001');
  });
});
