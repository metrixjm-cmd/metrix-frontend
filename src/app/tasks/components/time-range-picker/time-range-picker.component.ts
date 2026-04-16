import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TimeRange {
  start: string;  // "HH:MM"
  end:   string;  // "HH:MM"
}

interface Preset {
  label: string;
  startH: number;
  endH: number;
}

@Component({
  selector: 'app-time-range-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="trp-wrap">

  <!-- Presets -->
  <div class="trp-presets">
    <button
      *ngFor="let p of presets"
      class="trp-preset"
      [class.active]="activePreset === p.label"
      type="button"
      (click)="applyPreset(p)">
      {{ p.label }}
    </button>
  </div>

  <!-- Inputs row -->
  <div class="trp-inputs">

    <!-- INICIO -->
    <div class="trp-field">
      <span class="trp-field-label">Inicio</span>
      <div class="trp-box" [class.focused]="focusedField === 'start'">
        <div class="trp-steppers">
          <button type="button" class="trp-step" (click)="step('start', 1)"  aria-label="Aumentar hora inicio">▲</button>
          <button type="button" class="trp-step" (click)="step('start', -1)" aria-label="Disminuir hora inicio">▼</button>
        </div>
        <div class="trp-input-wrap">
          <input
            class="trp-input"
            type="text"
            [ngModel]="startDisplay"
            (ngModelChange)="onInputChange('start', $event)"
            (focus)="focusedField = 'start'"
            (blur)="focusedField = null; commitInput('start')"
            maxlength="5"
            placeholder="HH:MM"
            aria-label="Hora de inicio"
            inputmode="numeric" />
          <span class="trp-unit">hrs</span>
        </div>
      </div>
    </div>

    <!-- Arrow -->
    <div class="trp-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
      <span class="trp-duration">{{ durationLabel }}</span>
    </div>

    <!-- FIN -->
    <div class="trp-field">
      <span class="trp-field-label">Fin</span>
      <div class="trp-box" [class.focused]="focusedField === 'end'">
        <div class="trp-steppers">
          <button type="button" class="trp-step" (click)="step('end', 1)"  aria-label="Aumentar hora fin">▲</button>
          <button type="button" class="trp-step" (click)="step('end', -1)" aria-label="Disminuir hora fin">▼</button>
        </div>
        <div class="trp-input-wrap">
          <input
            class="trp-input"
            type="text"
            [ngModel]="endDisplay"
            (ngModelChange)="onInputChange('end', $event)"
            (focus)="focusedField = 'end'"
            (blur)="focusedField = null; commitInput('end')"
            maxlength="5"
            placeholder="HH:MM"
            aria-label="Hora de fin"
            inputmode="numeric" />
          <span class="trp-unit">hrs</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Visual bar -->
  <div class="trp-bar-wrap">
    <div class="trp-bar-track">
      <div class="trp-bar-fill" [style.left.%]="barLeft" [style.width.%]="barWidth"></div>
    </div>
    <div class="trp-bar-ticks">
      <span *ngFor="let t of barTicks">{{ t }}</span>
    </div>
  </div>

  <!-- Summary -->
  <div class="trp-summary" [class.error]="hasError">
    <span class="trp-summary-text">
      <ng-container *ngIf="!hasError">
        {{ startDisplay }} → {{ endDisplay }}
      </ng-container>
      <ng-container *ngIf="hasError">
        La hora de fin debe ser posterior al inicio
      </ng-container>
    </span>
    <span class="trp-summary-badge" *ngIf="!hasError">{{ durationLabel }}</span>
  </div>

</div>
  `,
  styles: [`
    .trp-wrap { display: flex; flex-direction: column; gap: 12px; }

    /* Presets */
    .trp-presets {
      display: flex; gap: 6px; flex-wrap: wrap;
    }
    .trp-preset {
      padding: 6px 12px; border-radius: 20px;
      border: 1.5px solid #e2e8f0; background: white;
      font-size: 12px; font-weight: 600; color: #64748b;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .trp-preset:hover,
    .trp-preset.active {
      border-color: #22c55e; background: #dcfce7; color: #16a34a;
    }

    /* Inputs */
    .trp-inputs {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0; align-items: center;
    }

    .trp-field { display: flex; flex-direction: column; gap: 5px; }
    .trp-field-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: #64748b;
    }

    .trp-box {
      display: flex; align-items: center;
      background: #f4f5f7; border: 1.5px solid #e2e8f0;
      border-radius: 12px; overflow: hidden;
      transition: border-color .15s, box-shadow .15s;
    }
    .trp-box.focused {
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34,197,94,.12);
    }

    .trp-steppers { display: flex; flex-direction: column; }
    .trp-step {
      width: 32px; height: 22px;
      border: none; background: transparent;
      cursor: pointer; color: #94a3b8;
      font-size: 9px; display: grid; place-items: center;
      transition: background .1s, color .1s;
    }
    .trp-step:hover { background: #e2e8f0; color: #0f172a; }
    .trp-step:active { background: #dcfce7; color: #16a34a; }

    .trp-input-wrap {
      flex: 1; text-align: center; padding: 0 4px;
    }
    .trp-input {
      width: 100%; border: none; background: transparent;
      font-size: 22px; font-weight: 700; color: #0f172a;
      text-align: center; outline: none;
      font-variant-numeric: tabular-nums;
    }
    .trp-unit {
      display: block; font-size: 10px; font-weight: 600;
      color: #94a3b8; margin-top: -2px;
    }

    .trp-arrow {
      display: flex; flex-direction: column; align-items: center;
      padding: 18px 10px 0; gap: 4px;
    }
    .trp-arrow svg { width: 20px; height: 20px; color: #94a3b8; }
    .trp-duration {
      background: #dcfce7; color: #16a34a;
      font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 20px;
    }

    /* Bar */
    .trp-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
    .trp-bar-track {
      position: relative; height: 6px;
      background: #f1f5f9; border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    .trp-bar-fill {
      position: absolute; height: 100%;
      background: #22c55e; border-radius: 3px;
      transition: left .2s, width .2s;
    }
    .trp-bar-ticks {
      display: flex; justify-content: space-between;
      font-size: 10px; color: #94a3b8;
    }

    /* Summary */
    .trp-summary {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #f4f5f7;
      border-radius: 8px; border: 1px solid #e2e8f0;
    }
    .trp-summary.error { background: #fef2f2; border-color: #fecaca; }
    .trp-summary-text { font-size: 13px; font-weight: 600; color: #0f172a; }
    .trp-summary.error .trp-summary-text { color: #ef4444; font-size: 12px; }
    .trp-summary-badge {
      background: #dcfce7; color: #16a34a;
      font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
    }

    /* Mobile */
    @media (max-width: 480px) {
      .trp-input { font-size: 18px; }
      .trp-arrow { padding-top: 16px; }
    }
  `]
})
export class TimeRangePickerComponent implements OnInit {

  @Input()  value: TimeRange = { start: '10:00', end: '15:00' };
  @Output() valueChange = new EventEmitter<TimeRange>();

  readonly STEP_MINUTES = 30;
  readonly BAR_START    = 6  * 60;   // 06:00
  readonly BAR_END      = 22 * 60;   // 22:00

  readonly presets: Preset[] = [
    { label: 'Mañana 9–12',   startH:  9, endH: 12 },
    { label: 'Tarde 14–18',   startH: 14, endH: 18 },
    { label: 'Jornada 9–18',  startH:  9, endH: 18 },
  ];
  readonly barTicks = ['06:00', '10:00', '14:00', '18:00', '22:00'];

  startDisplay = '10:00';
  endDisplay   = '15:00';
  focusedField: 'start' | 'end' | null = null;
  activePreset: string | null = null;

  // Pending raw input while user is typing
  private pendingStart: string | null = null;
  private pendingEnd:   string | null = null;

  ngOnInit(): void {
    this.startDisplay = this.value.start ?? '10:00';
    this.endDisplay   = this.value.end   ?? '15:00';
  }

  // ── Helpers ──────────────────────────────────
  private toMinutes(hhmm: string): number {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  private toHHMM(minutes: number): string {
    const h = Math.floor(((minutes % (24*60)) + 24*60) % (24*60) / 60);
    const m = ((minutes % 60) + 60) % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  private parseLoose(raw: string): number | null {
    const clean = raw.replace(/[^0-9:]/g, '');
    if (!clean) return null;
    if (clean.includes(':')) {
      const [h, m] = clean.split(':').map(Number);
      return Math.min(23, Math.max(0, h || 0)) * 60 + Math.min(59, Math.max(0, m || 0));
    }
    if (clean.length <= 2) return Math.min(23, Number(clean)) * 60;
    const h = Number(clean.slice(0, -2));
    const m = Number(clean.slice(-2));
    return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
  }

  // ── Computed ──────────────────────────────────
  get hasError(): boolean {
    return this.toMinutes(this.startDisplay) >= this.toMinutes(this.endDisplay);
  }
  get durationLabel(): string {
    let diff = this.toMinutes(this.endDisplay) - this.toMinutes(this.startDisplay);
    if (diff <= 0) return '—';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `${h} hs` : `${h}h ${m}m`;
  }
  get barLeft(): number {
    const sMin = this.toMinutes(this.startDisplay);
    return Math.max(0, Math.min(100, (sMin - this.BAR_START) / (this.BAR_END - this.BAR_START) * 100));
  }
  get barWidth(): number {
    const sMin = this.toMinutes(this.startDisplay);
    const eMin = this.toMinutes(this.endDisplay);
    return Math.max(0, Math.min(100 - this.barLeft, (eMin - sMin) / (this.BAR_END - this.BAR_START) * 100));
  }

  // ── Actions ──────────────────────────────────
  step(field: 'start' | 'end', dir: 1 | -1): void {
    const current = this.toMinutes(field === 'start' ? this.startDisplay : this.endDisplay);
    const next    = this.toHHMM(current + dir * this.STEP_MINUTES);
    if (field === 'start') this.startDisplay = next;
    else                   this.endDisplay   = next;
    this.activePreset = null;
    this.emit();
  }

  applyPreset(p: Preset): void {
    this.startDisplay = this.toHHMM(p.startH * 60);
    this.endDisplay   = this.toHHMM(p.endH   * 60);
    this.activePreset = p.label;
    this.emit();
  }

  onInputChange(field: 'start' | 'end', val: string): void {
    if (field === 'start') this.pendingStart = val;
    else                   this.pendingEnd   = val;
    this.activePreset = null;
  }

  commitInput(field: 'start' | 'end'): void {
    const pending = field === 'start' ? this.pendingStart : this.pendingEnd;
    if (pending !== null) {
      const minutes = this.parseLoose(pending);
      if (minutes !== null) {
        const hhmm = this.toHHMM(minutes);
        if (field === 'start') { this.startDisplay = hhmm; this.pendingStart = null; }
        else                   { this.endDisplay   = hhmm; this.pendingEnd   = null; }
        this.emit();
      }
    }
  }

  private emit(): void {
    this.valueChange.emit({ start: this.startDisplay, end: this.endDisplay });
  }
}
