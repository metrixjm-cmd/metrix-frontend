import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, uiLogin, USERS } from './helpers/auth';

/**
 * Flujo SaaS: /productos → checkout → prueba 7 días → provision → login tenant vs Admin 0.
 * Requiere backend en :8080 y Mongo.
 */
test.describe('Tenant — productos → provision', () => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}`.slice(-6);
  const adminUser = `E2E${suffix}`;
  const password = 'TenantPass123';
  const empresa = `E2E Resto ${suffix}`;

  test('vende Base, provisiona, tenant sin platform y Admin 0 ve instancia', async ({ page }) => {
    await page.goto('/productos');
    await expect(page.getByRole('heading', { name: /Planes para tu restaurante/i })).toBeVisible();

    // Elegir METRIX Base
    const baseCard = page.locator('article').filter({ hasText: 'METRIX Base' });
    await expect(baseCard).toBeVisible({ timeout: 15_000 });
    await baseCard.getByRole('link', { name: /Elegir plan/i }).click();
    await expect(page).toHaveURL(/\/productos\/checkout\/base/);

    await page.getByLabel(/Nombre del restaurante o empresa/i).fill(empresa);
    await page.getByLabel(/Nombre de la persona de contacto/i).fill('Contacto E2E');
    await page.getByLabel(/Correo de contacto/i).fill(`e2e${suffix}@metrix.test`);
    await page.getByLabel(/Sucursales a contratar/i).fill('1');
    await page.getByRole('button', { name: /Continuar$/i }).click();
    await page.getByRole('button', { name: /Empezar prueba de 7 días/i }).click();

    await expect(page).toHaveURL(/\/productos\/provision\//, { timeout: 20_000 });

    await page.getByLabel(/Usuario de acceso/i).fill(adminUser);
    await page.getByLabel(/Nombre del administrador/i).fill('Admin E2E');
    await page.getByLabel(/^Contraseña$/i).fill(password);
    await page.getByLabel(/Confirmar contraseña/i).fill(password);
    await page.getByRole('button', { name: /Crear mi METRIX/i }).click();

    await expect(page.getByText(/Redirigiendo al login/i)).toBeVisible({ timeout: 30_000 });
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });

    await uiLogin(page, { numeroUsuario: adminUser, password });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Periodo de prueba/i)).toBeVisible();

    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    // Tenant ADMIN no ve paneles de plataforma
    await expect(sidebar.getByRole('link', { name: 'Licencias' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Clientes METRIX' })).toHaveCount(0);
    // Plan Base: sin Trainer / Capacitaciones / Gamificación
    await expect(sidebar.getByRole('link', { name: 'Exámenes' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Capacitación' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Gamificación' })).toHaveCount(0);

    // Acceso directo a /licencias debe redirigir
    await page.goto('/licencias');
    await expect(page).toHaveURL(/\/dashboard/);

    // API: features del plan Base
    const tenant = await apiLogin({ numeroUsuario: adminUser, password });
    expect(tenant.platformAdmin).toBeFalsy();
    expect(tenant.licensedFeatures ?? []).not.toContain('EXAMS');
    expect(tenant.licensedFeatures ?? []).not.toContain('GAMIFICATION');
    expect(tenant.licensedFeatures ?? []).not.toContain('TRAININGS');

    // Admin 0 ve la instancia
    await page.evaluate(() => {
      localStorage.removeItem('metrix_token');
      localStorage.removeItem('metrix_user');
    });
    await page.goto('/auth/login');
    await uiLogin(page, USERS.ADMIN);
    await page.goto('/platform');
    await expect(page.getByRole('heading', { name: /Clientes METRIX/i })).toBeVisible();
    await expect(page.getByText(empresa)).toBeVisible({ timeout: 15_000 });

    // API: tenant no puede listar platform
    const forbidden = await apiRequest(tenant.token, 'GET', '/platform/instances');
    expect([401, 403]).toContain(forbidden.status);

    const admin0 = await apiLogin(USERS.ADMIN);
    expect(admin0.platformAdmin).toBe(true);
    const instances = await apiRequest(admin0.token, 'GET', '/platform/instances');
    expect(instances.status).toBe(200);
    const list: { empresaNombre: string }[] = await instances.json();
    expect(list.some(i => i.empresaNombre === empresa)).toBe(true);
  });
});
