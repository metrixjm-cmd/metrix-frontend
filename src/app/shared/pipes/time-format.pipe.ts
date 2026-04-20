import { Pipe, PipeTransform } from '@angular/core';

import { format24HourTo12Hour } from '../utils/time-format.util';

@Pipe({ name: 'timeFormat', standalone: true, pure: true })
export class TimeFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return format24HourTo12Hour(value);
  }
}
