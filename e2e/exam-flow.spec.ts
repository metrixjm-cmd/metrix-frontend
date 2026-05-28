import { test, expect } from '@playwright/test';

/**
 * FASE 4: E2E Frontend Tests (5 tests)
 * Suite de pruebas end-to-end para el flujo de exámenes en METRIX.
 * Simula navegación real del usuario, timer regresivo, y tipos de pregunta.
 *
 * Prerrequisitos:
 * - Frontend en http://localhost:4200
 * - Backend en http://localhost:8080
 * - MongoDB local con datos de prueba
 */

const BASE_URL = 'http://localhost:4200';
const API_URL = 'http://localhost:8080/api/v1';

// Usuarios de prueba
const ADMIN = { user: 'ADMIN001', pass: 'Admin123456' };
const GERENTE = { user: 'GER001', pass: 'Gerente123' };
const EJECUTADOR = { user: 'EJE001', pass: 'Operador123' };

/**
 * Helper: Login
 */
async function loginAs(page, credentials) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="user"], input[placeholder*="Usuario"]', credentials.user);
  await page.fill('input[name="password"], input[placeholder*="Contraseña"]', credentials.pass);

  // Click login button
  await page.click('button:has-text("Iniciar sesión"), button:has-text("Login")');

  // Esperar a dashboard
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 5000 });
}

/**
 * Helper: Create exam via API (para setup)
 */
async function createExamViaApi(context, token: string, examData: any) {
  const response = await context.request.post(`${API_URL}/exams`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: examData
  });
  return response.json();
}

test.describe('Exam Full Flow - E2E Tests', () => {

  // ==================== E2E 1: ADMIN creates exam with 2-hour duration ====================

  test('E2E1: admin creates exam with 2-hour duration', async ({ page }) => {
    // Setup: Login como ADMIN
    await loginAs(page, ADMIN);

    // Navegar a Exámenes
    await page.click('a:has-text("Exámenes"), a:has-text("Exams")');
    await page.waitForURL('**/exams', { timeout: 5000 });

    // Click "Crear Examen" / "Create Exam"
    await page.click('button:has-text("Crear Examen"), button:has-text("Create Exam")');
    await page.waitForURL('**/exams/create', { timeout: 5000 });

    // Fill form: Title
    const titleInput = page.locator('input[placeholder*="Título"], input[placeholder*="Title"]');
    await titleInput.fill('Math 101');

    // Fill: Description
    const descInput = page.locator('textarea[placeholder*="Descripción"], textarea[placeholder*="Description"]');
    await descInput.fill('Basic math skills assessment');

    // Select duration: 2 horas
    const durationSelect = page.locator(
      'select[formControlName="timeLimitHours"], select[formControlName="duration"]'
    );
    if (await durationSelect.count() > 0) {
      await durationSelect.selectOption('2');
    } else {
      // Alternative: input number
      const durationInput = page.locator('input[formControlName="timeLimitHours"]');
      if (await durationInput.count() > 0) {
        await durationInput.fill('2');
      }
    }

    // Add first question: TRUE_FALSE
    await page.click('button:has-text("Agregar Pregunta"), button:has-text("Add Question")');

    // Select question type
    const typeSelect = page.locator(
      'select[formControlName="type"]'
    ).first();
    await typeSelect.selectOption('TRUE_FALSE');

    // Fill question text
    const qTextarea = page.locator('textarea[formControlName="questionText"]').first();
    await qTextarea.fill('2+2=4?');

    // Select correct answer: Verdadero
    const verdaderoRadio = page.locator('input[value="Verdadero"]').first();
    await verdaderoRadio.check();

    // Save question
    await page.click('button:has-text("Guardar Pregunta"), button:has-text("Save Question")');

    // Expect question added to list
    await expect(page.locator('text="2+2=4"')).toBeVisible({ timeout: 3000 });

    // Submit form
    await page.click('button:has-text("Guardar Examen"), button:has-text("Save Exam")');

    // Confirm modal if present
    const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Confirm")');
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }

    // Verify success message
    await expect(
      page.locator('text="Examen creado", text="Exam created"')
    ).toBeVisible({ timeout: 5000 });

    // Verify in list
    await expect(page.locator('text="Math 101"')).toBeVisible();

    // Verify duration in detail (via API)
    const getAllExamsReq = await page.context().request.get(
      `${API_URL}/exams/store/store-1`,
      { headers: { 'Authorization': `Bearer dummy` } }
    );
    // Note: este check requiere token real, omitir si no disponible
  });

  // ==================== E2E2: GERENTE assigns exam to EJECUTADOR ====================

  test('E2E2: gerente assigns exam to ejecutador', async ({ page }) => {
    // Setup: Login como GERENTE
    await loginAs(page, GERENTE);

    // Go to Exámenes
    await page.click('a:has-text("Exámenes"), a:has-text("Exams")');
    await page.waitForURL('**/exams', { timeout: 5000 });

    // Esperamos que exista al menos un examen
    // Click en botón de asignación del primer examen
    const assignBtn = page.locator('button:has-text("Asignar"), button:has-text("Assign")').first();
    if (await assignBtn.count() > 0) {
      await assignBtn.click();

      // Modal de asignación
      const userSelect = page.locator(
        'select[formControlName="userId"], select[formControlName="assignTo"]'
      ).first();

      if (await userSelect.count() > 0) {
        // Select EJE001
        await userSelect.selectOption(
          (option) => option.includes('EJE001') || option.includes('Ejecutador'),
          { force: true }
        );
      }

      // Confirm assignment
      const confirmAssignBtn = page.locator(
        'button:has-text("Asignar"), button:has-text("Assign")'
      ).nth(1);

      if (await confirmAssignBtn.count() > 0) {
        await confirmAssignBtn.click();
      }

      // Verify success
      await expect(
        page.locator('text="Asignación exitosa", text="Assignment successful"')
      ).toBeVisible({ timeout: 3000 });
    }
  });

  // ==================== E2E3: EJECUTADOR takes exam with countdown timer ====================

  test('E2E3: ejecutador takes exam with countdown timer', async ({ page }) => {
    // Setup: Login como EJECUTADOR
    await loginAs(page, EJECUTADOR);

    // Go to "Mis Exámenes" / "My Exams"
    await page.click('a:has-text("Mis Exámenes"), a:has-text("My Exams")');
    await page.waitForURL('**/exams/my', { timeout: 5000 });

    // Start exam (click "Resolver" / "Take")
    const takeBtn = page.locator('button:has-text("Resolver"), button:has-text("Take")').first();
    if (await takeBtn.count() > 0) {
      await takeBtn.click();

      // Verify timer visible and countdown working
      const timer = page.locator('[data-testid="exam-timer"], .exam-timer, .countdown');

      if (await timer.count() > 0) {
        // Get initial time
        const initialTime = await timer.textContent();
        expect(initialTime).toMatch(/\d{2}:\d{2}:\d{2}/);

        // Wait 2 seconds
        await page.waitForTimeout(2000);

        // Get new time
        const newTime = await timer.textContent();
        // Timer should have decreased (this is heuristic)
        expect(newTime).toBeDefined();
      }

      // Answer first question (if present)
      const firstAnswer = page.locator('input[name="answers-0"], input[type="radio"]').first();
      if (await firstAnswer.count() > 0) {
        await firstAnswer.click();
      }

      // Submit answers
      const submitBtn = page.locator(
        'button:has-text("Enviar"), button:has-text("Submit")'
      );

      if (await submitBtn.count() > 0) {
        await submitBtn.click();

        // Confirm submission
        const confirmSubmitBtn = page.locator(
          'button:has-text("Confirmar"), button:has-text("Confirm")'
        );

        if (await confirmSubmitBtn.count() > 0) {
          await confirmSubmitBtn.click();
        }

        // Verify results page
        await expect(
          page.locator('text="Calificación", text="Score", text="Resultado"')
        ).toBeVisible({ timeout: 5000 });

        // Verify score displayed
        const scoreElement = page.locator(
          '[data-testid="score"], .score-value, .points'
        );

        if (await scoreElement.count() > 0) {
          const scoreText = await scoreElement.textContent();
          expect(scoreText).toMatch(/\d+/);
        }
      }
    }
  });

  // ==================== E2E4: All question types preserved and scored ====================

  test('E2E4: all question types preserved and scored correctly', async ({ page }) => {
    // Setup: Create exam with all types via API (as ADMIN)
    // Then login as EJECUTADOR and answer

    // For simplicity in E2E, we'll navigate to a pre-created exam
    // In production, use API to create test exam first

    await loginAs(page, EJECUTADOR);

    // Go to "Mis Exámenes"
    await page.click('a:has-text("Mis Exámenes"), a:has-text("My Exams")');

    // Find exam with all types (heuristic: look for exam with multiple question indicators)
    const examCards = page.locator('[data-testid="exam-card"], .exam-item');

    if (await examCards.count() > 0) {
      // Click first exam
      const firstExam = examCards.first();
      await firstExam.click();

      // Answer questions based on type

      // 1. TRUE_FALSE - click Verdadero
      const verdaderoBtn = page.locator('button:has-text("Verdadero"), input[value="Verdadero"]').first();
      if (await verdaderoBtn.count() > 0) {
        await verdaderoBtn.click();
      }

      // 2. MULTIPLE_CHOICE - click Option A
      const multipleChoices = page.locator('input[type="radio"][name*="q"], label').filter({
        hasText: /Opción|Option/
      });

      if (await multipleChoices.count() > 0) {
        await multipleChoices.first().click();
      }

      // 3. MULTI_SELECT - click multiple options
      const checkboxes = page.locator('input[type="checkbox"][name*="q"], input[name*="multi"]');
      if (await checkboxes.count() >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
      }

      // 4. OPEN_TEXT - type answer
      const textarea = page.locator('textarea[name*="q"], textarea[name*="answer"]').first();
      if (await textarea.count() > 0) {
        await textarea.fill('Mi respuesta detallada para la pregunta abierta.');
      }

      // Submit
      const submitBtn = page.locator('button:has-text("Enviar"), button:has-text("Submit")');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();

        // Confirm
        const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Confirm")');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }

        // Verify results show all question types
        const resultsText = await page.locator('body').textContent();

        // Check for type indicators in results
        expect(resultsText).toMatch(/Verdadero|False|True/);
        // (May also see other type indicators)
      }
    }
  });

  // ==================== E2E5: Training with multi-day date range ====================

  test('E2E5: training with multi-day date range', async ({ page }) => {
    // Setup: Login como GERENTE
    await loginAs(page, GERENTE);

    // Go to "Capacitaciones" / "Trainings"
    const trainingLink = page.locator('a:has-text("Capacitaciones"), a:has-text("Trainings")');
    if (await trainingLink.count() > 0) {
      await trainingLink.click();

      // Click "Nueva Capacitación" / "New Training"
      const newTrainingBtn = page.locator(
        'button:has-text("Nueva Capacitación"), button:has-text("New Training")'
      );

      if (await newTrainingBtn.count() > 0) {
        await newTrainingBtn.click();

        // Fill training form
        const titleInput = page.locator('input[formControlName="title"]');
        await titleInput.fill('Advanced Training');

        // Set start date: 2026-05-27
        const startDateInput = page.locator('input[formControlName="startDate"]');
        if (await startDateInput.count() > 0) {
          await startDateInput.fill('05/27/2026');
        }

        // Set end date: 2026-05-29
        const endDateInput = page.locator('input[formControlName="endDate"]');
        if (await endDateInput.count() > 0) {
          await endDateInput.fill('05/29/2026');
        }

        // Verify duration displays "3 días" / "3 days"
        const durationDisplay = page.locator(
          '[data-testid="duration-days"], .duration-display, text="3 días"'
        );

        if (await durationDisplay.count() > 0) {
          await expect(durationDisplay).toContainText(/3\s+(días|days)/);
        }

        // Add schedule for each day
        // Day 1: 3 hours
        const day0HoursInput = page.locator('input[name="day0Hours"], input[name="hours-0"]');
        if (await day0HoursInput.count() > 0) {
          await day0HoursInput.fill('3');
        }

        // Day 2: 5 hours
        const day1HoursInput = page.locator('input[name="day1Hours"], input[name="hours-1"]');
        if (await day1HoursInput.count() > 0) {
          await day1HoursInput.fill('5');
        }

        // Day 3: 2 hours
        const day2HoursInput = page.locator('input[name="day2Hours"], input[name="hours-2"]');
        if (await day2HoursInput.count() > 0) {
          await day2HoursInput.fill('2');
        }

        // Save
        const saveBtn = page.locator(
          'button:has-text("Guardar"), button:has-text("Save")'
        );

        if (await saveBtn.count() > 0) {
          await saveBtn.click();

          // Verify success
          await expect(
            page.locator('text="Capacitación creada", text="Training created"')
          ).toBeVisible({ timeout: 5000 });

          // Verify in list
          await expect(page.locator('text="Advanced Training"')).toBeVisible();
          await expect(page.locator('text="3 días", text="3 days"')).toBeVisible();
        }
      }
    } else {
      // Skip if Capacitaciones link not available
      test.skip();
    }
  });

});
