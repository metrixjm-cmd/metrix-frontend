import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService }  from '../../features/auth/services/auth.service';
import { NotificationService } from '../../features/notifications/notification.service';
import { AppNotification } from '../../features/notifications/notification.models';
import { SettingsService } from '../../features/settings/services/settings.service';
import { ThemeService } from '../theme.service';

export interface NavItem {
  label:    string;
  route:    string;
  exact:    boolean;
  iconPath: string;
  badge?:   number;
  /** Roles que pueden ver este item. undefined = todos */
  roles?:   string[];
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
  private readonly settingsSvc = inject(SettingsService);
  // Inyectar ThemeService aplica el tema guardado en localStorage al iniciar la app
  private readonly _theme = inject(ThemeService);

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

  /** Catálogo completo de nav items con filtro por rol */
  private readonly allNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      exact: true,
      iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      label: 'Métricas',
      route: '/kpi',
      exact: false,
      roles: ['ADMIN', 'GERENTE'],
      iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      label: 'Tareas',
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
      label: 'Ver Reportes',
      route: '/reports',
      exact: false,
      roles: ['ADMIN', 'GERENTE'],
      iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Banco de Datos',
      route: '/banco-info',
      exact: false,
      roles: ['ADMIN', 'GERENTE'],
      iconPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
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
      label: 'Exámenes',
      route: '/trainer',
      exact: false,
      iconPath: 'M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5zm0-7l-9 5 9 5 9-5-9-5z',
    },
    {
      label: 'Ayuda',
      route: '/help',
      exact: false,
      iconPath: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  /** Nav items filtrados por el rol del usuario actual */
  readonly navItems = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return this.allNavItems.filter(item => {
      if (!item.roles) return true;                       // sin restricción → todos ven
      return item.roles.some(r => roles.includes(r));     // al menos un rol coincide
    });
  });

  readonly notifications = this.notifSvc.notifications;
  readonly unreadCount   = this.notifSvc.unreadCount;

  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.nombre ?? '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  });

  readonly isAdminUser = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  });

  readonly profileStoreLabel = computed(() => {
    if (this.isAdminUser()) return 'TODAS';
    return this.auth.currentUser()?.storeId ?? '—';
  });

  readonly profileShiftLabel = computed(() => {
    if (this.isAdminUser()) return 'TODOS';
    return this.auth.currentUser()?.turno ?? '—';
  });

  readonly profileStoreDisplay = computed(() => {
    if (this.isAdminUser()) return 'TODAS';
    const user = this.auth.currentUser();
    if (!user?.storeId) return '-';
    if (user.storeName?.trim()) return user.storeName;
    const store = this.settingsSvc.stores().find(s => s.id === user.storeId);
    return store?.nombre ?? store?.codigo ?? user.storeId;
  });

  readonly profileShiftDisplay = computed(() => {
    if (this.isAdminUser()) return 'TODOS';
    const shift = this.auth.currentUser()?.turno?.trim();
    return shift || '-';
  });

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (token) this.notifSvc.connect(token);
    if (this.settingsSvc.stores().length === 0) this.settingsSvc.loadAll();

    // Tema automático por rol
    const roles = this.auth.currentUser()?.roles ?? [];
    if (roles.includes('ADMIN'))         this._theme.set('blue');
    else if (roles.includes('GERENTE'))  this._theme.set('red');
    else                                 this._theme.set('orange');
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
    if (severity === 'warning')  return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  }
}
