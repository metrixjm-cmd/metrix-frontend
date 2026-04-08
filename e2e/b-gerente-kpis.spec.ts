import { test, expect } from '@playwright/test';
import { injectSession, USERS } from './helpers/auth';

/**
 * Caso B — GERENTE ve KPIs del equipo ejecutador en /training.
 */
test.describe('B — GERENTE KPIs equipo', () => {

  test('B1: Sección "Resultados del equipo ejecutador" visible', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto('/training');
    await page.waitForSelector('text=Capacitaciones', { timeout: 10_000 });

    // La sección de team stats debe estar presente
    await expect(page.locator('text=Resultados del equipo ejecutador')).toBeVisible({ timeout: 8_000 });
  });

  test('B2: KPIs de store visibles (Programadas, En Curso, Completadas, No Completadas)', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto('/training');
    await page.waitForSelector('text=Capacitaciones', { timeout: 10_000 });

    // Los 4 KPIs de store deben estar visibles
    await expect(page.locator('text=Programadas').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=En Curso').first()).toBeVisible();
    await expect(page.locator('text=Completadas').first()).toBeVisible();
    await expect(page.locator('text=No Completadas').first()).toBeVisible();
  });

  test('B3: Tabs de gerente visibles (Creadas / Por hacer)', async ({ page }) => {
    await injectSession(page, USERS.GERENTE);
    await page.goto('/training');
    await page.waitForSelector('text=Capacitaciones', { timeout: 10_000 });

    await expect(page.locator('button', { hasText: 'Capacitaciones creadas' })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button', { hasText: 'Capacitaciones por hacer' })).toBeVisible();
  });
});
