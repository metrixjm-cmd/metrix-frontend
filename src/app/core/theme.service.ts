import { Injectable, signal } from '@angular/core';

export type ThemeId = 'blue' | 'orange' | 'red';

export interface Theme {
  id: ThemeId;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'metrix-theme';

  readonly themes: Theme[] = [
    { id: 'blue', color: '#000000' },
    { id: 'orange', color: '#df570c' },
    { id: 'red', color: '#280d69' },
  ];

  readonly current = signal<ThemeId>(
    (localStorage.getItem(this.STORAGE_KEY) as ThemeId) ?? 'blue'
  );

  constructor() {
    this.apply(this.current());
  }

  set(id: ThemeId): void {
    this.current.set(id);
    localStorage.setItem(this.STORAGE_KEY, id);
    this.apply(id);
  }

  private apply(id: ThemeId): void {
    document.documentElement.setAttribute('data-theme', id);
  }
}
