import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { TrainingDetail } from './training-detail';
import { AuthService } from '../../auth/services/auth.service';
import { RoleContext } from '../../../shared/services/role-context.service';
import { TrainingService } from '../services/training.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { SettingsService } from '../../settings/services/settings.service';
import { NotificationService } from '../../notifications/notification.service';

class AuthServiceStub {
  readonly currentUser = signal({
    nombre: 'Ejecutador Uno',
    numeroUsuario: 'EJE001',
    storeId: 'store-1',
    storeName: 'Sucursal Centro',
    turno: 'MATUTINO',
    roles: ['EJECUTADOR'],
  }).asReadonly();

  hasRole(role: string): boolean {
    return role === 'EJECUTADOR';
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.includes('EJECUTADOR');
  }
}

class RoleContextStub {
  readonly isGerente = signal(false).asReadonly();
}

class TrainingServiceStub {
  readonly selectedTraining = signal<any>(null).asReadonly();
  readonly loading = signal(false).asReadonly();
  readonly saving = signal(false).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();

  loadById = vi.fn();
  getByAssignmentGroup = vi.fn().mockResolvedValue([]);
  updateProgress = vi.fn().mockResolvedValue(null);
  update = vi.fn().mockResolvedValue(null);
  delete = vi.fn().mockResolvedValue(undefined);
  markMaterialViewed = vi.fn().mockResolvedValue(null);
}

class TrainerServiceStub {
  readonly exams = signal<any[]>([]).asReadonly();
  loadByStore = vi.fn();
}

class SettingsServiceStub {
  readonly stores = signal<any[]>([]).asReadonly();
  loadAll = vi.fn();
}

class NotificationServiceStub {
  pushLocal = vi.fn();
}

class RouterStub {
  navigate = vi.fn();
}

class ActivatedRouteStub {
  snapshot = {
    paramMap: {
      get: vi.fn().mockReturnValue('training-1'),
    },
    queryParamMap: {
      get: vi.fn().mockReturnValue(null),
    },
  };
}

describe('TrainingDetail (material validation)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingDetail],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: RoleContext, useClass: RoleContextStub },
        { provide: TrainingService, useClass: TrainingServiceStub },
        { provide: TrainerService, useClass: TrainerServiceStub },
        { provide: SettingsService, useClass: SettingsServiceStub },
        { provide: NotificationService, useClass: NotificationServiceStub },
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
      ],
    }).compileComponents();
  });

  it('opens material and marks it as viewed when it was pending', () => {
    const fixture = TestBed.createComponent(TrainingDetail);
    const component = fixture.componentInstance;
    const openSpy = vi.spyOn(component, 'openMaterial').mockImplementation(() => {});
    const markSpy = vi.spyOn(component, 'onMarkMaterialViewed').mockResolvedValue(undefined);

    component.onOpenMaterialAsLearner('mat-1', 'https://example.com/mat-1', false);

    expect(openSpy).toHaveBeenCalledWith('https://example.com/mat-1');
    expect(markSpy).toHaveBeenCalledWith('mat-1');
  });

  it('opens material but does not mark it again when already viewed', () => {
    const fixture = TestBed.createComponent(TrainingDetail);
    const component = fixture.componentInstance;
    const openSpy = vi.spyOn(component, 'openMaterial').mockImplementation(() => {});
    const markSpy = vi.spyOn(component, 'onMarkMaterialViewed').mockResolvedValue(undefined);

    component.onOpenMaterialAsLearner('mat-2', 'https://example.com/mat-2', true);

    expect(openSpy).toHaveBeenCalledWith('https://example.com/mat-2');
    expect(markSpy).not.toHaveBeenCalled();
  });
});

