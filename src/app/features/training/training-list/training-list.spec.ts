import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { TrainingList } from './training-list';
import { AuthService } from '../../auth/services/auth.service';
import { RoleContext } from '../../../shared/services/role-context.service';
import { TrainingService } from '../services/training.service';
import { SettingsService } from '../../settings/services/settings.service';
import { TrainingResponse, TrainingStatus } from '../training.models';

// ── Stubs ─────────────────────────────────────────────────────────────────────

const trainingsSignal = signal<TrainingResponse[]>([]);
const myTrainingsSignal = signal<TrainingResponse[]>([]);

class TrainingServiceStub {
  readonly trainings  = trainingsSignal.asReadonly();
  readonly myTrainings = myTrainingsSignal.asReadonly();
  readonly loading    = signal(false).asReadonly();
  readonly error      = signal<string | null>(null).asReadonly();
  loadAll             = vi.fn();
  loadByStore         = vi.fn();
  loadMyTrainings     = vi.fn();
  listMyTrainings     = vi.fn().mockResolvedValue([]);
}

class AuthServiceStub {
  readonly currentUser = signal({
    nombre: 'Ejecutador Uno',
    numeroUsuario: 'EJE001',
    storeId: 'store-1',
    storeName: 'Sucursal Centro',
    turno: 'MATUTINO',
    roles: ['EJECUTADOR'],
  }).asReadonly();
  hasRole      = (_: string) => true;
  hasAnyRole   = (..._: string[]) => true;
}

class RoleContextStub {
  readonly isAdmin      = signal(false).asReadonly();
  readonly isGerente    = signal(false).asReadonly();
  readonly isOnlyGerente = signal(false).asReadonly();
  readonly isEjecutador  = signal(true).asReadonly();
}

class SettingsServiceStub {
  readonly stores = signal<any[]>([]).asReadonly();
  loadAll = vi.fn();
}

class RouterStub    { navigate = vi.fn(); }
class ActivatedRouteStub {
  snapshot = {
    queryParamMap: { get: vi.fn().mockReturnValue(null) },
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

const PAST   = new Date(Date.now() - 60_000).toISOString();  // ya venció
const FUTURE = new Date(Date.now() + 86_400_000).toISOString(); // vence mañana

function buildTraining(overrides: Partial<TrainingResponse> = {}): TrainingResponse {
  return {
    id:              'training-1',
    title:           'Capacitación de prueba',
    description:     'Descripción',
    durationHours:   1,
    minPassGrade:    70,
    assignedUserId:  'user-1',
    assignedUserName: 'Usuario Prueba',
    position:        'Cajero',
    storeId:         'store-1',
    shift:           'MATUTINO',
    dueAt:           FUTURE,
    assignmentGroupId: null,
    templateId:      null,
    materials:       [],
    category:        null,
    tags:            [],
    status:          'PROGRAMADA',
    startedAt:       null,
    completedAt:     null,
    onTime:          null,
    percentage:      0,
    grade:           null,
    passed:          null,
    comments:        null,
    createdBy:       'GER001',
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TrainingList — normalización de estados en la lista', () => {
  let component: TrainingList;

  beforeEach(async () => {
    trainingsSignal.set([]);
    myTrainingsSignal.set([]);

    await TestBed.configureTestingModule({
      imports: [TrainingList],
      providers: [
        { provide: AuthService,      useClass: AuthServiceStub },
        { provide: RoleContext,       useClass: RoleContextStub },
        { provide: TrainingService,   useClass: TrainingServiceStub },
        { provide: SettingsService,   useClass: SettingsServiceStub },
        { provide: Router,            useClass: RouterStub },
        { provide: ActivatedRoute,    useClass: ActivatedRouteStub },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrainingList);
    component = fixture.componentInstance;
  });

  // ── 1. PROGRAMADA — sin iniciar, fecha futura ────────────────────────────
  it('muestra PROGRAMADA cuando el status es PROGRAMADA y aún no vence', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't1', status: 'PROGRAMADA', dueAt: FUTURE, percentage: 0 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PROGRAMADA');
  });

  // ── 2. EN_CURSO — iniciada antes de la fecha límite ─────────────────────
  it('muestra EN_CURSO cuando el status es EN_CURSO y aún no vence', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't2', status: 'EN_CURSO', dueAt: FUTURE, percentage: 40 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('EN_CURSO');
  });

  // ── 3. COMPLETADA — completada antes del vencimiento ────────────────────
  it('muestra COMPLETADA cuando el status es COMPLETADA', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't3', status: 'COMPLETADA', dueAt: PAST, percentage: 100 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('COMPLETADA');
  });

  // ── 4. NO_COMPLETADA — el backend ya la marcó ───────────────────────────
  it('muestra NO_COMPLETADA cuando el backend devuelve ese status', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't4', status: 'NO_COMPLETADA', dueAt: PAST, percentage: 30 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('NO_COMPLETADA');
  });

  // ── 5. Normalización frontend: PROGRAMADA vencida → NO_COMPLETADA ────────
  it('normaliza a NO_COMPLETADA cuando status es PROGRAMADA pero dueAt ya pasó', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't5', status: 'PROGRAMADA', dueAt: PAST, percentage: 0 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('NO_COMPLETADA');
  });

  // ── 6. Normalización frontend: EN_CURSO vencida → NO_COMPLETADA ─────────
  it('normaliza a NO_COMPLETADA cuando status es EN_CURSO pero dueAt ya pasó', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't6', status: 'EN_CURSO', dueAt: PAST, percentage: 55 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('NO_COMPLETADA');
  });

  // ── 7. COMPLETADA no se toca aunque dueAt ya pasó ───────────────────────
  it('no modifica COMPLETADA aunque dueAt ya pasó', () => {
    myTrainingsSignal.set([
      buildTraining({ id: 't7', status: 'COMPLETADA', dueAt: PAST, percentage: 100 }),
    ]);

    const rows = component['learnerTrainings']();
    expect(rows[0].status).toBe('COMPLETADA');
  });
});
