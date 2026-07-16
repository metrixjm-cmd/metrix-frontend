import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  computed, effect, inject, input, viewChild,
} from '@angular/core';
import { Chart, Plugin } from 'chart.js';
import { PALETTE, ensureChartsRegistered, mixHex, thresholdColor, withAlpha } from './chart-core';

/**
 * Gauge radial (velocímetro 270° o anillo 360°) con valor central.
 * <p>
 * Réplica del estilo de los medidores del dashboard: arco con glow suave sobre
 * pista oscura y número grande centrado. Pasa {@code value < 0} para "S/D".
 */
@Component({
  selector: 'app-radial-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative mx-auto" [style.width.px]="size()" [style.height.px]="size()">
      <canvas #canvas></canvas>
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span class="font-bold tracking-tight leading-none"
              [class]="valueClass()" [style.color]="hasData() ? resolvedColor() : null">
          {{ display() }}<span class="text-sm font-normal text-white/40">{{ hasData() ? unit() : '' }}</span>
        </span>
        @if (caption()) {
          <span class="text-[10px] text-white/40 mt-1 text-center px-2">{{ caption() }}</span>
        }
      </div>
    </div>
  `,
})
export class RadialGauge {
  /** Valor 0–100. Negativo = sin datos (muestra "S/D"). */
  readonly value = input.required<number>();
  /** Arco en grados: 270 (velocímetro) o 360 (anillo). */
  readonly arc = input(270);
  /** Marcas de escala + aguja. Solo aplica al arco de 270 (un anillo de 360 no
   *  tiene inicio ni fin, así que una escala no significa nada ahí). */
  readonly ticks = input(true);
  /** Color del arco; si se omite se deriva por umbral del valor. */
  readonly color = input<string | null>(null);
  /** true si valores bajos son mejores (invierte el umbral de color). */
  readonly higherIsBetter = input(true);
  readonly unit = input('%');
  readonly caption = input('');
  readonly size = input(140);
  /** Decimales a mostrar. */
  readonly decimals = input(1);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  readonly hasData = computed(() => this.value() >= 0);
  readonly resolvedColor = computed(() =>
    this.color() ?? thresholdColor(this.value(), this.higherIsBetter()));
  readonly display = computed(() =>
    this.hasData() ? this.value().toFixed(this.decimals()) : 'S/D');
  readonly valueClass = computed(() =>
    this.hasData() ? 'text-3xl' : 'text-xl text-white/30');

  constructor() {
    ensureChartsRegistered();
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    effect(() => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      const value = Math.max(this.value(), 0);
      const arc = this.arc();
      const color = this.resolvedColor();
      const data = [value, Math.max(100 - value, 0)];

      // Tamaño fijo y cuadrado: el gauge no usa el auto-resize de Chart.js
      // (medía mal el contenedor por timing y desbordaba). Buffer escalado por
      // DPR para nitidez en pantallas retina.
      const size = this.size();
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);

      const ctx = el.getContext('2d');
      const arcFill = this.hasData() && ctx ? this.buildGradient(ctx, size, dpr, color) : (this.hasData() ? color : PALETTE.track);

      if (this.chart) {
        this.chart.data.datasets[0].data = data;
        (this.chart.data.datasets[0].backgroundColor as (string | CanvasGradient)[])[0] =
          this.hasData() ? arcFill : PALETTE.track;
        this.chart.update();
        el.style.filter = this.hasData() ? `drop-shadow(0 0 10px ${withAlpha(color, 0.55)})` : 'none';
        return;
      }

      this.chart = new Chart(el, {
        type: 'doughnut',
        data: {
          datasets: [{
            data,
            backgroundColor: [arcFill, PALETTE.track],
            borderWidth: 0,
            borderRadius: arc === 360 ? 0 : 8,
          }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          cutout: '78%',
          circumference: arc,
          rotation: arc === 360 ? 0 : -135,
          animation: { animateRotate: true, duration: 700 },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
        plugins: [this.decorPlugin()],
      });
      // Glow neón consistente con el estilo del dashboard (solo con datos).
      el.style.filter = this.hasData() ? `drop-shadow(0 0 10px ${withAlpha(color, 0.55)})` : 'none';
    });
  }

  /**
   * Plugin: escala de tacómetro (marcas) + aguja apuntando al valor.
   * <p>
   * Geometría: Chart.js mide la rotación desde las 12 en sentido horario, y el
   * canvas mide sus ángulos desde el eje +x. De ahí el -90 de conversión. Con
   * rotation=-135 y circumference=270: t=0 abajo-izquierda, t=0.5 arriba,
   * t=1 abajo-derecha.
   * <p>
   * Se dibuja en afterDatasetsDraw para quedar sobre el arco, y hereda el glow
   * del filtro CSS que ya lleva el canvas.
   */
  private decorPlugin(): Plugin<'doughnut'> {
    return {
      id: 'gauge-decor',
      afterDatasetsDraw: (chart) => {
        if (!this.ticks() || this.arc() !== 270 || !this.hasData()) return;

        const arcEl = chart.getDatasetMeta(0)?.data?.[0] as unknown as
          { x: number; y: number; outerRadius: number; innerRadius: number } | undefined;
        if (!arcEl) return;

        const { x, y, outerRadius: R, innerRadius: r } = arcEl;
        const ctx = chart.ctx;
        // El buffer del canvas está escalado por DPR, igual que R: derivamos la
        // unidad de trazo de R para que el grosor no dependa de la pantalla.
        const u = R / 75;
        const angle = (t: number) => ((-135 + 270 * t) - 90) * Math.PI / 180;
        const line = (t: number, r1: number, r2: number, w: number, stroke: string) => {
          const a = angle(t), c = Math.cos(a), s = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(x + c * r1, y + s * r1);
          ctx.lineTo(x + c * r2, y + s * r2);
          ctx.lineWidth = w;
          ctx.strokeStyle = stroke;
          ctx.lineCap = 'round';
          ctx.stroke();
        };

        ctx.save();

        // Marcas por dentro del aro: hacia fuera Chart.js no deja margen y se
        // recortarían contra el borde del canvas.
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const mayor = i % 2 === 0;                       // 0, 25, 50, 75, 100
          line(
            t,
            r - (mayor ? 9 : 5) * u,
            r - 2 * u,
            (mayor ? 2 : 1) * u,
            mayor ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.14)',
          );
        }

        // Aguja: no arranca del centro porque ahí vive el número grande del
        // diseño actual; nace pasado el texto y cruza el aro.
        const t = Math.min(Math.max(this.value(), 0), 100) / 100;
        const color = this.resolvedColor();
        line(t, r - 20 * u, R + 1 * u, 3 * u, color);
        // Remate en la punta, para que se lea como aguja y no como otra marca.
        const a = angle(t);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (r - 20 * u), y + Math.sin(a) * (r - 20 * u), 2.5 * u, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
      },
    };
  }

  /** Gradiente diagonal claro→base para un arco con más profundidad que un relleno plano. */
  private buildGradient(ctx: CanvasRenderingContext2D, size: number, dpr: number, color: string): CanvasGradient {
    const px = size * dpr;
    const g = ctx.createLinearGradient(0, 0, px, px);
    g.addColorStop(0, mixHex(color, '#ffffff', 0.35));
    g.addColorStop(1, color);
    return g;
  }
}
