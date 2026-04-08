import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, injectSession, USERS } from './helpers/auth';

/**
 * Caso D — EJECUTADOR: en detalle muestra nombre de sucursal.
 */
test.describe('D — EJECUTADOR detalle: nombre sucursal', () => {
  let trainingId: string | null = null;
  let gerenteToken: string;

  test.beforeAll(async () => {
    const admin   = await apiLogin(USERS.ADMIN);
    const gerente = await apiLogin(USERS.GERENTE);
    gerenteToken  = gerente.token;

    const usersRes = await apiRequest(admin.token, 'GET', '/users');
    const users: { id: string; numeroUsuario: string }[] = await usersRes.json();
    const ejeId = users.find(u => u.numeroUsuario === 'EJE001')!.id;

    const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const res = await apiRequest(gerenteToken, 'POST', '/trainings', {
      title: `[E2E-D] Detalle ${Date.now()}`,
      description: 'Test detalle ejecutador',
      level: 'BASICO',
      assignedUserId: ejeId,
      storeId: gerente.storeId,
      shift: 'MATUTINO',
      dueAt,
    });
    if (res.ok) {
      trainingId = (await res.json()).id;
    }
  });

  test.afterAll(async () => {
    if (trainingId) {
      await apiRequest(gerenteToken, 'DELETE', `/trainings/${trainingId}`).catch(() => {});
    }
  });

  test('D1: Detalle muestra nombre de sucursal, no ObjectId', async ({ page }) => {
    test.skip(!trainingId, 'No se pudo crear training de prueba');
    await injectSession(page, USERS.EJECUTADOR);
    await page.goto(`/training/${trainingId}`);

    // Esperar a que cargue el detalle
    await page.waitForSelector('text=Capacitación', { timeout: 10_000 });

    // La página debe mostrar el storeName del auth response
    const gerente = await apiLogin(USERS.GERENTE);
    const pageContent = await page.textContent('body');

    // El storeName NO debe ser un ObjectId puro
    // Debe contener el nombre de la sucursal del gerente (misma store)
    expect(pageContent).toContain(gerente.storeName);
  });
});
