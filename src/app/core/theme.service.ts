import { Injectable, signal } from '@angular/core';

export type ThemeId = 'blue' | 'orange' | 'red';

export interface Theme {
  id:      ThemeId;
  label:   string;
  color:   string;   // hex para el swatch
  tagline: string;   // descripción breve
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'metrix-theme';

  readonly themes: Theme[] = [
    { id: 'blue',   label: 'Corporativo', color: '#491AD5', tagline: 'Profesional' },
    { id: 'orange', label: 'Restaurante', color: '#ea580c', tagline: 'Cálido'      },
    { id: 'red',    label: 'Impacto',     color: '#e31717', tagline: 'Dinámico'    },
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
