import { Routes } from '@angular/router';

export const GAMIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./leaderboard/leaderboard').then(m => m.Leaderboard),
  },
  {
    path: 'me',
    loadComponent: () =>
      import('./my-badges/my-badges').then(m => m.MyBadges),
  },
];
