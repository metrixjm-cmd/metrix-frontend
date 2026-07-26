/**
 * Modelos de los reportes de ranking — Sprint 18.
 *
 * Ambos reportes se apoyan en los leaderboards de gamificación, que se calculan
 * sobre una ventana móvil desde hoy. Por eso llevan `period` y la ventana
 * explícita en lugar de una fecha suelta.
 */

import { LeaderboardEntry } from '../gamification/gamification.models';

export type ReportPeriod = 'weekly' | 'monthly';

/** Tipo de reporte activo en la pantalla. */
export type ReportType = 'daily' | 'managers' | 'employees';

export interface ManagersReportResponse {
  period:        ReportPeriod;
  periodStart:   string;
  periodEnd:     string;
  managers:      LeaderboardEntry[];
  totalManagers: number;
  generatedAt:   string;
}

export interface EmployeesReportResponse {
  storeId:        string;
  storeName:      string;
  period:         ReportPeriod;
  periodStart:    string;
  periodEnd:      string;
  employees:      LeaderboardEntry[];
  totalEmployees: number;
  generatedAt:    string;
}
