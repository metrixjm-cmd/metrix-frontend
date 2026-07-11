/**
 * Núcleo de Chart.js para METRIX.
 * <p>
 * Registra SOLO los controllers/elementos usados (tree-shaking) y expone la
 * paleta semántica y helpers de tema compartidos por todos los componentes de
 * gráfica del panel /kpi. Mantiene consistencia visual con el dashboard:
 * fondo oscuro glassy, anillos con acentos neón, tooltips oscuros.
 */
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

/** Dato categórico genérico para donuts y barras. */
export interface ChartDatum {
  label: string;
  value: number;
  /** Hex opcional; si se omite se asigna desde la paleta por índice. */
  color?: string;
}

let registered = false;

/** Registra los módulos de Chart.js una sola vez (idempotente). */
export function ensureChartsRegistered(): void {
  if (registered) return;
  Chart.register(
    DoughnutController, ArcElement,
    LineController, LineElement, PointElement, Filler,
    BarController, BarElement,
    CategoryScale, LinearScale,
    Tooltip,
  );
  Chart.defaults.font.family =
    "Inter, ui-sans-serif, system-ui, sans-serif";
  Chart.defaults.color = 'rgba(255,255,255,0.55)';
  registered = true;
}

/**
 * Paleta semántica METRIX — alineada con los colores del dashboard
 * (Over-all azul, On-Time esmeralda, Re-trabajo rojo, Capacitación violeta).
 * Fija a propósito: las variables --brand-* cambian con el tema (hasta negro),
 * las gráficas necesitan color estable y legible sobre fondo oscuro.
 */
export const PALETTE = {
  brand:   '#3b82f6',
  cyan:    '#22d3ee',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  slate:   '#64748b',
  track:   'rgba(255,255,255,0.06)',
} as const;

/** Escala de severidad/estado (de bueno a crítico) para distribuciones. */
export const SEVERITY_COLORS = [PALETTE.emerald, PALETTE.amber, PALETTE.red, PALETTE.rose];

/** Convierte un hex (#rrggbb) a rgba con alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Color según umbral (mayor es mejor) — para gauges de rendimiento. */
export function thresholdColor(value: number, higherIsBetter = true): string {
  const v = higherIsBetter ? value : 100 - value;
  if (v >= 80) return PALETTE.emerald;
  if (v >= 60) return PALETTE.cyan;
  if (v >= 40) return PALETTE.amber;
  return PALETTE.red;
}

/**
 * Plugin Chart.js: aplica un glow (sombra) SOLO a los datasets (barras/líneas),
 * no al grid ni a las etiquetas de eje — evita que el texto se vea borroso.
 * Se engancha en beforeDatasetsDraw/afterDatasetsDraw, que corren después de
 * que Chart.js ya dibujó el grid pero antes/después de las marcas de datos.
 */
export function glowPlugin(color: string, blur = 10) {
  return {
    id: `glow-${color}-${blur}`,
    beforeDatasetsDraw(chart: Chart) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    },
    afterDatasetsDraw(chart: Chart) {
      chart.ctx.restore();
    },
  };
}

/** Mezcla dos hex por una fracción t∈[0,1] — usado para gradientes de arco. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', ''), pb = b.replace('#', '');
  const ar = parseInt(pa.substring(0, 2), 16), ag = parseInt(pa.substring(2, 4), 16), ab = parseInt(pa.substring(4, 6), 16);
  const br = parseInt(pb.substring(0, 2), 16), bg = parseInt(pb.substring(2, 4), 16), bb = parseInt(pb.substring(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), b2 = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, b2].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Opciones de tooltip oscuro consistentes con el tema. */
export const DARK_TOOLTIP = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  titleColor: 'rgba(255,255,255,0.9)',
  bodyColor: 'rgba(255,255,255,0.7)',
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 4,
} as const;
