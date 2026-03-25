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
  trainingCompletionRate: number;
}

export interface StoreRankingEntry {
  rank: number;
  storeId: string;
  storeName: string;
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

// ── Sprint 17 — Over-all Analítico (microservicio Python analytics-service) ──────

/** Scores de los 4 pilares que componen el Over-all. */
export interface IgeoPillarScores {
  cumplimiento: number;
  tiempo:       number;
  calidad:      number;
  consistencia: number;
}

/** Resultado global del Over-all analítico. */
export interface IgeoGlobalResult {
  total_tasks:   number;
  completed:     number;
  pillar_scores: IgeoPillarScores;
  igeo:          number;
}

/** Resultado por sucursal del Over-all analítico. */
export interface IgeoStoreResult extends IgeoGlobalResult {
  store_id: string;
}

/**
 * Respuesta completa del endpoint GET /api/v1/kpis/analytics/igeo.
 * Campos snake_case reflejan la serialización Jackson con @JsonProperty
 * del record Java que pasa-a-través del JSON del analytics-service Python.
 */
export interface IgeoAnalyticsResponse {
  status:      string;
  metric:      string;
  description: string;
  weights:     IgeoPillarScores;
  computed_at: string;
  data: {
    global:   IgeoGlobalResult;
    by_store: IgeoStoreResult[];
  };
}
