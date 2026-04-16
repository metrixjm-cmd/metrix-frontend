import { Component, computed, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DayTimeValue {
  days: string[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface DayOption {
  value: string;
  label: string;
  short: string;
}

const DAYS: DayOption[] = [
  { value: 'LUN', label: 'Lunes',     short: 'L'  },
  { value: 'MAR', label: 'Martes',    short: 'M'  },
  { value: 'MIE', label: 'Miércoles', short: 'Mi' },
  { value: 'JUE', label: 'Jueves',    short: 'J'  },
  { value: 'VIE', label: 'Viernes',   short: 'V'  },
  { value: 'SAB', label: 'Sábado',    short: 'S'  },
  { value: 'DOM', label: 'Domingo',   short: 'D'  },
];

interface TimePreset {
  label: string;
  startH: number;
  endH: number;
}

const PRESETS: TimePreset[] = [
  { label: 'Mañana 9–12',  startH:  9, endH: 12 },
  { label: 'Tarde 14–18',  startH: 14, endH: 18 },
  { label: 'Jornada 9–18', startH:  9, endH: 18 },
];

/** Minutes between each step when using ▲▼ buttons */
const STEP_MIN = 30;

/** Timeline range for the visual bar */
const BAR_START_H = 6;
const BAR_END_H   = 22;

@Component({
  selector: 'app-day-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './day-time-picker.html',
})
export class DayTimePicker {
  showDays    = input(true);
  showEndTime = input(true);
  label       = input('');

  selectedDays = model<string[]>([]);
  startHour    = model(8);
  startMinute  = model(0);
  endHour      = model(17);
  endMinute    = model(0);

  valueChange = output<DayTimeValue>();

  readonly days    = DAYS;
  readonly presets = PRESETS;

  // ── Raw input buffers (while user types) ──────────────────────────────
  startInputRaw = signal('08:00');
  endInputRaw   = signal('17:00');
  focusedField  = signal<'start' | 'end' | null>(null);
  activePreset  = signal<string | null>(null);

  // ── Computed signals ─────────────────────────────────────────────────
  readonly startTimeFormatted = computed(() =>
    `${this.pad(this.startHour())}:${this.pad(this.startMinute())}`
  );
  readonly endTimeFormatted = computed(() =>
    `${this.pad(this.endHour())}:${this.pad(this.endMinute())}`
  );

  readonly timeError = computed(() => {
    if (!this.showEndTime()) return null;
    const s = this.startHour() * 60 + this.startMinute();
    const e = this.endHour()   * 60 + this.endMinute();
    return e <= s ? 'La hora de fin debe ser posterior al inicio' : null;
  });

  readonly daysError = computed(() => {
    if (!this.showDays()) return null;
    return this.selectedDays().length === 0 ? 'Selecciona al menos un día' : null;
  });

  readonly durationLabel = computed(() => {
    const diff = (this.endHour() * 60 + this.endMinute()) -
                 (this.startHour() * 60 + this.startMinute());
    if (diff <= 0) return '—';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `${h} hs` : `${h}h ${m}m`;
  });

  /** Left offset % for range bar fill */
  readonly barLeft = computed(() => {
    const rangeMin = (BAR_END_H - BAR_START_H) * 60;
    const offset   = this.startHour() * 60 + this.startMinute() - BAR_START_H * 60;
    return Math.max(0, Math.min(100, (offset / rangeMin) * 100));
  });

  /** Width % for range bar fill */
  readonly barWidth = computed(() => {
    const rangeMin = (BAR_END_H - BAR_START_H) * 60;
    const diff     = (this.endHour() * 60 + this.endMinute()) -
                     (this.startHour() * 60 + this.startMinute());
    return Math.max(0, Math.min(100 - this.barLeft(), (diff / rangeMin) * 100));
  });

  // ── Day interactions ─────────────────────────────────────────────────
  isDaySelected(day: string): boolean {
    return this.selectedDays().includes(day);
  }

  toggleDay(day: string): void {
    const current = this.selectedDays();
    this.selectedDays.set(
      current.includes(day) ? current.filter(d => d !== day) : [...current, day],
    );
    this.emitChange();
  }

  // ── Preset selection ─────────────────────────────────────────────────
  applyPreset(preset: TimePreset): void {
    this.startHour.set(preset.startH);
    this.startMinute.set(0);
    this.endHour.set(preset.endH);
    this.endMinute.set(0);
    this.activePreset.set(preset.label);
    this.syncInputs();
    this.emitChange();
  }

  isPresetActive(preset: TimePreset): boolean {
    return this.activePreset() === preset.label;
  }

  // ── Stepper buttons ▲▼ ───────────────────────────────────────────────
  step(field: 'start' | 'end', dir: 1 | -1): void {
    const current = field === 'start'
      ? this.startHour() * 60 + this.startMinute()
      : this.endHour()   * 60 + this.endMinute();

    let next = current + dir * STEP_MIN;
    next = ((next % (24 * 60)) + 24 * 60) % (24 * 60); // wrap-around

    const h = Math.floor(next / 60);
    const m = next % 60;

    if (field === 'start') { this.startHour.set(h); this.startMinute.set(m); }
    else                   { this.endHour.set(h);   this.endMinute.set(m);   }

    this.activePreset.set(null);
    this.syncInputs();
    this.emitChange();
  }

  // ── Direct text input ─────────────────────────────────────────────────
  onInputChange(field: 'start' | 'end', val: string): void {
    if (field === 'start') this.startInputRaw.set(val);
    else                   this.endInputRaw.set(val);
    this.activePreset.set(null);
  }

  commitInput(field: 'start' | 'end'): void {
    this.focusedField.set(null);
    const raw = field === 'start' ? this.startInputRaw() : this.endInputRaw();
    const minutes = this.parseLoose(raw);
    if (minutes === null) { this.syncInputs(); return; }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (field === 'start') { this.startHour.set(h); this.startMinute.set(m); }
    else                   { this.endHour.set(h);   this.endMinute.set(m);   }
    this.syncInputs();
    this.emitChange();
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private syncInputs(): void {
    this.startInputRaw.set(`${this.pad(this.startHour())}:${this.pad(this.startMinute())}`);
    this.endInputRaw.set(`${this.pad(this.endHour())}:${this.pad(this.endMinute())}`);
  }

  private parseLoose(raw: string): number | null {
    const clean = (raw ?? '').replace(/[^0-9:]/g, '');
    if (!clean) return null;
    if (clean.includes(':')) {
      const [hStr, mStr] = clean.split(':');
      const h = Math.min(23, Math.max(0, Number(hStr) || 0));
      const m = Math.min(59, Math.max(0, Number(mStr) || 0));
      return h * 60 + m;
    }
    if (clean.length <= 2) return Math.min(23, Number(clean)) * 60;
    const h = Number(clean.slice(0, -2));
    const m = Number(clean.slice(-2));
    return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
  }

  private emitChange(): void {
    this.valueChange.emit({
      days:        this.selectedDays(),
      startHour:   this.startHour(),
      startMinute: this.startMinute(),
      endHour:     this.endHour(),
      endMinute:   this.endMinute(),
    });
  }
}
