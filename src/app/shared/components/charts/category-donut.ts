import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  computed, effect, inject, input, viewChild,
} from '@angular/core';
import { Chart } from 'chart.js';
import { ChartDatum, DARK_TOOLTIP, PALETTE, ensureChartsRegistered } from './chart-core';

const FALLBACK = [PALETTE.brand, PALETTE.emerald, PALETTE.amber, PALETTE.red, PALETTE.violet, PALETTE.cyan, PALETTE.slate];

/**
 * Donut categórico con total centrado y leyenda lateral.
 * <p>
 * Para desgloses por estado/categoría (incidencias, capacitaciones). Estilo
 * consistente con los anillos del dashboard: segmentos con separación sutil
 * sobre fondo oscuro y leyenda con puntos de color.
 */
@Component({
  selector: 'app-category-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-4">
      <div class="relative shrink-0" [style.width.px]="size()" [style.height.px]="size()">
        <canvas #canvas></canvas>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span class="text-2xl font-bold text-white leading-none">{{ total() }}</span>
          @if (centerLabel()) {
            <span class="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">{{ centerLabel() }}</span>
          }
        </div>
      </div>
      <ul class="flex-1 min-w-0 space-y-1.5">
        @for (d of resolved(); track d.label) {
          <li class="flex items-center gap-2 text-xs">
            <span class="w-2.5 h-2.5 rounded-sm shrink-0" [style.background]="d.color"></span>
            <span class="text-white/60 truncate flex-1">{{ d.label }}</span>
            <span class="font-semibold text-white/80">{{ d.value }}</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class CategoryDonut {
  readonly data = input.required<ChartDatum[]>();
  readonly centerLabel = input('');
  readonly size = input(120);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  readonly resolved = computed<ChartDatum[]>(() =>
    this.data().map((d, i) => ({ ...d, color: d.color ?? FALLBACK[i % FALLBACK.length] })));
  readonly total = computed(() => this.data().reduce((sum, d) => sum + d.value, 0));

  constructor() {
    ensureChartsRegistered();
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    effect(() => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      const items = this.resolved();
      const values = items.map(d => d.value);
      const colors = items.map(d => d.color!);
      const labels = items.map(d => d.label);

      if (this.chart) {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[0].backgroundColor = colors;
        this.chart.update();
        return;
      }

      this.chart = new Chart(el, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, borderRadius: 3, spacing: 2 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          animation: { animateRotate: true, duration: 600 },
          plugins: { legend: { display: false }, tooltip: { ...DARK_TOOLTIP } },
        },
      });
    });
  }
}
