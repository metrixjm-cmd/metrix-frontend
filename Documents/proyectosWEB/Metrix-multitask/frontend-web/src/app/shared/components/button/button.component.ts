import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize     = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="computedClasses"
    >
      @if (loading()) {
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variant   = input<ButtonVariant>('primary');
  size      = input<ButtonSize>('md');
  type      = input<'button' | 'submit' | 'reset'>('button');
  loading   = input(false);
  disabled  = input(false);
  fullWidth = input(false);

  get computedClasses(): string {
    const base = [
      'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
      'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ];

    const variants: Record<ButtonVariant, string> = {
      primary:   'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white focus:ring-brand-500 shadow-sm',
      secondary: 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 focus:ring-stone-400 shadow-sm',
      danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm',
      ghost:     'bg-transparent hover:bg-stone-100 text-stone-600 hover:text-stone-900 focus:ring-stone-400',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-sm',
    };

    return [
      ...base,
      variants[this.variant()],
      sizes[this.size()],
      this.fullWidth() ? 'w-full' : '',
    ].filter(Boolean).join(' ');
  }
}
