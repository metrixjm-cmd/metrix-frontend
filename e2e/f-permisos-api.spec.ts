import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, USERS } from './helpers/auth';

/**
 * Caso F — Permisos backend (API-level).
 * Valida que las restricciones de scope se aplican correctamente.
 * No requiere UI — son requests directos al API.
 */
test.describe('F — Permisos API', () => {
  let adminToken: string;
  let gerenteToken: string;
  let ejeToken: string;
  let eje2Token: string;
  let gerenteStoreId: string;
  let ejecutadorUserId: string;
  let ejecutador2UserId: string;
  let testTrainingId: string | null = null;

  test.beforeAll(async () => {
    const admin   = await apiLogin(USERS.ADMIN);
    const gerente = await apiLogin(USERS.GERENTE);
    const eje     = await apiLogin(USERS.EJECUTADOR);
    const eje2    = await apiLogin(USERS.EJECUTADOR2);
    adminToken    = admin.token;
    gerenteToken  = gerente.token;
    ejeToken      = eje.token;
    eje2Token     = eje2.token;
    gerenteStoreId = gerente.storeId;

    // Resolver ObjectIds
    const usersRes = await apiRequest(adminToken, 'GET', '/users');
    const users: { id: string; numeroUsuario: string }[] = await usersRes.json();
    ejecutadorUserId  = users.find(u => u.numeroUsuario === 'EJE001')!.id;
    ejecutador2UserId = users.find(u => u.numeroUsuario === 'EJE002')!.id;

    // Crear training de prueba asignada a EJE001
    const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const res = await apiRequest(gerenteToken, 'POST', '/trainings', {
      title: `[E2E-perms-${Date.now()}] Permiso test`,
      description: 'Test de permisos',
      level: 'BASICO',
      assignedUserId: ejecutadorUserId,
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt,
    });
    expect(res.status).toBe(201);
    const t = await res.json();
    testTrainingId = t.id;
  });

  test.afterAll(async () => {
    if (testTrainingId) {
      await apiRequest(gerenteToken, 'DELETE', `/trainings/${testTrainingId}`);
    }
  });

  test('F1: EJECUTADOR puede modificar progreso de SU training', async () => {
    const res = await apiRequest(ejeToken, 'PATCH', `/trainings/${testTrainingId}/progress`, {
      newStatus: 'EN_CURSO',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('EN_CURSO');
  });

  test('F2: EJECUTADOR2 NO puede modificar progreso de training de EJE001', async () => {
    const res = await apiRequest(eje2Token, 'PATCH', `/trainings/${testTrainingId}/progress`, {
      newStatus: 'EN_CURSO',
    });
    // 422 porque IllegalStateException → UNPROCESSABLE_ENTITY
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('asignadas');
  });

  test('F3: ADMIN puede operar en cualquier training', async () => {
    const res = await apiRequest(adminToken, 'PATCH', `/trainings/${testTrainingId}/progress`, {
      newStatus: 'EN_CURSO',
    });
    // ya está EN_CURSO, re-enviar EN_CURSO es válido (actualizar %)
    expect(res.status).toBe(200);
  });

  test('F4: ADMIN no puede asignar training a EJECUTADOR directamente', async () => {
    const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const res = await apiRequest(adminToken, 'POST', '/trainings', {
      title: `[E2E-perms] Admin→Eje intento`,
      description: 'Debería fallar',
      level: 'BASICO',
      assignedUserId: ejecutadorUserId,
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt,
    });
    expect(res.status).toBe(422);
  });

  test('F5: GERENTE no puede asignar training a otro GERENTE', async () => {
    // Resolver un gerente como target
    const usersRes = await apiRequest(adminToken, 'GET', '/users');
    const users: { id: string; numeroUsuario: string; roles: string[] }[] = await usersRes.json();
    const otroGerente = users.find(u => u.numeroUsuario === 'GER002');
    if (!otroGerente) {
      test.skip();
      return;
    }
    const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const res = await apiRequest(gerenteToken, 'POST', '/trainings', {
      title: `[E2E-perms] Ger→Ger intento`,
      description: 'Debería fallar',
      level: 'BASICO',
      assignedUserId: otroGerente.id,
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt,
    });
    expect(res.status).toBe(422);
  });
});
