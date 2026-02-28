import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de METRIX.
 * Actúa como shell puro: solo renderiza el router-outlet.
 * Cada feature carga su propio layout (auth layout / app layout).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [],
})
export class App {}
