import { computed, inject, Injectable, NgZone, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationEvent } from './notification.models';

/**
 * Servicio de notificaciones en tiempo real vía SSE (Sprint 6).
 *
 * - Abre una conexión EventSource al backend con el JWT como query param
 *   (limitación del browser: EventSource no soporta headers personalizados).
 * - Almacena notificaciones en un Signal para integración reactiva con Angular.
 * - Usa NgZone para garantizar que las actualizaciones de signals desde callbacks
 *   nativos del browser (fuera de la zona Angular) disparen change detection.
 * - Reconexión automática cada 5 segundos si la conexión se pierde.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly zone = inject(NgZone);

  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;

  // ── Estado reactivo ───────────────────────────────────────────────────────

  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _connected     = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly connected     = this._connected.asReadonly();

  /** Número de notificaciones no leídas. */
  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length,
  );

  // ── Conexión SSE ─────────────────────────────────────────────────────────

  /**
   * Abre la conexión SSE al backend con el token JWT del usuario actual.
   * Llama a `disconnect()` primero si ya había una conexión activa.
   *
   * @param token JWT del usuario autenticado (se obtiene de AuthService.getToken())
   */
  connect(token: string): void {
    this.disconnect();
    this.currentToken = token;

    const url = `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    // EventSource se ejecuta fuera de la zona Angular → usamos zone.run() para signals
    this.zone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('connected', () => {
        this.zone.run(() => this._connected.set(true));
      });

      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        this.zone.run(() => {
          const raw = JSON.parse(event.data) as NotificationEvent;
          const notification: AppNotification = {
            ...raw,
            read:    false,
            timeAgo: this.toTimeAgo(raw.timestamp),
          };
          // Agrega al inicio, máximo 50 notificaciones en memoria
          this._notifications.update(list => [notification, ...list].slice(0, 50));
        });
      });

      this.eventSource.onerror = () => {
        this.zone.run(() => this._connected.set(false));
        this.scheduleReconnect();
      };
    });
  }

  /** Cierra la conexión SSE activa y cancela reconexiones pendientes. */
  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this._connected.set(false);
  }

  // ── Estado de lectura ─────────────────────────────────────────────────────

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || !this.currentToken) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Solo reconectar si EventSource está cerrado o no existe
      if (this.currentToken && (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED)) {
        this.connect(this.currentToken);
      }
    }, 15_000); // 15s entre reconexiones para evitar loops
  }

  private toTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1)  return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)   return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} d`;
  }
}
