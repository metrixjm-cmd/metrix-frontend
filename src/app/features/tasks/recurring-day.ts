const ZONE = 'America/Mexico_City';

const WEEKDAY: Record<string, string> = {
  Sun: 'DOM',
  Mon: 'LUN',
  Tue: 'MAR',
  Wed: 'MIE',
  Thu: 'JUE',
  Fri: 'VIE',
  Sat: 'SAB',
};

/** Día operativo de hoy: código LUN–DOM y etiqueta larga. */
export function operationalToday(now = new Date()): { code: string; label: string } {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' }).format(now);
  const code = WEEKDAY[short.slice(0, 3)] ?? 'LUN';
  const label = new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(now);
  return { code, label };
}

export function formatCycleDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 18)));
}

export function cycleStatusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Realizada';
  if (status === 'FAILED') return 'Fallida';
  return 'No se realizó';
}

/** El chip de asignación que corresponde al día operativo de hoy. */
export function isOperationalDay(day: string, todayCode: string): boolean {
  return day.trim().toUpperCase() === todayCode.trim().toUpperCase();
}

/**
 * Un paso sin marcar solo está mal si el día ya se cerró como fallido.
 * Pendiente o en curso sigue abierto: se muestra Pendiente.
 */
export function stepStillOpen(status: string, completed: boolean): boolean {
  return !completed && status !== 'FAILED';
}

export type ProcessMark = 'completado' | 'pendiente' | 'no-completado';

export function processMark(status: string, completed: boolean): ProcessMark {
  if (completed) return 'completado';
  if (stepStillOpen(status, completed)) return 'pendiente';
  return 'no-completado';
}
