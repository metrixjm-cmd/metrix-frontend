import { test, expect } from '@playwright/test';
import { apiLogin, injectSession, USERS } from './helpers/auth';

/**
 * Caso C — GERENTE: en formulario de creación, Sucursal muestra nombre.
 */
test.describe('C — GERENTE creación: sucursal', () => {

  test('C1: Campo Sucursal muestra nombre, no ObjectId', async ({ page }) => {
    const gerente = await apiLogin(USERS.GERENTE);
    await injectSession(page, USERS.GERENTE);
    await page.goto('/training/create');
    await page.waitForSelector('text=Nueva capacitación', { timeout: 10_000 });

    // El campo sucursal para GERENTE es readonly con el nombre
    const storeInput = page.locator('input[readonly]').first();
    const storeValue = await storeInput.inputValue();

    // No debería ser un ObjectId (24 hex chars)
    expect(storeValue).not.toMatch(/^[0-9a-f]{24}$/i);
    // Debería contener el storeName del login
    expect(storeValue.length).toBeGreaterThan(3);
  });

  test('C2: ID interno visible como texto informativo', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto('/training/create');
    await page.waitForSelector('text=Nueva capacitación', { timeout: 10_000 });

    // Texto "ID interno:" debe estar presente
    await expect(page.locator('text=ID interno:')).toBeVisible();
  });
});
