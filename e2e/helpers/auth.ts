import { type Page } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:8080/api/v1';

export interface LoginResult {
  token: string;
  numeroUsuario: string;
  nombre: string;
  storeId: string;
  storeName: string;
  turno: string;
  roles: string[];
}

/** Usuarios de prueba — coinciden con los seed del proyecto */
export const USERS = {
  ADMIN:     { numeroUsuario: 'ADMIN001', password: 'Admin123456' },
  GERENTE:   { numeroUsuario: 'GER001',   password: 'Gerente123'  },
  EJECUTADOR:{ numeroUsuario: 'EJE001',   password: 'Operador123' },
  EJECUTADOR2:{ numeroUsuario: 'EJE002',  password: 'Operador123' },
} as const;

/** Login por API y retorna datos del usuario + token */
export async function apiLogin(user: { numeroUsuario: string; password: string }): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(`Login failed for ${user.numeroUsuario}: ${res.status}`);
  return res.json();
}

/** Login vía UI — navega a /auth/login, llena form, submits */
export async function uiLogin(page: Page, user: { numeroUsuario: string; password: string }): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('input[name="numeroUsuario"], input[formcontrolname="numeroUsuario"], input[type="text"]').first().fill(user.numeroUsuario);
  await page.locator('input[name="password"], input[formcontrolname="password"], input[type="password"]').first().fill(user.password);
  await page.locator('button[type="submit"]').click();
  // Esperar navegación al dashboard
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 10_000 });
}

/** Inyecta sesión en localStorage para skip de UI login */
export async function injectSession(page: Page, user: { numeroUsuario: string; password: string }): Promise<LoginResult> {
  const data = await apiLogin(user);
  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('metrix_token', session.token);
    localStorage.setItem('metrix_user', JSON.stringify({
      nombre:        session.nombre,
      numeroUsuario: session.numeroUsuario,
      storeId:       session.storeId,
      storeName:     session.storeName,
      turno:         session.turno,
      roles:         session.roles,
    }));
  }, data);
  return data;
}

/** Helper: hace request autenticado al API */
export async function apiRequest(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
