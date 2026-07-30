# METRIX Responsive Design Patterns

## Filosofía: Mobile-First

Todos los componentes en METRIX siguen un enfoque **mobile-first**:
- El **estilo por defecto** es para dispositivos móviles (375px+)
- Los **breakpoints amplían** la experiencia hacia desktop
- **No hay estilos para pantallas pequeñas** — una pantalla móvil no usa `sm:` prefixes

---

## Breakpoints de Tailwind

```scss
// Configuración estándar de Tailwind (tailwind.config.js)
sm:  640px
md:  768px   ← Punto de quiebre PRINCIPAL
lg:  1024px  ← Desktop
xl:  1280px  ← Desktop grande
```

**Regla de oro:** Usa `md:` y `lg:` para la mayoría de cambios responsivos. Rara vez necesitarás `sm:` o `xl:`.

---

## Patrones Reutilizables

### 1. Padding de Página (Mobile-First)

```html
<!-- Comienza pequeño, crece con la pantalla -->
<div class="p-4 md:p-5 lg:p-6">
  <!-- Contenido -->
</div>
```

**Lógica:**
- `p-4` (16px) en móvil → más compacto, usa el espacio disponible
- `md:p-5` (20px) en tablets
- `lg:p-6` (24px) en desktop

### 2. Grillas Adaptativas

```html
<!-- 2 columnas en móvil, 4 en desktop -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:ml-auto">
  <div class="ds-card">...</div>
  <div class="ds-card">...</div>
  <div class="ds-card">...</div>
  <div class="ds-card">...</div>
</div>
```

**Variaciones comunes:**
- `grid-cols-1 md:grid-cols-2` — 1 columna móvil → 2 desktop
- `grid-cols-2 lg:grid-cols-3` — 2 móvil → 3 desktop
- `grid-cols-3 lg:grid-cols-4` — 3 móvil → 4 desktop

### 3. Layout Flex Responsivo

```html
<!-- Stack vertical en móvil, horizontal en desktop -->
<div class="flex flex-col lg:flex-row lg:items-start gap-4 mb-5">
  <div class="flex-1">Título y tabs</div>
  <div class="flex-1 lg:ml-auto lg:max-w-[660px]">Metric cards</div>
</div>
```

**Patrón:**
- Por defecto: `flex-col` (apilado vertical)
- En `lg:`: `flex-row` (lado a lado)
- Agregá `lg:ml-auto` para empujar a la derecha
- Limitá ancho máximo con `lg:max-w-[...]`

### 4. Ocultar/Mostrar por Breakpoint

```html
<!-- Tabla: visible en md y mayor -->
<div class="gamif-table-header hidden md:grid px-5 py-3">
  <!-- Tabla desktop -->
</div>

<!-- Card: visible solo en móvil -->
<div class="gamif-row md:hidden px-4 py-3.5">
  <!-- Versión móvil (tipo card) -->
</div>
```

**Regla:**
- `hidden` + `md:block` (o `md:grid`, `md:flex`) — oculto por defecto, visible en md
- `md:hidden` — visible en móvil, oculto en md
- **NUNCA** uses `lg:hidden` solo; siempre combina con breakpoint anterior

### 5. Tipografía Responsiva

```html
<!-- Títulos -->
<h1 class="text-xl md:text-2xl lg:text-3xl font-bold">
  Ranking Gerencial
</h1>

<!-- Subtítulos -->
<p class="text-sm md:text-base font-medium">
  Desempeño de gerentes
</p>

<!-- Etiquetas/Labels (invariantes) -->
<span class="text-xs uppercase tracking-widest">
  EQUIPO
</span>
```

**Tamaños de Tailwind:**
- `text-xs` (10px) — labels, badges
- `text-sm` (13px) — subtítulos móvil
- `text-base` (15px) — body text
- `text-lg` (18px) — headings móvil
- `text-xl` (22px) — headings
- `text-2xl` (26px) — headings grandes
- `text-3xl` (32px) — headings muy grandes

**Patrón recomendado:**
```
Heading:    text-lg md:text-xl lg:text-2xl
Subheading: text-sm md:text-base
Label:      text-xs (sin cambios)
Body:       text-sm md:text-base
```

### 6. Espaciado Adaptativo

```html
<!-- Gap entre items -->
<div class="flex gap-2 md:gap-4 lg:gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Margin progresivo -->
<div class="mb-4 md:mb-5 lg:mb-6">
  Content
</div>
```

### 7. Componentes con Tamaños Variables

```html
<!-- Card podio: crece en móvil → desktop -->
<div class="p-3 md:p-6 max-w-[200px] md:max-w-[230px]">
  <div class="gamif-avatar text-lg md:text-xl mb-2">
    CG
  </div>
  <p class="text-xl md:text-2xl font-extrabold">
    89.3%
  </p>
</div>
```

**Lógica:**
- Padding móvil compacto → desktop generoso
- Avatar crece: `text-lg` (18px) → `md:text-xl` (22px)
- Score crece: `text-xl` (22px) → `md:text-2xl` (26px)
- Max-width aumenta: 200px → 230px

---

## Caso de Uso: Leaderboard Gerencial

### Vista Móvil (375px)

```
┌─────────────────────────┐
│ Ranking Gerencial       │
│ Desempeño de gerentes   │
│ [Esta semana] [Mes]     │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ PART.   │ │ CUMPL.  │ │ (2 columnas)
│ │ 82%     │ │ 29.3%   │ │
│ └─────────┘ └─────────┘ │
├─────────────────────────┤
│ TOP 3 (stacked vertical)│
│ ┌───────────────────┐   │
│ │ 🥈 Gerente 2      │   │
│ │ 55.3% IGEO        │   │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 🥇 Gerente 1      │   │
│ │ 89.3% IGEO        │   │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 🥉 Gerente 2      │   │
│ │ 55.3% IGEO        │   │
│ └───────────────────┘   │
├─────────────────────────┤
│ TABLA (versión card)    │
│ ┌───────────────────┐   │
│ │ 1 - Gerente 1     │   │
│ │ Sucursal Centro   │   │
│ │ 89.3% • 3 colab.  │   │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 2 - Gerente 2     │   │
│ │ Sucursal Sur      │   │
│ │ 55.3% • 3 colab.  │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

**Clases móviles:**
- `p-4` — padding de página
- `grid-cols-2` — metrics en 2 columnas
- `gap-2` — espacio pequeño entre items
- `md:hidden` — tabla oculta
- `hidden md:block` — tabla desktop oculta
- `text-lg` — títulos móvil
- `text-sm` — subtítulos móvil

### Vista Desktop (1280px)

```
┌────────────────────────────────────────────────────┐
│ Ranking Gerencial        PART. CUMPL. INSIGN. RACHA│
│ Desempeño de gerentes    82%   29.3%   18    5 días│
│ [Esta semana] [Mes]                                │
├────────────────────────────────────────────────────┤
│                     TOP 3                           │
│          🥈         🥇          🥉                  │
│      Gerente 2  Gerente 1   Gerente 2             │
│      55.3%      89.3%       55.3%                 │
├────────────────────────────────────────────────────┤
│ TABLA (grid)                                       │
│ # │ Gerente     │ Sucursal        │ Colab │ IGEO  │
│ 1 │ Gerente 1   │ Sucursal Centro │ 3     │ 89.3% │
│ 2 │ Gerente 2   │ Sucursal Sur    │ 3     │ 55.3% │
└────────────────────────────────────────────────────┘
```

**Clases desktop:**
- `lg:p-6` — padding más generoso
- `xl:flex-row` — título y metrics lado a lado
- `lg:grid-cols-4` — metrics en 4 columnas
- `gap-4 md:gap-5` — espaciado mayor
- `md:grid` — tabla visible
- `text-2xl` — títulos grandes
- `text-base` — body text legible

---

## Checklist para Nuevos Componentes

- [ ] **Comienza con estilo móvil** — sin prefixes en las clases base
- [ ] **Agrega `md:`** para tablets y desktop grande
- [ ] **Usa `lg:`** para cambios significativos de layout
- [ ] **Evita `sm:` y `xl:`** — rara vez necesarios
- [ ] **Prueba en 375px** — Devtools: `Ctrl+Shift+M` o preset mobile
- [ ] **Verifica sin scroll horizontal** — content debe reflow, no scroll
- [ ] **Tipografía escala progresiva** — nunca desciende de tamaño
- [ ] **Espaciado es predecible** — `p-4 → md:p-5 → lg:p-6`
- [ ] **Componentes ocultables** — considera `hidden md:block` si alternativa móvil existe
- [ ] **Testea en 3+ breakpoints** — móvil, tablet, desktop

---

## Antipatrones a Evitar

❌ **NO:** `sm:p-2 md:p-4 lg:p-6` — demasiados cambios, confuso  
✅ **SÍ:** `p-4 md:p-5 lg:p-6` — progresión suave

❌ **NO:** `hidden lg:block` — ¿qué pasa en md?  
✅ **SÍ:** `hidden md:block` — claro dónde cambia

❌ **NO:** Tipografía que se achica: `text-lg md:text-sm`  
✅ **SÍ:** Tipografía que crece: `text-sm md:text-base`

❌ **NO:** `flex-col lg:flex-row` sin `md:` — salta de móvil a desktop  
✅ **SÍ:** `flex-col md:flex-row` — transición suave

---

## Validación Rápida

**Herramienta:** Devtools → Responsive Design Mode (`Ctrl+Shift+M`)

**Pasos:**
1. Abre el componente en dev
2. Activa Responsive Mode
3. Configura para **375px** (móvil)
4. Verifica:
   - ✓ Sin scroll horizontal
   - ✓ Texto legible (no recortado)
   - ✓ Espaciado coherente
   - ✓ Botones/interactivos accesibles (touch: 44x44px mín)
5. Cambia a **768px** (tablet) — ¿cambios esperados?
6. Cambia a **1280px** (desktop) — ¿layout completo?

---

## Referencias en el Proyecto

- **Design System:** `src/styles/_design-system.scss`
- **Tailwind Config:** `tailwind.config.js`
- **Ejemplo vivo:** `src/app/features/gamification/leaderboard/leaderboard.html`

---

**Última actualización:** 2026-07-26  
**Relacionado:** [[kpi-charts-module]], [[correr-backend-local]]
