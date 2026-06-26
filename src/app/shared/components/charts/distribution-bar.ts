import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  computed, effect, inject, input, viewChild,
} from '@angular/core';
import { Chart } from 'chart.js';
import { ChartDatum, DARK_TOOLTIP, PALETTE, ensureChartsRegistered, withAlpha } from './chart-core';

const FALLBACK = [PALETTE.brand, PALETTE.cyan, PALETTE.emerald, PALETTE.amber, PALETTE.violet, PALETTE.red];

/**
 * Barras de distribución (vertical u horizontal) con esquinas redondeadas.
 * <p>
 * Para distribución de puntajes de exámenes, severidad/categoría de incidencias,
 * o desempeño por sucursal. Estilo consistente con el gráfico de barras del
 * dashboard: barras con acento de color y grid sutil.
 */
@Component({
  selector: 'app-distribution-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="w-full" [style.height.px]="size()"><canvas #canvas></canvas></div>`,
})
export class DistributionBar {
  readonly data = input.required<ChartDatum[]>();
  readonly horizontal = input(false);
  readonly size = input(180);
  /** Color único para todas las barras; si se omite usa el de cada dato o la paleta. */
  readonly color = input<string | null>(null);
  /** Máximo del eje de valor; si se omite, automático. */
  readonly max = input<number | null>(null);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  readonly resolved = computed<ChartDatum[]>(() =>
    this.data().map((d, i) => ({ ...d, color: this.color() ?? d.color ?? FALLBACK[i % FALLBACK.length] })));

  constructor() {
    ensureChartsRegistered();
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    effect(() => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      const items = this.resolved();
      const labels = items.map(d => d.label);
      const values = items.map(d => d.value);
      const colors = items.map(d => withAlpha(d.color!, 0.85));
      const horizontal = this.horizontal();
      const max = this.max();

      if (this.chart) {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[0].backgroundColor = colors;
        this.chart.update();
        return;
      }

      const valueAxis = {
        beginAtZero: true, max: max ?? undefined,
        grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false },
        ticks: { font: { size: 10 }, color: 'rgba(255,255,255,0.4)', precision: 0 },
      };
      const catAxis = {
        grid: { display: false }, border: { display: false },
        ticks: { font: { size: 10 }, color: 'rgba(255,255,255,0.55)' },
      };

      this.chart = new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderWidth: 0,
                 maxBarThickness: horizontal ? 22 : 48 }] },
        options: {
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600 },
          plugins: { legend: { display: false }, tooltip: { ...DARK_TOOLTIP } },
          scales: horizontal
            ? { x: valueAxis, y: catAxis }
            : { x: catAxis, y: valueAxis },
        },
      });
    });
  }
}
