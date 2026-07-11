import { computed, inject, Injectable, NgZone, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationEvent } from './notification.models';

interface NotificationResponse extends NotificationEvent {
  read: boolean;
}

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
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  /** Usuario (sub del JWT) de la última conexión — para aislar inboxes entre sesiones. */
  private lastUser: string | null = null;

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

    // Si el token pertenece a OTRO usuario (logout + login en el mismo navegador),
    // vaciar el inbox: las alertas del usuario anterior no deben filtrarse al nuevo.
    const user = this.extractSubject(token);
    if (user !== this.lastUser) {
      this._notifications.set([]);
      this.lastUser = user;
    }

    // Historial persistido: cubre notificaciones enviadas mientras el usuario
    // no tenía el stream SSE conectado (antes se perdían para siempre).
    void this.loadRecent();

    // Evita que Angular Service Worker intercepte SSE (rompe streams en producción)
    const url = `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}&ngsw-bypass=true`;

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

  // ── Historial persistido ──────────────────────────────────────────────────

  /**
   * Trae las últimas notificaciones persistidas del backend y las fusiona
   * con las que ya están en memoria (recibidas en vivo por SSE), sin
   * duplicar por id. El backend gana en caso de conflicto (estado `read`
   * autoritativo).
   */
  async loadRecent(): Promise<void> {
    try {
      const list = await firstValueFrom(this.http.get<NotificationResponse[]>(this.apiUrl));
      const mapped: AppNotification[] = list.map(raw => ({
        ...raw,
        timeAgo: this.toTimeAgo(raw.timestamp),
      }));
      this._notifications.update(current => {
        const byId = new Map(mapped.map(n => [n.id, n]));
        for (const n of current) {
          if (!byId.has(n.id)) byId.set(n.id, n);
        }
        return [...byId.values()]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
      });
    } catch {
      // El stream SSE sigue funcionando aunque falle la carga del historial.
    }
  }

  // ── Estado de lectura ─────────────────────────────────────────────────────

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    firstValueFrom(this.http.post<void>(`${this.apiUrl}/read-all`, {})).catch(() => {});
  }

  markRead(id: string): void {
    if (!id.startsWith('local-')) {
      firstValueFrom(this.http.post<void>(`${this.apiUrl}/${id}/read`, {})).catch(() => {});
    }
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n),
    );
  }

  /** Inserta una notificación local (cliente) al inbox de alertas. */
  pushLocal(input: {
    title: string;
    body: string;
    severity?: AppNotification['severity'];
    type?: AppNotification['type'];
    storeId?: string;
  }): void {
    const timestamp = new Date().toISOString();
    const notification: AppNotification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: input.type ?? 'TASK_DEADLINE_WARNING',
      severity: input.severity ?? 'warning',
      title: input.title,
      body: input.body,
      taskId: null,
      incidentId: null,
      examId: null,
      storeId: input.storeId ?? '',
      timestamp,
      read: false,
      timeAgo: 'Ahora mismo',
    };
    this._notifications.update(list => [notification, ...list].slice(0, 50));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Extrae el `sub` (numeroUsuario) del payload del JWT sin validar la firma. */
  private extractSubject(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof decoded.sub === 'string' ? decoded.sub : null;
    } catch {
      return null;
    }
  }

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
