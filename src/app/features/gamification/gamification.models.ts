/**
 * Modelos del módulo de Gamificación — Sprint 12.
 */

export interface Badge {
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nombre: string;
  puesto: string;
  turno: string;
  igeo: number;
  igeoChange: number;
  totalTasks: number;
  completedTasks: number;
  onTimeRate: number;
  badges: Badge[];
}

export interface GamificationSummary {
  userId: string;
  nombre: string;
  rank: number;
  totalInStore: number;
  igeo: number;
  badges: Badge[];
  earnedBadgesCount: number;
  availableBadgesCount: number;
}

/** Catálogo de insignias disponibles para mostrar estado earned/locked en la UI. */
export const ALL_BADGES: Omit<Badge, 'earnedAt'>[] = [
  {
    type: 'PUNTUAL_ELITE',
    title: 'Puntual Elite',
    description: '95% o más de tareas completadas a tiempo',
    icon: '⏱️',
  },
  {
    type: 'CERO_RETRABAJOS',
    title: 'Cero Retrabajos',
    description: 'Sin tareas devueltas por mala ejecución',
    icon: '✅',
  },
  {
    type: 'VELOCIDAD_RAYO',
    title: 'Velocidad Rayo',
    description: 'Tiempo de ejecución 50% menor al promedio de la sucursal',
    icon: '⚡',
  },
  {
    type: 'COLABORADOR_MES',
    title: 'Colaborador del Mes',
    description: 'Top Over-all de la sucursal este mes',
    icon: '🥇',
  },
  {
    type: 'RACHA_7',
    title: 'Racha de 7',
    description: '7 o más tareas completadas en los últimos 7 días',
    icon: '🔥',
  },
];
