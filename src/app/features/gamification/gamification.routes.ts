import { Routes } from '@angular/router';

export const GAMIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./leaderboard/leaderboard').then(m => m.Leaderboard),
  },
];
