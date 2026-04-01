import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  login(username: string, password: string): boolean {
    return username === 'admin' && password === 'Zorro2025';
  }

  logout() {
    // lógica para cerrar sesión (si fuera necesario)
  }

  isAuthenticated(): boolean {
    return true; // puedes cambiarlo si implementas control de sesión real
  }
}
