import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe de formato de fechas para METRIX.
 *
 * Modos:
 *  {{ value | appDate }}          → "15 mar 2026, 14:30"
 *  {{ value | appDate:'date' }}   → "15 de marzo de 2026"
 *  {{ value | appDate:'time' }}   → "14:30"
 *  {{ value | appDate:'relative'}}→ "Hace 2 días", "Ayer a las 14:30", "Hace un momento"
 *  {{ value | appDate:'due' }}    → "Vence hoy a las 14:30", "Venció hace 3 días", "Vence el 20 abr"
 */
@Pipe({ name: 'appDate', standalone: true, pure: true })
export class AppDatePipe implements PipeTransform {

  transform(value: string | null | undefined, mode: 'default' | 'date' | 'time' | 'relative' | 'due' = 'default'): string {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';

    switch (mode) {
      case 'date':     return this.formatDate(date);
      case 'time':     return this.formatTime(date);
      case 'relative': return this.relative(date);
      case 'due':      return this.due(date);
      default:         return this.formatDateTime(date);
    }
  }

  // ── Formato absoluto ───────────────────────────────────────────────────────

  private formatDateTime(d: Date): string {
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  private formatTime(d: Date): string {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  private formatShort(d: Date): string {
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Fecha relativa (pasado) ────────────────────────────────────────────────

  private relative(d: Date): string {
    const now      = Date.now();
    const diffMs   = now - d.getTime();
    const diffMin  = Math.floor(diffMs / 60_000);
    const diffHrs  = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMs < 0)              return this.formatDateTime(d);         // futuro → absoluto
    if (diffMin < 1)             return 'Hace un momento';
    if (diffMin < 60)            return `Hace ${diffMin} min`;
    if (diffHrs < 24)            return `Hace ${diffHrs} h`;
    if (diffDays === 1)          return `Ayer a las ${this.formatTime(d)}`;
    if (diffDays < 7)            return `Hace ${diffDays} días`;
    return this.formatDateTime(d);
  }

  // ── Fecha límite (pasado = vencida, futuro = próxima) ─────────────────────

  private due(d: Date): string {
    const now      = Date.now();
    const diffMs   = d.getTime() - now;
    const diffMin  = Math.floor(Math.abs(diffMs) / 60_000);
    const diffHrs  = Math.floor(Math.abs(diffMs) / 3_600_000);
    const diffDays = Math.floor(Math.abs(diffMs) / 86_400_000);

    if (diffMs < 0) {
      // Pasado — vencida
      if (diffMin < 60)  return `Venció hace ${diffMin} min`;
      if (diffHrs < 24)  return `Venció hace ${diffHrs} h`;
      if (diffDays === 1) return `Venció ayer`;
      if (diffDays < 7)  return `Venció hace ${diffDays} días`;
      return `Venció el ${this.formatShort(d)}`;
    } else {
      // Futuro — próxima
      if (diffMin < 60)  return `Vence en ${diffMin} min`;
      if (diffHrs < 24)  return `Vence hoy a las ${this.formatTime(d)}`;
      if (diffDays === 1) return `Vence mañana a las ${this.formatTime(d)}`;
      if (diffDays < 7)  return `Vence en ${diffDays} días`;
      return `Vence el ${this.formatShort(d)}`;
    }
  }
}
