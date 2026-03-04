import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { NotificationService } from '../../features/notifications/notification.service';
import { AppNotification } from '../../features/notifications/notification.models';

export interface NavItem {
  label:    string;
  route:    string;
  exact:    boolean;
  iconPath: string;
  badge?:   number;
}

// Re-exportado del modelo de notificaciones para uso en la plantilla
export type { AppNotification };

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
})
export class AppLayout implements OnInit, OnDestroy {
  readonly auth      = inject(AuthService);
  readonly notifSvc  = inject(NotificationService);

  // ── Estado sidebar ────────────────────────────────────────────────────
  /** Colapsar sidebar en desktop (solo aplica en lg+) */
  collapsed   = signal(false);
  /** Abrir sidebar como drawer en mobile/tablet (<lg) */
  mobileOpen  = signal(false);

  showNotifs  = signal(false);
  showProfile = signal(false);
  searchQuery = signal('');

  // ── Clase dinámica del sidebar ─────────────────────────────────────────
  /**
   * Calcula las clases de traslación y ancho del aside.
   * - Mobile (<lg): drawer fijo, oculto por defecto; visible cuando mobileOpen = true
   * - Desktop (lg+): siempre visible; ancho 68px / 220px según collapsed
   */
  readonly asideClass = computed(() => {
    const mobileTranslate = this.mobileOpen()
      ? 'translate-x-0'
      : '-translate-x-full lg:translate-x-0';
    const desktopWidth = this.collapsed()
      ? 'lg:w-[68px]'
      : 'lg:w-[220px]';
    return `${mobileTranslate} ${desktopWidth}`;
  });

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      exact: true,
      iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      label: 'Delegación',
      route: '/tasks',
      exact: false,
      iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    },
    {
      label: 'Incidencias',
      route: '/incidents',
      exact: false,
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    },
    {
      label: 'Reportes',
      route: '/reports',
      exact: false,
      iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'RH',
      route: '/rh',
      exact: false,
      iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      label: 'Capacitación',
      route: '/training',
      exact: false,
      iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      label: 'Gamificación',
      route: '/gamification',
      exact: false,
      iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    },
    {
      label: 'Configuración',
      route: '/settings',
      exact: false,
      iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  readonly notifications = this.notifSvc.notifications;
  readonly unreadCount   = this.notifSvc.unreadCount;

  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.nombre ?? '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  });

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (token) this.notifSvc.connect(token);
  }

  ngOnDestroy(): void {
    this.notifSvc.disconnect();
  }

  // ── Sidebar ───────────────────────────────────────────────────────────

  /** Toggle collapse en desktop */
  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  /** Toggle drawer en mobile/tablet */
  toggleMobileSidebar(): void {
    this.mobileOpen.update(v => !v);
  }

  /** Cierra el drawer móvil (llamado desde nav links y backdrop) */
  closeMobileSidebar(): void {
    this.mobileOpen.set(false);
  }

  // ── Dropdowns ─────────────────────────────────────────────────────────

  toggleNotifs(): void {
    this.showNotifs.update(v => !v);
    if (this.showProfile()) this.showProfile.set(false);
  }

  toggleProfile(): void {
    this.showProfile.update(v => !v);
    if (this.showNotifs()) this.showNotifs.set(false);
  }

  markAllRead(): void {
    this.notifSvc.markAllRead();
  }

  closeDropdowns(): void {
    this.showNotifs.set(false);
    this.showProfile.set(false);
  }

  notifIconPath(severity: AppNotification['severity']): string {
    if (severity === 'critical') return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
    if (severity === 'warning')  return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  notifColorClass(severity: AppNotification['severity']): string {
    if (severity === 'critical') return 'text-red-600 bg-red-100';
    if (severity === 'warning')  return 'text-amber-600 bg-amber-100';
    return 'text-blue-600 bg-blue-100';
  }
}
