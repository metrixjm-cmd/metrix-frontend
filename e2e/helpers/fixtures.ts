import { apiLogin, apiRequest, USERS } from './auth';

const RUN_ID = `e2e-${Date.now()}`;

interface TrainingFixture {
  id: string;
  title: string;
  assignmentGroupId: string;
}

export interface TestFixtures {
  runId: string;
  adminToken: string;
  gerenteToken: string;
  ejecutadorToken: string;
  ejecutador2Token: string;
  gerenteStoreId: string;
  gerenteStoreName: string;
  ejecutadorUserId: string;
  ejecutador2UserId: string;
  /** Training asignada al EJECUTADOR — status PROGRAMADA */
  trainingProgramada: TrainingFixture | null;
  /** Training asignada al EJECUTADOR — será llevada a EN_CURSO en setup */
  trainingEnCurso: TrainingFixture | null;
}

/** Resuelve el ObjectId de un usuario por numeroUsuario */
async function resolveUserId(token: string, numeroUsuario: string): Promise<string> {
  const res = await apiRequest(token, 'GET', `/users`);
  if (!res.ok) throw new Error(`Failed to list users: ${res.status}`);
  const users: { id: string; numeroUsuario: string }[] = await res.json();
  const match = users.find(u => u.numeroUsuario === numeroUsuario);
  if (!match) throw new Error(`User ${numeroUsuario} not found`);
  return match.id;
}

/** Crea fixtures determinísticas para la corrida E2E */
export async function setupFixtures(): Promise<TestFixtures> {
  const adminLogin   = await apiLogin(USERS.ADMIN);
  const gerenteLogin = await apiLogin(USERS.GERENTE);
  const ejeLogin     = await apiLogin(USERS.EJECUTADOR);
  const eje2Login    = await apiLogin(USERS.EJECUTADOR2);

  const ejecutadorUserId  = await resolveUserId(adminLogin.token, 'EJE001');
  const ejecutador2UserId = await resolveUserId(adminLogin.token, 'EJE002');

  const fixtures: TestFixtures = {
    runId: RUN_ID,
    adminToken: adminLogin.token,
    gerenteToken: gerenteLogin.token,
    ejecutadorToken: ejeLogin.token,
    ejecutador2Token: eje2Login.token,
    gerenteStoreId: gerenteLogin.storeId,
    gerenteStoreName: gerenteLogin.storeName,
    ejecutadorUserId,
    ejecutador2UserId,
    trainingProgramada: null,
    trainingEnCurso: null,
  };

  // Crear training PROGRAMADA asignada a EJE001
  const dueAt = new Date(Date.now() + 7 * 86400_000).toISOString();
  const groupId1 = `${RUN_ID}-grp1`;
  const res1 = await apiRequest(gerenteLogin.token, 'POST', '/trainings', {
    title: `[E2E-${RUN_ID}] Training PROGRAMADA`,
    description: 'Test E2E — no tocar manualmente',
    level: 'BASICO',
    assignedUserId: ejecutadorUserId,
    storeId: gerenteLogin.storeId,
    shift: 'MATUTINO',
    dueAt,
    assignmentGroupId: groupId1,
  });
  if (res1.ok) {
    const t = await res1.json();
    fixtures.trainingProgramada = { id: t.id, title: t.title, assignmentGroupId: groupId1 };
  }

  // Crear training para llevar a EN_CURSO asignada a EJE001
  const groupId2 = `${RUN_ID}-grp2`;
  const res2 = await apiRequest(gerenteLogin.token, 'POST', '/trainings', {
    title: `[E2E-${RUN_ID}] Training EN_CURSO`,
    description: 'Test E2E — será iniciada',
    level: 'INTERMEDIO',
    assignedUserId: ejecutadorUserId,
    storeId: gerenteLogin.storeId,
    shift: 'MATUTINO',
    dueAt,
    assignmentGroupId: groupId2,
  });
  if (res2.ok) {
    const t = await res2.json();
    // Transicionar a EN_CURSO
    const progRes = await apiRequest(ejeLogin.token, 'PATCH', `/trainings/${t.id}/progress`, {
      newStatus: 'EN_CURSO',
    });
    if (progRes.ok) {
      fixtures.trainingEnCurso = { id: t.id, title: t.title, assignmentGroupId: groupId2 };
    }
  }

  return fixtures;
}

/** Limpia trainings creados por esta corrida E2E */
export async function teardownFixtures(fixtures: TestFixtures): Promise<void> {
  const token = fixtures.gerenteToken;
  for (const t of [fixtures.trainingProgramada, fixtures.trainingEnCurso]) {
    if (!t) continue;
    try {
      await apiRequest(token, 'DELETE', `/trainings/${t.id}`);
    } catch {
      // best effort — puede fallar si ya fue eliminado o completado
    }
  }
}
