import { Component, computed, input, model, output, signal, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';

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

@Component({
  selector: 'app-day-time-picker',
  standalone: true,
  templateUrl: './day-time-picker.html',
  styles: [`
    .wheel-col {
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-snap-type: y mandatory;
    }
    .wheel-col::-webkit-scrollbar { display: none; }
    .wheel-item {
      scroll-snap-align: center;
    }
  `],
})
export class DayTimePicker implements AfterViewInit {
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
  readonly hourValues   = Array.from({ length: 24 }, (_, i) => i);
  readonly minuteValues = [0, 30];

  /** Item height in the wheel (px) */
  readonly ITEM_H = 36;
  /** Visible items for hours wheel */
  readonly VISIBLE = 5;
  /** Visible items for minutes wheel (fewer values) */
  readonly MIN_VISIBLE = 3;

  readonly timeError = computed(() => {
    if (!this.showEndTime()) return null;
    const s = this.startHour() * 60 + this.startMinute();
    const e = this.endHour() * 60 + this.endMinute();
    return e <= s ? 'Hora fin debe ser mayor a inicio' : null;
  });

  readonly daysError = computed(() => {
    if (!this.showDays()) return null;
    return this.selectedDays().length === 0 ? 'Selecciona al menos un día' : null;
  });

  readonly startTimeFormatted = computed(() => `${this.pad(this.startHour())}:${this.pad(this.startMinute())}`);
  readonly endTimeFormatted   = computed(() => `${this.pad(this.endHour())}:${this.pad(this.endMinute())}`);

  @ViewChildren('wheelCol') wheelCols!: QueryList<ElementRef<HTMLDivElement>>;

  private initialScrollDone = false;

  ngAfterViewInit(): void {
    // Scroll to initial values after render
    setTimeout(() => {
      this.scrollToValue('sh', this.startHour());
      this.scrollToValue('sm', this.startMinute());
      this.scrollToValue('eh', this.endHour());
      this.scrollToValue('em', this.endMinute());
      this.initialScrollDone = true;
    }, 50);
  }

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

  /** Called on scroll event from a wheel column */
  onScroll(field: 'sh' | 'sm' | 'eh' | 'em', event: Event): void {
    if (!this.initialScrollDone) return;
    const el = event.target as HTMLDivElement;
    const index = Math.round(el.scrollTop / this.ITEM_H);
    const values = (field === 'sm' || field === 'em') ? this.minuteValues : this.hourValues;
    const clamped = Math.min(index, values.length - 1);
    this.applyValue(field, values[clamped]);
  }

  /** Mouse wheel event for scrolling with mouse */
  onMouseWheel(field: 'sh' | 'sm' | 'eh' | 'em', event: WheelEvent): void {
    event.preventDefault();
    const el = this.getWheelElement(field);
    if (!el) return;
    el.scrollBy({ top: event.deltaY > 0 ? this.ITEM_H : -this.ITEM_H, behavior: 'smooth' });
  }

  /** Click on a specific value in the wheel */
  selectValue(field: 'sh' | 'sm' | 'eh' | 'em', value: number): void {
    this.applyValue(field, value);
    this.scrollToValue(field, value);
  }

  /** Get index for minute value in the minuteValues array */
  minuteIndex(value: number): number {
    return this.minuteValues.indexOf(value);
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  get hourWheelHeight(): string { return `${this.ITEM_H * this.VISIBLE}px`; }
  get minWheelHeight(): string  { return `${this.ITEM_H * this.MIN_VISIBLE}px`; }
  get hourPadding(): number     { return Math.floor(this.VISIBLE / 2); }
  get minPadding(): number      { return Math.floor(this.MIN_VISIBLE / 2); }

  private applyValue(field: 'sh' | 'sm' | 'eh' | 'em', value: number): void {
    switch (field) {
      case 'sh': this.startHour.set(value); break;
      case 'sm': this.startMinute.set(value); break;
      case 'eh': this.endHour.set(value); break;
      case 'em': this.endMinute.set(value); break;
    }
    this.emitChange();
  }

  private scrollToValue(field: string, value: number): void {
    const el = this.getWheelElement(field);
    if (!el) return;
    const isMinute = field === 'sm' || field === 'em';
    const index = isMinute ? this.minuteValues.indexOf(value) : value;
    el.scrollTo({ top: Math.max(0, index) * this.ITEM_H, behavior: 'smooth' });
  }

  private getWheelElement(field: string): HTMLDivElement | null {
    if (!this.wheelCols) return null;
    const arr = this.wheelCols.toArray();
    const map: Record<string, number> = { sh: 0, sm: 1, eh: 2, em: 3 };
    const idx = map[field];
    return idx !== undefined && arr[idx] ? arr[idx].nativeElement : null;
  }

  private emitChange(): void {
    this.valueChange.emit({
      days: this.selectedDays(),
      startHour: this.startHour(),
      startMinute: this.startMinute(),
      endHour: this.endHour(),
      endMinute: this.endMinute(),
    });
  }
}
