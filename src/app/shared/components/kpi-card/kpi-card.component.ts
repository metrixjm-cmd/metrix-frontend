import { Component, input } from '@angular/core';

export type KpiTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="bg-white border border-stone-200 rounded-xl p-5 shadow-card hover:shadow-card-md transition-shadow">
      <div class="flex items-start justify-between mb-3">
        <p class="text-stone-500 text-xs font-semibold uppercase tracking-wide">{{ title() }}</p>
        <span [class]="trendBadgeClass">
          @if (trend() === 'up') {
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          } @else if (trend() === 'down') {
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          } @else {
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          }
        </span>
      </div>

      <p class="text-2xl font-bold text-stone-900 tracking-tight mb-0.5">{{ value() }}</p>

      @if (subtitle()) {
        <p class="text-stone-400 text-xs">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class KpiCardComponent {
  title    = input('');
  value    = input('—');
  subtitle = input('');
  trend    = input<KpiTrend>('neutral');

  get trendBadgeClass(): string {
    const base = 'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold';
    const map: Record<KpiTrend, string> = {
      up:      `${base} bg-emerald-100 text-emerald-700`,
      down:    `${base} bg-red-100 text-red-700`,
      neutral: `${base} bg-stone-100 text-stone-500`,
    };
    return map[this.trend()];
  }
}
