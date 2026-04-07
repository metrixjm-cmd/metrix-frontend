import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

import { AuthService } from '../features/auth/services/auth.service';
import { CurrentUser, MetrixRole } from '../features/auth/models/auth.models';

export type ThemeId = 'blue' | 'orange' | 'red';

export interface Theme {
  id: ThemeId;
  color: string;
}

type ThemePreferences = Partial<Record<string, ThemeId>>;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly auth = inject(AuthService);

  private readonly USER_STORAGE_KEY = 'metrix-theme-preferences';
  private readonly GUEST_STORAGE_KEY = 'metrix-theme-guest';

  readonly themes: Theme[] = [
    { id: 'blue', color: '#000000' },
    { id: 'red', color: '#280d69' },
    { id: 'orange', color: '#df570c' },
  ];

  readonly current = signal<ThemeId>(this.readGuestTheme());
  private readonly activeUserKey = signal<string | null>(null);
  private hasManualGuestSelection = false;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const userKey = user?.numeroUsuario ?? null;

      if (this.activeUserKey() !== userKey) {
        this.activeUserKey.set(userKey);
        this.current.set(user ? this.resolveThemeForUser(user) : this.readGuestTheme());
      }
    });

    effect(() => {
      const user = this.auth.currentUser();
      const theme = this.current();

      this.document.documentElement.setAttribute('data-theme', theme);

      if (user) {
        this.writeUserTheme(user.numeroUsuario, theme);
      } else {
        this.writeGuestTheme(theme);
      }
    });
  }

  set(id: ThemeId): void {
    if (!this.auth.currentUser()) {
      this.hasManualGuestSelection = true;
      this.writeGuestTheme(id);
    }

    this.current.set(id);
  }

  assignLoginSelectionToUser(numeroUsuario: string): void {
    if (!this.hasManualGuestSelection) return;

    const selectedTheme = this.readGuestTheme();
    this.writeUserTheme(numeroUsuario, selectedTheme);
    this.current.set(selectedTheme);
    this.hasManualGuestSelection = false;
  }

  private resolveThemeForUser(user: CurrentUser): ThemeId {
    if (this.hasManualGuestSelection) {
      const selectedTheme = this.readGuestTheme();
      this.writeUserTheme(user.numeroUsuario, selectedTheme);
      this.hasManualGuestSelection = false;
      return selectedTheme;
    }

    return this.readUserTheme(user.numeroUsuario) ?? this.getThemeForRole(user.roles);
  }

  private getThemeForRole(roles: string[]): ThemeId {
    if (roles.includes('ADMIN' satisfies MetrixRole)) return 'blue';
    if (roles.includes('GERENTE' satisfies MetrixRole)) return 'orange';
    return 'red';
  }

  private readGuestTheme(): ThemeId {
    const stored = localStorage.getItem(this.GUEST_STORAGE_KEY);
    return this.isThemeId(stored) ? stored : 'blue';
  }

  private writeGuestTheme(theme: ThemeId): void {
    localStorage.setItem(this.GUEST_STORAGE_KEY, theme);
  }

  private readUserTheme(numeroUsuario: string): ThemeId | null {
    const preferences = this.readPreferences();
    const stored = preferences[numeroUsuario];
    return this.isThemeId(stored ?? null) ? (stored as ThemeId) : null;
  }

  private writeUserTheme(numeroUsuario: string, theme: ThemeId): void {
    const preferences = this.readPreferences();
    preferences[numeroUsuario] = theme;
    localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(preferences));
  }

  private readPreferences(): ThemePreferences {
    const raw = localStorage.getItem(this.USER_STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) as ThemePreferences;
    } catch {
      return {};
    }
  }

  private isThemeId(value: string | null): value is ThemeId {
    return value === 'blue' || value === 'orange' || value === 'red';
  }
}
