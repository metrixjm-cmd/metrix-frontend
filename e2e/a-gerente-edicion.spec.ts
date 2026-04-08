import { test, expect } from '@playwright/test';
import { injectSession, apiLogin, apiRequest, USERS } from './helpers/auth';

/**
 * Caso A — GERENTE: edición/eliminación solo en PROGRAMADA.
 */
test.describe('A — GERENTE edición/eliminación por estado', () => {
  let gerenteToken: string;
  let gerenteStoreId: string;
  let ejeUserId: string;
  let trainingProgramadaId: string;
  let trainingEnCursoId: string;

  test.beforeAll(async () => {
    const admin   = await apiLogin(USERS.ADMIN);
    const gerente = await apiLogin(USERS.GERENTE);
    const eje     = await apiLogin(USERS.EJECUTADOR);
    gerenteToken  = gerente.token;
    gerenteStoreId = gerente.storeId;

    // Resolver EJE001 id
    const usersRes = await apiRequest(admin.token, 'GET', '/users');
    const users: { id: string; numeroUsuario: string }[] = await usersRes.json();
    ejeUserId = users.find(u => u.numeroUsuario === 'EJE001')!.id;

    const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();

    // Training PROGRAMADA
    const r1 = await apiRequest(gerenteToken, 'POST', '/trainings', {
      title: `[E2E-A] Programada ${Date.now()}`,
      description: 'E2E test',
      level: 'BASICO',
      assignedUserId: ejeUserId,
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt,
    });
    trainingProgramadaId = (await r1.json()).id;

    // Training EN_CURSO
    const r2 = await apiRequest(gerenteToken, 'POST', '/trainings', {
      title: `[E2E-A] EnCurso ${Date.now()}`,
      description: 'E2E test',
      level: 'BASICO',
      assignedUserId: ejeUserId,
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt,
    });
    trainingEnCursoId = (await r2.json()).id;
    // Llevar a EN_CURSO
    await apiRequest(eje.token, 'PATCH', `/trainings/${trainingEnCursoId}/progress`, {
      newStatus: 'EN_CURSO',
    });
  });

  test.afterAll(async () => {
    // Cleanup — solo el PROGRAMADA es borrable
    await apiRequest(gerenteToken, 'DELETE', `/trainings/${trainingProgramadaId}`).catch(() => {});
    // EN_CURSO no es borrable por regla, ignorar error
    await apiRequest(gerenteToken, 'DELETE', `/trainings/${trainingEnCursoId}`).catch(() => {});
  });

  test('A1: Training PROGRAMADA muestra botones Editar y Eliminar', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto(`/training/${trainingProgramadaId}`);
    await page.waitForSelector('text=Ficha de información', { timeout: 10_000 });

    const editBtn = page.locator('button', { hasText: 'Editar' });
    const deleteBtn = page.locator('button', { hasText: 'Eliminar' });

    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });

  test('A2: Training EN_CURSO muestra "Edición bloqueada"', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto(`/training/${trainingEnCursoId}`);
    await page.waitForSelector('text=Ficha de información', { timeout: 10_000 });

    await expect(page.locator('text=Edición bloqueada')).toBeVisible();

    const editBtn = page.locator('button', { hasText: 'Editar' });
    await expect(editBtn).not.toBeVisible();
  });

  test('A3: Backend rechaza PUT en training EN_CURSO', async () => {
    const res = await apiRequest(gerenteToken, 'PUT', `/trainings/${trainingEnCursoId}`, {
      title: 'Intento editar',
      description: 'No debería funcionar',
      level: 'BASICO',
      storeId: gerenteStoreId,
      shift: 'MATUTINO',
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
    });
    expect(res.status).toBe(422);
  });

  test('A4: Backend rechaza DELETE en training EN_CURSO', async () => {
    const res = await apiRequest(gerenteToken, 'DELETE', `/trainings/${trainingEnCursoId}`);
    expect(res.status).toBe(422);
  });
});
