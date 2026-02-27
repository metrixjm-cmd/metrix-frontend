export interface ShiftBreakdown {
  shift: string;
  onTimeRate: number;
  totalClosed: number;
  onTimeCount: number;
}

export interface KpiSummary {
  context: 'STORE' | 'USER';
  contextId: string;
  onTimeRate: number;
  delegacionEfectiva: number;
  reworkRate: number;
  avgExecutionMinutes: number;
  shiftBreakdown: ShiftBreakdown[];
  criticalPending: number;
  igeo: number;
  pipelinePending: number;
  pipelineInProgress: number;
  pipelineCompleted: number;
  pipelineFailed: number;
  sparklineOnTime: number[];
  sparklineIgeo: number[];
  avgQualityRating: number;
}

export interface StoreRankingEntry {
  rank: number;
  storeId: string;
  igeo: number;
  onTimeRate: number;
  reworkRate: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
}

/** KPI #7 — Responsabilidad Individual por colaborador */
export interface UserResponsibilityEntry {
  userId: string;
  nombre: string;
  position: string;
  turno: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  onTimeRate: number;
  reworkRate: number;
  avgExecMinutes: number;
  igeo: number;
  rank: number;
}

/** KPI #9 — Velocidad de Corrección */
export interface CorrectionSpeedData {
  storeId: string;
  reworkedTasks: number;
  avgCorrectionMinutes: number;
  minCorrectionMinutes: number;
  maxCorrectionMinutes: number;
}

/** Datos del reporte de cierre diario */
export interface DailyReportResponse {
  storeId: string;
  reportDate: string;
  kpiSummary: KpiSummary;
  tasks: any[];
  userRanking: UserResponsibilityEntry[];
  correctionSpeed: CorrectionSpeedData;
  totalAssigned: number;
  totalCompleted: number;
  totalFailed: number;
  totalPending: number;
}
