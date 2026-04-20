export type Meridiem = 'AM' | 'PM';

export interface TimeParts12 {
  hour12: string;
  minute: string;
  meridiem: Meridiem;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function format24HourTo12Hour(value: string | null | undefined): string {
  if (!value) return '—';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value;

  const rawHour = Number(match[1]);
  const minute = match[2];
  if (Number.isNaN(rawHour) || rawHour < 0 || rawHour > 23) return value;

  const meridiem: Meridiem = rawHour >= 12 ? 'PM' : 'AM';
  const normalizedHour = rawHour % 12 || 12;
  return `${normalizedHour}:${minute} ${meridiem}`;
}

export function getTimeParts12(value: string | null | undefined, fallback = '08:00'): TimeParts12 {
  const source = value?.trim() ? value : fallback;
  const match = source.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return { hour12: '8', minute: '00', meridiem: 'AM' };
  }

  const rawHour = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minute = pad(Math.min(59, Math.max(0, Number(match[2]) || 0)));
  const meridiem: Meridiem = rawHour >= 12 ? 'PM' : 'AM';
  const normalizedHour = rawHour % 12 || 12;

  return {
    hour12: normalizedHour.toString(),
    minute,
    meridiem,
  };
}

export function to24HourString(hour12: string, minute: string, meridiem: Meridiem): string {
  const parsedHour = Math.min(12, Math.max(1, Number(hour12) || 12));
  const parsedMinute = Math.min(59, Math.max(0, Number(minute) || 0));

  let hour24 = parsedHour % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  return `${pad(hour24)}:${pad(parsedMinute)}`;
}

export function parseFlexibleTimeTo24Hour(value: string): string | null {
  const raw = (value ?? '').trim().toUpperCase();
  if (!raw) return null;

  const meridiemMatch = raw.match(/\b(AM|PM)\b/);
  const digitsOnly = raw.replace(/[^0-9:]/g, '');
  if (!digitsOnly) return null;

  let hours = 0;
  let minutes = 0;

  if (digitsOnly.includes(':')) {
    const [rawHours, rawMinutes] = digitsOnly.split(':');
    hours = Number(rawHours) || 0;
    minutes = Number(rawMinutes) || 0;
  } else if (digitsOnly.length <= 2) {
    hours = Number(digitsOnly) || 0;
  } else {
    hours = Number(digitsOnly.slice(0, -2)) || 0;
    minutes = Number(digitsOnly.slice(-2)) || 0;
  }

  minutes = Math.min(59, Math.max(0, minutes));

  if (meridiemMatch) {
    const baseHour = Math.min(12, Math.max(1, hours || 12));
    return to24HourString(baseHour.toString(), pad(minutes), meridiemMatch[1] as Meridiem);
  }

  hours = Math.min(23, Math.max(0, hours));
  return `${pad(hours)}:${pad(minutes)}`;
}
