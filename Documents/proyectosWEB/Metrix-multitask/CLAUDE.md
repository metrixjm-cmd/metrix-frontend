# CLAUDE.md — METRIX Project

> Registro de trabajo para Claude Code. Actualizar al cierre de cada sesión.

---

## Proyecto

**METRIX** — Sistema Integral de Gestión de Tareas Empresariales
Sector objetivo: Restaurantes / cadenas multi-unidad (5-10 sucursales, 30+ usuarios/unidad)

**Repositorio:** `C:\Users\carlo\Documents\proyectosWEB\Metrix-multitask`
**Branch activo:** `develop-overwrite` | **Main:** `master`
**Spec completa:** `METRIX_DEFINICION.md` (raíz del repo)

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend | Java 21 + Spring Boot 3.2.2 + Spring Security 6 + JWT (JJWT 0.12.3) |
| Base de datos | MongoDB `localhost:27017/metrix_db` |
| Almacenamiento multimedia | Google Cloud Storage (evidencias) |
| Frontend | Angular 21 + Tailwind CSS 3 |
| Package manager | **npm** (no bun, no yarn) |

---

## Cómo Levantar

### Backend
```bash
cd backend-api
mvn spring-boot:run
# Java 21: C:\Program Files\Java\jdk-21
# Maven 3.9.5: C:\Program Files\apache-maven-3.9.5
```

### Frontend
```bash
cd frontend-web
npm start          # dev server en http://localhost:4200
npx ng build --configuration=development   # build check
```

---

## Usuarios de Prueba (MongoDB metrix_db.users)

| #Usuario  | Password     | Rol        |
|-----------|--------------|------------|
| ADMIN001  | Admin123456  | ADMIN      |
| GER001    | Gerente123   | GERENTE    |
| EJE001    | Operador123  | EJECUTADOR |

---

## Configuraciones Críticas (NO revertir)

1. **Sin `context-path`** en `application.yml` — el AuthController ya usa rutas completas `/api/v1/auth`
2. **JWT secret-key** en `application.yml`: propiedad `metrix.security.jwt.secret-key` (hay dos secciones jwt, la válida es `metrix.security.jwt`)
3. **CORS** en `SecurityConfig.java`: matcher `"/**"` (no `/api/**`)
4. **OPTIONS preflight** en `SecurityConfig.java`: primer matcher es `HttpMethod.OPTIONS, "/**"` → `permitAll()`

---

## Arquitectura Frontend

```
frontend-web/src/app/
├── app.routes.ts              ← Shell layout como parent route
├── core/
│   ├── guards/auth.guard.ts
│   ├── interceptors/auth.interceptor.ts
│   └── layout/
│       ├── app-layout.ts      ← Sidebar + Header + <router-outlet>
│       └── app-layout.html
├── features/
│   ├── auth/
│   │   ├── login/             ← Split-screen, ReactiveForm
│   │   └── services/auth.service.ts
│   ├── dashboard/
│   │   ├── dashboard.ts       ← KPIs reactivos (KpiService signals), sparklines, live feed, ranking
│   │   └── dashboard.html
│   ├── tasks/
│   │   ├── models/task.models.ts
│   │   ├── services/task.service.ts   ← Signals + HTTP
│   │   ├── task-list/
│   │   ├── task-detail/
│   │   ├── task-create/
│   │   └── tasks.routes.ts
│   └── kpi/                   ← NUEVO Sprint 7
│       ├── kpi.models.ts      ← KpiSummary, StoreRankingEntry, ShiftBreakdown
│       └── services/
│           └── kpi.service.ts ← Signals: summary, ranking, kpiCards, pipelineCounts, rankingForDisplay
└── shared/components/
    ├── status-badge/
    └── button/
```

### Convenciones Angular 21
- Sin sufijo `.component` → `login.ts` / `class Login` / `login.html`
- Control flow nuevo: `@if` / `@for` (no `*ngIf` / `*ngFor`)
- `input()` signals para `@Input` en shared components
- Lazy loading: `loadChildren` (módulos) / `loadComponent` (standalone)
- Tailwind v4 es **incompatible** con Angular builder → **siempre v3**
- `@layer components` va en `styles.scss` global (no en component SCSS)
- `SlicePipe` debe importarse explícitamente en standalone components

### Ruta Shell (patrón central)
```typescript
{
  path: '',
  loadComponent: () => import('./core/layout/app-layout').then(m => m.AppLayout),
  canActivate: [authGuard],
  children: [
    { path: 'dashboard', loadChildren: ... },
    { path: 'tasks',     loadChildren: ... },
    { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  ],
}
```

---

## Design System

**Paleta principal:** Orange (restaurantes)
- Primary: `orange-600` (#ea580c) — botones, accents, nav activo
- Backgrounds: `stone-50` (página) / `white` (cards)
- Texto: `stone-900` / `stone-700` / `stone-500` / `stone-400`
- Borders: `stone-200`
- Sombras: `shadow-card` / `shadow-card-md` (custom en tailwind.config.js)

**Login:** Split-screen — panel izq degradado `orange-600→amber-500` con glassmorphism, panel der blanco

**App Shell:** Sidebar blanco con nav naranja, header blanco con búsqueda + notificaciones + perfil

**Cards:** `bg-white border border-stone-200 rounded-xl shadow-card`

**Badges de estado:**
- PENDING → `amber-100 / amber-700`
- IN_PROGRESS → `blue-100 / blue-700`
- COMPLETED → `emerald-100 / emerald-700`
- FAILED → `red-100 / red-700`

---

## Sprints

### ✅ Sprint 1 — Auth Backend
JWT login/register, Spring Security, BCrypt, CORS, GlobalExceptionHandler.
Roles: `ADMIN` / `GERENTE` / `EJECUTADOR`

### ✅ Sprint 2 — Motor de Tareas Backend
`Task.java`, `TaskStatus`, `TaskCategory`, `Evidence`, `Execution`.
`TaskRepository` (14 queries + `findByActivoTrue`), `TaskServiceImpl` con reglas de negocio.
`TaskController` con 6 endpoints y `@PreAuthorize`.

### ✅ Sprint 3 — Frontend Base Angular
Angular 21 + Tailwind 3. AuthService (Signals + localStorage), guard funcional, interceptor JWT.
Login split-screen. Dashboard placeholder.

### ✅ Sprint 4 — Frontend Task Management
Vistas completas: task-list, task-detail, task-create.
`TaskService` con Signals y computed counters.
`StatusBadgeComponent`, `ButtonComponent`.
Filtros por turno/estado. Acciones por rol (iniciar/completar/fallar).

### ✅ Sprint 4b — UI Profesional + Tema Claro Restaurantero
AppLayout shell con sidebar colapsable (6 items nav) + header completo.
Dashboard ejecutivo: 4 KPI cards con sparklines SVG, Live Feed con pipeline visual, Ranking de sucursales.
Migración completa dark→light: `slate-*` → `stone-*`, `indigo-*` → `orange-*`.
Login rediseñado con textos corporativos METRIX y feature cards glassmorphism.

### ✅ Sprint 5 — GCS Integration (Evidencias)
**Backend:** `GcsService` (upload a GCS via GoogleCredentials), `EvidenceController` (POST multipart), `EvidenceUploadResponse` DTO.
Validación de MIME (jpeg/png/webp/mp4/webm), límites de tamaño (10MB img / 50MB vid), `@PreAuthorize EJECUTADOR`.
`TaskServiceImpl.addEvidence()`: valida IN_PROGRESS + usuario asignado → sube → agrega URL.
**Frontend:** `EvidenceUpload` component con drag-drop, `TaskService.uploadEvidence()`, galería imágenes + lista videos en task-detail.
Fix build: eliminar `?.` innecesario en `evidenceImages.length`.

### ✅ Sprint 6 — Real-time Notifications (SSE)
**Backend:** `NotificationEvent` DTO, `NotificationService` (ConcurrentHashMap de SseEmitters), `NotificationController` (GET /stream?token=JWT, manual JWT validation).
SSE endpoint en SecurityConfig como `permitAll()`. Notificaciones en `TaskServiceImpl`: TASK_ASSIGNED al crear, TASK_STARTED/COMPLETED/FAILED en updateStatus.
**Frontend:** `notification.models.ts` (tipos + interfaces), `NotificationService` (EventSource + NgZone + reconnect 5s).
AppLayout conectado al SSE en `ngOnInit`. Dropdown con dot de conexión (emerald/gray), `n.timeAgo`, `n.severity`.
Bug fix: header `z-20` → `z-40` para que el dropdown esté sobre el overlay.
Build: **0 errores, 0 warnings** ✅

### ✅ Sprint 7 — KPIs & Analytics
**Backend:**
- `TaskRepository` +1 método: `findByActivoTrue()` (KPI #6 ranking global)
- DTOs nuevos: `ShiftBreakdownResponse`, `StoreRankingResponse`, `KpiSummaryResponse`
- `KpiService` (interface) + `KpiServiceImpl` con 8 KPIs calculados en memoria:
  - KPI #1 OnTimeRate · KPI #2 DelegaciónEfectiva · KPI #3 ReworkRate · KPI #4 AvgExecMin
  - KPI #5 ShiftBreakdown · KPI #8 CriticalPending · KPI #10 IGEO
  - Sparklines rolling (últimas 10 tareas cerradas)
- `KpiController`: `GET /api/v1/kpis/store/{id}` (ADMIN/GERENTE), `/ranking` (ADMIN), `/me` (any auth)

**Frontend:**
- `features/kpi/kpi.models.ts` — interfaces `KpiSummary`, `StoreRankingEntry`, `ShiftBreakdown`
- `features/kpi/services/kpi.service.ts` — signals + computed `kpiCards`, `pipelineCounts`, `rankingForDisplay`
- `dashboard.ts` — inyecta `KpiService`; computed `kpis()`, `ranking()`, `pipelineSteps()` desde signals reales; fallback hardcoded mientras carga
- `dashboard.html` — loading skeleton en KPI grid, pipeline desde `pipelineSteps()`, ranking desde `ranking()`, delta badge condicional

Build: **0 errores, 0 warnings** ✅

### ✅ Sprint 8 — Reports + KPI #7 + KPI #9
**Backend:**
- `StatusTransition.java` (model): historial de transiciones embebido en Task para KPI #9
- `Task.java`: campo `List<StatusTransition> transitions` con `@Builder.Default`
- `TaskServiceImpl`: registra transición en cada cambio de estado; nueva transición FAILED→PENDING (re-abrir para rework); `applyReopened()` resetea startedAt/finishedAt/onTime
- `UserResponsibilityResponse.java`, `CorrectionSpeedResponse.java`, `DailyReportResponse.java` (DTOs)
- `KpiService` + `KpiServiceImpl`: KPI #7 `getUsersResponsibility()` + KPI #9 `getCorrectionSpeed()`; inyecta `UserRepository`
- `KpiController`: `GET /store/{id}/users`, `GET /store/{id}/correction-speed`
- `ReportService` interface + `ReportServiceImpl` (OpenPDF + Apache POI, 3 sheets Excel)
- `ReportController`: `GET /daily` (JSON preview), `/daily/pdf`, `/daily/excel` con `Content-Disposition: attachment`
- `SecurityConfig`: `/api/v1/reports/**` → ADMIN/GERENTE
- `pom.xml`: poi-ooxml 5.2.5 + openpdf 1.3.30

**Frontend:**
- `features/kpi/kpi.models.ts`: interfaces `UserResponsibilityEntry`, `CorrectionSpeedData`, `DailyReportResponse`
- `features/kpi/services/kpi.service.ts`: signals + métodos KPI #7 y #9
- `features/reports/` (módulo nuevo): `reports.ts` + `reports.html` + `services/report.service.ts` + `reports.routes.ts`
- `app.routes.ts`: ruta `/reports` lazy loaded
- `core/layout/app-layout.ts`: nav item "Monitoreo" → "Reportes" (`/reports`)
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 15 — Módulo de Contingencias / Incidencias
**Backend (12 archivos nuevos + 2 modificados):**
- `IncidentStatus.java`, `IncidentCategory.java`, `IncidentSeverity.java` (enums)
- `IncidentTransition.java` (embedded doc, mirrors StatusTransition)
- `Incident.java` (@Document "incidents", compound indexes por reporter, store y severity)
- `IncidentRepository.java` (7 derived queries + 2 count methods)
- `CreateIncidentRequest.java`, `UpdateIncidentStatusRequest.java`, `IncidentResponse.java` (DTOs)
- `IncidentService.java` (interface) + `IncidentServiceImpl.java` (transiciones ABIERTA→EN_RESOLUCION→CERRADA←→ABIERTA, SSE notifications: INCIDENT_CREATED/IN_RESOLUTION/RESOLVED/REOPENED)
- `IncidentController.java` (5 endpoints: POST /, GET /my, GET /store/{id}?status=, GET /{id}, PATCH /{id}/status)
- `SecurityConfig.java`: matchers /api/v1/incidents/** por rol + método HTTP
- `NotificationEvent.java`: campo `incidentId` agregado

**Frontend (9 archivos nuevos + 5 modificados):**
- `incident.models.ts` (tipos, interfaces, constantes de etiquetas INCIDENT_STATUS_LABELS/CATEGORY_LABELS/SEVERITY_LABELS)
- `services/incident.service.ts` (signals + computed openCount/inResolutionCount/closedCount/criticalOpenCount/criticalOpen + Promise mutations)
- `incidents.routes.ts` (3 rutas: list, create, :id)
- `incident-list/` (ts+html): 4 counter cards, filtros status/severity, lista con barra de color por severidad
- `incident-create/` (ts+html): ReactiveForm, storeId bloqueado al user.storeId, alerta naranja para CRITICA
- `incident-detail/` (ts+html): lifecycle actions (tomar/cerrar/reabrir), modal con resolutionNotes min 10 chars
- `app.routes.ts`: ruta `/incidents` lazy loaded
- `app-layout.ts`: nav item "Incidencias" (triángulo warning, entre Delegación y Reportes)
- `notification.models.ts`: TASK_REOPENED + 4 tipos INCIDENT_* + campo `incidentId` en NotificationEvent
- `dashboard.ts`: inyecta IncidentService, computed openIncidentsCount/criticalOpenIncidents, ngOnInit llama loadByStore en ADMIN y GERENTE
- `dashboard.html`: panel "Incidencias Activas" con 3 contadores + lista críticas top-3 (isManagerView)
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 11 — Módulo Configuración: Gestión de Sucursales
**Backend (8 archivos nuevos + 3 modificados):** Store.java (@Document "stores"), StoreRepository (findByActivoTrue, findByCodigo, existsByCodigo); CreateStoreRequest/UpdateStoreRequest/StoreResponse DTOs; StoreService interface + StoreServiceImpl (create valida código único, toResponse enriquece con 3 conteos, soft-delete); StoreController (5 endpoints).
- UserRepository: +`countByStoreIdAndActivoTrue`; TaskRepository: +`countByStoreIdAndActivoTrue` (TrainingRepository ya tenía este método)
- SecurityConfig: matchers `/api/v1/stores/**` GET→ADMIN|GERENTE, POST/PUT/PATCH→ADMIN

**Frontend (9 archivos nuevos + 1 modificado):** settings.models.ts (StoreResponse, CreateStoreRequest, UpdateStoreRequest, TURNOS_DISPONIBLES); settings.routes.ts; settings.service.ts (signals + Promise); store-list (grid de cards con stats); store-create (ReactiveForm + checkboxes turnos, autoUppercase código); store-detail (header con badges, 3 stat cards, form edición inline, modal desactivación); app.routes.ts: ruta `/settings` lazy loaded
- Bug fix: `?.toUpperCase()` → `(value ?? '').toUpperCase()` para evitar TS2345 en template
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 10 — Módulo Capacitación
**Backend (11 archivos):** TrainingStatus, TrainingLevel (enums); TrainingProgress (embedded), Training (@Document "trainings"); TrainingRepository (6 queries + 2 counts); CreateTrainingRequest, UpdateTrainingProgressRequest, TrainingResponse DTOs; TrainingService interface + TrainingServiceImpl (transiciones PROGRAMADA→EN_CURSO→COMPLETADA|NO_COMPLETADA, notificaciones SSE); TrainingController (6 endpoints).
- SecurityConfig: matchers training GET store/** (GERENTE/ADMIN), POST (GERENTE/ADMIN), DELETE (ADMIN)
- KpiSummaryResponse: nuevo campo `trainingCompletionRate`
- KpiServiceImpl: inyecta TrainingRepository, calcula % COMPLETADAS en STORE context

**Frontend (9 archivos nuevos + 5 modificados):** training.models.ts, training.routes.ts, training.service.ts (signals + Promise); training-list (tabla filtrable estado/nivel, progress bar); training-create (ReactiveForm, datetime-local, select colaboradores desde RhService); training-detail (barra progreso, modales Completar/No Completar con grade/comments); app.routes.ts (/training lazy), kpi.models.ts (trainingCompletionRate), kpi.service.ts (nueva KPI card), dashboard.ts (fallback card Capacitación).
- Build Angular: **0 errores, 0 warnings** ✅
- `CurrentUser` no tiene campo `id` — usar `storeId`/`numeroUsuario` para routing

### ✅ Sprint 9 — Módulo RH (Recursos Humanos)
**Backend:**
- `dto/UserResponse.java`, `dto/CreateUserRequest.java`, `dto/UpdateUserRequest.java` (nuevos)
- `service/UserService.java` (interface) + `service/UserServiceImpl.java`: CRUD de colaboradores, GERENTE scope, hash password, soft-delete
- `controller/UserController.java`: 5 endpoints (`GET /users?storeId=`, `GET /users/{id}`, `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}/deactivate`)
- `SecurityConfig.java`: matchers HttpMethod-específicos para `/api/v1/users/**`

**Frontend:**
- `features/rh/rh.models.ts`: interfaces `UserProfile`, `CreateUserRequest`, `UpdateUserRequest`, constantes `TURNOS`, `ROL_LABELS`, `ROLES_DISPONIBLES`
- `features/rh/services/rh.service.ts`: signals + CRUD completo, Promise-based para mutaciones
- `features/rh/rh.routes.ts`: `''` → UserList, `create` → UserCreate, `':id'` → UserProfile
- `features/rh/user-list/` (ts + html): tabla filtrable por turno y rol, badge activo/inactivo, row click → perfil
- `features/rh/user-create/` (ts + html): ReactiveForm, toggle de roles (ADMIN), storeId bloqueado para GERENTE
- `features/rh/user-profile/` (ts + html): vista/edición inline, mini-dashboard KPI #7 (IGEO, On-Time Rate, Re-trabajo, Ranking, conteos de tareas), desactivación con confirmación (ADMIN)
- `app.routes.ts`: ruta `/rh` lazy loaded
- Build final: **0 errores, 0 warnings** ✅

---

### ✅ Sprint 12 — Gamificación + Ficha de Desempeño Individual
**Backend (6 archivos nuevos + 4 modificados):**
- `BadgeDTO.java`, `LeaderboardEntryDTO.java`, `GamificationSummaryDTO.java` — DTOs nuevos
- `GamificationService.java` (interface) + `GamificationServiceImpl.java`: computeBadges (5 insignias), getLeaderboard (weekly/monthly con Δ IGEO vs período anterior), getMyGamification
- `GamificationController.java`: `GET /api/v1/gamification/store/{id}/leaderboard?period=`, `GET /gamification/me`
- `SecurityConfig.java`: matchers `/api/v1/gamification/**`
- `ReportService.java` + `ReportServiceImpl.java`: nuevo método `generatePerformanceCard(userId)` — PDF con datos personales + KPIs + insignias
- `ReportController.java`: `GET /api/v1/reports/user/{userId}/performance-card`

**Insignias (computed on-the-fly, sin persistencia):**
- `PUNTUAL_ELITE` — OnTimeRate ≥ 95% (min 10 tareas cerradas)
- `CERO_RETRABAJOS` — ReworkRate = 0% (min 5 tareas)
- `VELOCIDAD_RAYO` — AvgExecMin ≤ 50% promedio de sucursal
- `COLABORADOR_MES` — Rank #1 del leaderboard mensual
- `RACHA_7` — 7+ tareas completadas en los últimos 7 días

**Frontend (8 archivos nuevos + 4 modificados):**
- `features/gamification/gamification.models.ts` — Badge, LeaderboardEntry, GamificationSummary, ALL_BADGES catálogo
- `features/gamification/gamification.routes.ts`
- `features/gamification/services/gamification.service.ts` — signals + métodos HTTP
- `features/gamification/leaderboard/` (ts + html): podio top-3, tabla completa, tabs weekly/monthly, Δ IGEO
- `features/gamification/my-badges/` (ts + html): stats personales, barra de progreso, cuadrícula earned/locked
- `app.routes.ts`: ruta `/gamification` lazy loaded
- `core/layout/app-layout.ts`: nav item "Gamificación" (estrella icon)
- `features/rh/user-profile/user-profile.ts + .html`: botón "Ficha PDF" → descarga performance-card
- `features/reports/services/report.service.ts`: método `downloadPerformanceCard(userId)`
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 13 — Dashboards Especializados por Rol
**Solo frontend — 2 archivos modificados:**
- `dashboard.ts`: +`isAdmin`, +`isEjecutador` computed; +`GamificationService` inject; +`teamRanking` (KPI #7 top-5), +`shiftBreakdown`, +`trainingRate`, +`storesInAlert` (IGEO < 70), +`gamifSummary` computed; `ngOnInit` tri-branch (ADMIN / GERENTE / EJECUTADOR); helpers `igeoTextClass`, `shiftBarColor`, `otrLabel`
- `dashboard.html`: 3 secciones condicionales:
  - **ADMIN**: Feed en vivo + Pipeline mini, Ranking inter-sucursal, Sucursales en alerta, Grid de 4 shortcuts ejecutivos (Reportes, Gamificación, RH, Configuración)
  - **GERENTE**: Pipeline del turno, Tabla de equipo KPI #7 top-5, Desglose por turno KPI #5 con barras, Tasa de capacitación
  - **EJECUTADOR**: Card de gamificación (rank + IGEO + badges), Grid de 3 accesos rápidos, Pipeline personal, Lista completa de mis tareas
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 14 — PWA + Responsive Tablet
**Solo frontend — 6 archivos modificados / 2 nuevos:**
- `package.json`: `@angular/service-worker@^21.0.0` instalado
- `ngsw-config.json` (NUEVO): estrategia `prefetch` para app-shell (index.html, CSS, JS) + `lazy/prefetch` para assets estáticos; APIs NO cacheadas (dinámicas + auth)
- `public/manifest.webmanifest` (NUEVO): `name:"METRIX Restaurantes"`, `short_name:"METRIX"`, `theme_color:#ea580c`, `display:standalone`, `start_url:/dashboard`, iconos 72→512px
- `angular.json`: `"serviceWorker": "ngsw-config.json"` en build options
- `src/index.html`: meta PWA (`theme-color`, `apple-mobile-web-app-*`, `description`), `<link rel="manifest">`, `<link rel="apple-touch-icon">`
- `src/app/app.config.ts`: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`
- `app-layout.ts`: señal `mobileOpen = signal(false)`; computed `asideClass()` con mobile translate + lg desktop width; métodos `toggleMobileSidebar()` / `closeMobileSidebar()`
- `app-layout.html`: aside con clases `fixed...lg:relative` responsive; backdrop semitransparente `lg:hidden` al abrir drawer; botón "X" cierra drawer (mobile); `(click)="closeMobileSidebar()"` en cada nav link; botón hamburger ☰ en header `lg:hidden`; dropdowns con `max-w-[calc(100vw-1rem)]`
- Build final: **0 errores, 0 warnings** ✅

### ✅ Sprint 16 — Alertas Preventivas Programadas
**Backend (1 nuevo + 3 modificados):**
- `MetrixApplication.java`: `@EnableScheduling` añadido junto a `@SpringBootApplication` y `@EnableMongoAuditing`
- `TaskRepository.java`: 2 nuevas derived queries — `findByExecution_StatusInAndDueAtBetweenAndActivoTrue` (vencimiento próximo) y `findByExecution_StatusInAndDueAtBeforeAndActivoTrue` (ya vencidas); importa `Collection`
- `NotificationService.java`: nuevo método `sendToAllAdmins(event)` — itera `UserRepository.findByRolesContaining(Role.ADMIN)` y envía SSE a cada uno
- `AlertScheduler.java` (NUEVO — `scheduler/` package): `@Component` con 4 métodos `@Scheduled`:
  - `checkUpcomingDeadlines()` `cron="0 */5 * * * *"` → `TASK_DEADLINE_WARNING` (warning) a asignado + managers
  - `checkOverdueTasks()` `cron="0 */10 * * * *"` → `TASK_OVERDUE` (warning/critical) a asignado + managers
  - `sendDailyIgeoAlert()` `cron="0 0 8 * * *"` → `DAILY_IGEO_ALERT` (critical) a todos los ADMINs si IGEO < 70%
  - `clearWarningSets()` `cron="0 0 * * * *"` → limpia los 2 `Set<String>` de deduplicación cada hora
  - Deduplicación via `ConcurrentHashMap.newKeySet()` (warnedDeadlineIds + warnedOverdueIds)

**Frontend (1 modificado):**
- `notification.models.ts`: 3 nuevos tipos en `NotificationType` union — `TASK_DEADLINE_WARNING`, `TASK_OVERDUE`, `DAILY_IGEO_ALERT`
- Build Angular: **0 errores, 0 warnings** ✅

## Próximos Sprints

| Sprint | Descripción |
|--------|------------|
| Sprint 17 | Por definir |

---

## Archivos Clave

### Backend
```
backend-api/src/main/resources/application.yml
backend-api/src/main/java/com/metrix/api/security/SecurityConfig.java
backend-api/src/main/java/com/metrix/api/security/JwtService.java
backend-api/src/main/java/com/metrix/api/controller/AuthController.java
backend-api/src/main/java/com/metrix/api/controller/TaskController.java
backend-api/src/main/java/com/metrix/api/controller/KpiController.java          ← Sprint 7+8
backend-api/src/main/java/com/metrix/api/controller/ReportController.java        ← Sprint 8
backend-api/src/main/java/com/metrix/api/model/Task.java
backend-api/src/main/java/com/metrix/api/model/StatusTransition.java             ← Sprint 8
backend-api/src/main/java/com/metrix/api/service/TaskServiceImpl.java
backend-api/src/main/java/com/metrix/api/service/KpiServiceImpl.java             ← Sprint 7+8
backend-api/src/main/java/com/metrix/api/service/ReportServiceImpl.java          ← Sprint 8
backend-api/src/main/java/com/metrix/api/dto/KpiSummaryResponse.java             ← Sprint 7
backend-api/src/main/java/com/metrix/api/dto/UserResponsibilityResponse.java     ← Sprint 8
backend-api/src/main/java/com/metrix/api/dto/CorrectionSpeedResponse.java        ← Sprint 8
backend-api/src/main/java/com/metrix/api/dto/DailyReportResponse.java            ← Sprint 8
backend-api/src/main/java/com/metrix/api/controller/UserController.java           ← Sprint 9
backend-api/src/main/java/com/metrix/api/service/UserService.java                 ← Sprint 9
backend-api/src/main/java/com/metrix/api/service/UserServiceImpl.java             ← Sprint 9
backend-api/src/main/java/com/metrix/api/dto/UserResponse.java                    ← Sprint 9
backend-api/src/main/java/com/metrix/api/dto/CreateUserRequest.java               ← Sprint 9
backend-api/src/main/java/com/metrix/api/dto/UpdateUserRequest.java               ← Sprint 9
backend-api/src/main/java/com/metrix/api/model/Training.java                      ← Sprint 10
backend-api/src/main/java/com/metrix/api/model/TrainingProgress.java              ← Sprint 10
backend-api/src/main/java/com/metrix/api/model/TrainingStatus.java                ← Sprint 10
backend-api/src/main/java/com/metrix/api/model/TrainingLevel.java                 ← Sprint 10
backend-api/src/main/java/com/metrix/api/repository/TrainingRepository.java       ← Sprint 10
backend-api/src/main/java/com/metrix/api/service/TrainingService.java             ← Sprint 10
backend-api/src/main/java/com/metrix/api/service/TrainingServiceImpl.java         ← Sprint 10
backend-api/src/main/java/com/metrix/api/controller/TrainingController.java       ← Sprint 10
backend-api/src/main/java/com/metrix/api/dto/CreateTrainingRequest.java           ← Sprint 10
backend-api/src/main/java/com/metrix/api/dto/UpdateTrainingProgressRequest.java   ← Sprint 10
backend-api/src/main/java/com/metrix/api/dto/TrainingResponse.java                ← Sprint 10
backend-api/src/main/java/com/metrix/api/model/Store.java                          ← Sprint 11
backend-api/src/main/java/com/metrix/api/repository/StoreRepository.java           ← Sprint 11
backend-api/src/main/java/com/metrix/api/service/StoreService.java                 ← Sprint 11
backend-api/src/main/java/com/metrix/api/service/StoreServiceImpl.java             ← Sprint 11
backend-api/src/main/java/com/metrix/api/controller/StoreController.java           ← Sprint 11
backend-api/src/main/java/com/metrix/api/dto/CreateStoreRequest.java               ← Sprint 11
backend-api/src/main/java/com/metrix/api/dto/UpdateStoreRequest.java               ← Sprint 11
backend-api/src/main/java/com/metrix/api/dto/StoreResponse.java                    ← Sprint 11
```

### Frontend
```
frontend-web/src/environments/environment.ts          ← apiUrl = 'http://localhost:8080/api/v1'
frontend-web/src/styles.scss                          ← @layer components, input-field, body
frontend-web/tailwind.config.js                       ← brand colors, shadow-card
frontend-web/src/app/app.routes.ts
frontend-web/src/app/app.config.ts
frontend-web/src/app/core/layout/app-layout.ts
frontend-web/src/app/features/auth/services/auth.service.ts
frontend-web/src/app/features/tasks/services/task.service.ts
frontend-web/src/app/features/tasks/models/task.models.ts
frontend-web/src/app/features/kpi/kpi.models.ts                       ← Sprint 7+8
frontend-web/src/app/features/kpi/services/kpi.service.ts             ← Sprint 7+8
frontend-web/src/app/features/reports/reports.ts                       ← Sprint 8
frontend-web/src/app/features/reports/reports.html                     ← Sprint 8
frontend-web/src/app/features/reports/services/report.service.ts       ← Sprint 8
frontend-web/src/app/features/dashboard/dashboard.ts                   ← Sprint 7
frontend-web/src/app/features/dashboard/dashboard.html                 ← Sprint 7
frontend-web/src/app/features/rh/rh.models.ts                          ← Sprint 9
frontend-web/src/app/features/rh/services/rh.service.ts                ← Sprint 9
frontend-web/src/app/features/rh/rh.routes.ts                          ← Sprint 9
frontend-web/src/app/features/rh/user-list/user-list.ts                ← Sprint 9
frontend-web/src/app/features/rh/user-create/user-create.ts            ← Sprint 9
frontend-web/src/app/features/rh/user-profile/user-profile.ts          ← Sprint 9
frontend-web/src/app/features/training/training.models.ts               ← Sprint 10
frontend-web/src/app/features/training/training.routes.ts               ← Sprint 10
frontend-web/src/app/features/training/services/training.service.ts     ← Sprint 10
frontend-web/src/app/features/training/training-list/training-list.ts   ← Sprint 10
frontend-web/src/app/features/training/training-create/training-create.ts ← Sprint 10
frontend-web/src/app/features/training/training-detail/training-detail.ts ← Sprint 10
frontend-web/src/app/features/settings/settings.models.ts                  ← Sprint 11
frontend-web/src/app/features/settings/settings.routes.ts                  ← Sprint 11
frontend-web/src/app/features/settings/services/settings.service.ts        ← Sprint 11
frontend-web/src/app/features/settings/store-list/store-list.ts            ← Sprint 11
frontend-web/src/app/features/settings/store-create/store-create.ts        ← Sprint 11
frontend-web/src/app/features/settings/store-detail/store-detail.ts        ← Sprint 11
```

---

## Notas de Sesión

### 2026-02-27 (sesión 1)
- Sprint 5 completo: GCS integration (evidencias fotos/video), EvidenceUpload drag-drop
- Sprint 6 completo: SSE notifications backend + frontend, AppLayout conectado
- Bug fix: logout dropdown inaccesible por CSS stacking context (header z-20 → z-40)
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 2)
- Sprint 7 completo: KPIs & Analytics backend + frontend
- 7 archivos backend nuevos/modificados; 4 archivos frontend nuevos/modificados
- Dashboard ahora consume datos reales del backend vía KpiService
- Pipeline counts, KPI cards y ranking son reactivos (signals + computed)
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 3)
- Sprint 8 completo: Reports + KPI #7 + KPI #9
- 14 archivos backend (7 nuevos, 7 modificados); 8 archivos frontend (4 nuevos, 4 modificados)
- StatusTransition embebido en Task; FAILED→PENDING permite re-apertura para rework
- KPI #7: ranking de colaboradores con IGEO individual (GET /kpis/store/{id}/users)
- KPI #9: velocidad de corrección por ciclos FAILED→COMPLETED (GET /kpis/store/{id}/correction-speed)
- ReportServiceImpl: PDF con OpenPDF + Excel con Apache POI (3 hojas)
- Módulo /reports en Angular con preview JSON + descarga blob PDF/Excel
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 5)
- Sprint 10 completo: Módulo Capacitación
- **Backend** (11 archivos): TrainingStatus/TrainingLevel enums; TrainingProgress/Training model; TrainingRepository; 3 DTOs; TrainingService interface + TrainingServiceImpl (transiciones + SSE); TrainingController (6 endpoints)
- SecurityConfig + KpiSummaryResponse + KpiServiceImpl actualizados
- **Frontend** (9 nuevos + 5 modificados): training.models.ts, training.routes.ts, training.service.ts, training-list/create/detail (ts+html), app.routes.ts, kpi.models.ts, kpi.service.ts, dashboard.ts
- Bug fix: `CurrentUser` no tiene campo `id` → training-list usa solo `storeId` para routing
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-28 (sesión 10)
- Sprint 15 completo: Módulo de Contingencias / Incidencias
- **Backend** (12 nuevos + 2 modificados): 3 enums; IncidentTransition (embedded); Incident (@Document, compound indexes); IncidentRepository (7 queries); 3 DTOs; IncidentService/Impl (máquina de estados + SSE 4 eventos); IncidentController (5 endpoints); SecurityConfig matchers /incidents/**; NotificationEvent +incidentId
- **Frontend** (9 nuevos + 5 modificados): incident.models.ts, incident.service.ts (signals+computed+Promise), incidents.routes.ts, incident-list/create/detail (ts+html); app.routes.ts /incidents; app-layout nav Incidencias; notification.models.ts +incidentId +tipos; dashboard.ts inyecta IncidentService + computed + ngOnInit; dashboard.html panel "Incidencias Activas" (isManagerView)
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-28 (sesión 9)
- Sprint 14 completo: PWA + Responsive Tablet
- `@angular/service-worker@^21.0.0` instalado; `ngsw-config.json` (app-shell prefetch + assets lazy); `manifest.webmanifest` (standalone, theme orange-600, start_url /dashboard)
- `angular.json` → `serviceWorker: "ngsw-config.json"`; `index.html` → meta PWA + apple-touch + manifest link; `app.config.ts` → `provideServiceWorker('ngsw-worker.js', enabled: !isDevMode())`
- Sidebar responsive: señal `mobileOpen`, computed `asideClass()`, aside con `fixed lg:relative`, backdrop `lg:hidden`, botón X cierre, hamburger en header `lg:hidden`, nav links cierran drawer automáticamente
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 8)
- Sprint 13 completo: Dashboards Especializados por Rol
- 2 archivos modificados: dashboard.ts + dashboard.html
- ADMIN: Feed + Ranking + Alertas IGEO<70 + 4 shortcuts ejecutivos
- GERENTE: Pipeline + Tabla equipo KPI#7 + Desglose turno KPI#5 + Tasa capacitación
- EJECUTADOR: Card gamificación (rank/IGEO/badges) + accesos + pipeline + mis tareas completas
- 0 endpoints nuevos — reutiliza GamificationService y KpiService existentes
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 7)
- Sprint 12 completo: Gamificación + Ficha de Desempeño Individual
- **Backend** (6 nuevos + 4 modificados): 3 DTOs; GamificationService/Impl (5 insignias on-the-fly, leaderboard weekly/monthly con Δ IGEO); GamificationController (2 endpoints); SecurityConfig matchers gamificación; ReportService/Impl + ReportController: performance-card PDF; ReportServiceImpl inyecta UserRepository + GamificationService
- **Frontend** (8 nuevos + 4 modificados): gamification.models.ts, gamification.routes.ts, gamification.service.ts, leaderboard (podio+tabla+tabs), my-badges (cuadrícula earned/locked); user-profile: botón "Ficha PDF"; report.service.ts: downloadPerformanceCard; app.routes.ts + app-layout.ts: /gamification lazy
- Fix: import environment con 5 niveles → corregido a 4 (`../../../../environments/environment`)
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 6)
- Sprint 11 completo: Módulo Configuración — Gestión de Sucursales
- **Backend** (8 nuevos + 3 modificados): Store.java, StoreRepository, 3 DTOs, StoreService/Impl, StoreController; UserRepository + TaskRepository +countByStoreIdAndActivoTrue; SecurityConfig matchers stores
- **Frontend** (9 nuevos + 1 modificado): settings.models.ts, settings.routes.ts, settings.service.ts, store-list/create/detail (ts+html cada uno), app.routes.ts /settings
- Bug fix: template `?.toUpperCase()` → `(value ?? '').toUpperCase()` (TS2345)
- Build final: **0 errores, 0 warnings** ✅

### 2026-02-27 (sesión 4)
- Sprint 9 completo: Módulo RH — gestión de colaboradores
- **Backend** (7 archivos): UserResponse, CreateUserRequest, UpdateUserRequest DTOs; UserService interface; UserServiceImpl (GERENTE scope, hash password, soft-delete); UserController (5 endpoints); SecurityConfig (matchers HttpMethod por rol)
- **Frontend** (9 archivos + app.routes.ts): rh.models.ts, rh.service.ts (signals + Promise), rh.routes.ts, user-list (tabla filtrable), user-create (ReactiveForm), user-profile (edición inline + mini-dashboard KPI #7)
- Build Angular: **0 errores, 0 warnings** ✅
- **Bug fixes Sprint 8** detectados al levantar backend:
  - `TaskServiceImpl.java`: variables `type/severity/title` sin inicializar en switch → agregados valores por defecto antes del switch
  - `ReportServiceImpl.java`: `import com.lowagie.text.*` importaba `com.lowagie.text.Row` que colisionaba con `org.apache.poi.ss.usermodel.Row` → reemplazado wildcard por imports explícitos (`Chunk`, `Document`, `Paragraph`, etc.)
- Backend levanta correctamente en puerto 8080 ✅
