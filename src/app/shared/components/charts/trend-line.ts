import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  effect, inject, input, viewChild,
} from '@angular/core';
import { Chart } from 'chart.js';
import { PALETTE, ensureChartsRegistered, glowPlugin, withAlpha } from './chart-core';

/**
 * Línea de tendencia tipo sparkline con relleno degradado.
 * <p>
 * Sin ejes ni grid por defecto (estilo sparkline del dashboard). Activa
 * {@code showAxis} para un mini-eje X con etiquetas.
 */
@Component({
  selector: 'app-trend-line',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="w-full" [style.height.px]="size()"><canvas #canvas></canvas></div>`,
})
export class TrendLine {
  readonly data = input.required<number[]>();
  readonly labels = input<string[]>([]);
  readonly color = input<string>(PALETTE.cyan);
  readonly size = input(48);
  readonly showAxis = input(false);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    ensureChartsRegistered();
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    effect(() => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      const values = this.data();
      const color = this.color();
      const labels = this.labels().length ? this.labels() : values.map(() => '');
      const showAxis = this.showAxis();

      const ctx = el.getContext('2d');
      let fill: string | CanvasGradient = withAlpha(color, 0.15);
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, this.size());
        g.addColorStop(0, withAlpha(color, 0.35));
        g.addColorStop(1, withAlpha(color, 0));
        fill = g;
      }

      if (this.chart) {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[0].borderColor = color;
        this.chart.data.datasets[0].backgroundColor = fill;
        this.chart.update();
        return;
      }

      // Resalta el último punto (valor más reciente) con un punto más grande,
      // como acento visual del "estado actual" de la tendencia.
      const pointRadii = values.map((_, i) =>
        i === values.length - 1 ? 5 : (showAxis ? 2 : 0));

      this.chart = new Chart(el, {
        type: 'line',
        plugins: [glowPlugin(withAlpha(color, 0.6), 8)],
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: color,
            backgroundColor: fill,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: pointRadii,
            pointHoverRadius: 5,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: showAxis } },
          scales: {
            x: { display: showAxis, grid: { display: false }, border: { display: false },
                 ticks: { font: { size: 10 }, color: 'rgba(255,255,255,0.4)' } },
            y: { display: false, beginAtZero: true },
          },
        },
      });
    });
  }
}
