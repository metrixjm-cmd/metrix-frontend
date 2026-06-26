import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  computed, effect, inject, input, viewChild,
} from '@angular/core';
import { Chart } from 'chart.js';
import { PALETTE, ensureChartsRegistered, thresholdColor, withAlpha } from './chart-core';

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

      if (this.chart) {
        this.chart.data.datasets[0].data = data;
        (this.chart.data.datasets[0].backgroundColor as string[])[0] =
          this.hasData() ? color : PALETTE.track;
        this.chart.update();
        return;
      }

      // Tamaño fijo y cuadrado: el gauge no usa el auto-resize de Chart.js
      // (medía mal el contenedor por timing y desbordaba). Buffer escalado por
      // DPR para nitidez en pantallas retina.
      const size = this.size();
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);

      this.chart = new Chart(el, {
        type: 'doughnut',
        data: {
          datasets: [{
            data,
            backgroundColor: [this.hasData() ? color : PALETTE.track, PALETTE.track],
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
      });
      // Glow sutil consistente con los medidores del dashboard (solo con datos).
      el.style.filter = this.hasData() ? `drop-shadow(0 0 6px ${withAlpha(color, 0.35)})` : 'none';
    });
  }
}
