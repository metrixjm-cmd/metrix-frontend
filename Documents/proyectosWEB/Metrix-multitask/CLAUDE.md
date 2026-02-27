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

---

## Próximos Sprints

| Sprint | Descripción |
|--------|------------|
| Sprint 9 | Módulo RH — gestión de colaboradores, perfiles, turnos |
| Sprint 10 | Módulo Capacitación — asignación y seguimiento de formaciones |

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
frontend-web/src/app/features/kpi/kpi.models.ts                  ← Sprint 7+8
frontend-web/src/app/features/kpi/services/kpi.service.ts        ← Sprint 7+8
frontend-web/src/app/features/reports/reports.ts                  ← Sprint 8
frontend-web/src/app/features/reports/reports.html                ← Sprint 8
frontend-web/src/app/features/reports/services/report.service.ts  ← Sprint 8
frontend-web/src/app/features/dashboard/dashboard.ts              ← Sprint 7
frontend-web/src/app/features/dashboard/dashboard.html            ← Sprint 7
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
